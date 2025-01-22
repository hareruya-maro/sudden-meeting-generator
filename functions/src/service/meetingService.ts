/* eslint-disable camelcase */
import { CloudTasksClient, protos } from "@google-cloud/tasks";
import { WebClient } from "@slack/web-api";
import { SLACK_BOT_TOKEN, SLACK_TARGET_CHANNEL } from "../const";
import { postMessage } from "./slackService";
import dayjs = require("dayjs");

import { getFirestore } from "firebase-admin/firestore";

const firestore = getFirestore();

export const getExpireAt = (expiresIn: number): Date => {
  const expireAt = new Date();
  expireAt.setSeconds(expireAt.getSeconds() + expiresIn);
  return expireAt;
};

export const createSuddenMeeting = async (channel?: string) => {
  const teamList = await firestore.collection("teams").get();
  await Promise.all(
    teamList.docs.map(async (team) => {
      if (!!channel && team.id !== channel) {
        return;
      }
      const web = new WebClient(SLACK_BOT_TOKEN);

      const membersResponse = await web.conversations.members({
        channel: channel ?? SLACK_TARGET_CHANNEL,
      });

      if (!membersResponse.members) {
        return;
      }

      const users = await web.users.list({});

      const members = membersResponse.members.filter(
        (member) => !users.members?.find((user) => user.id === member)?.is_bot
      );

      const shuffle = (array: string[]) => {
        const newArray = array.slice();
        for (let i = newArray.length - 1; i >= 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
      };

      // メンバーの選択回数を取得する関数
      const getMemberSelectionCounts = async (
        members: string[]
      ): Promise<{ [memberId: string]: number }> => {
        const selectionCounts = team.data()?.selectionCounts || {};

        // メンバーの数が増えた場合の処理
        const existingMembers = Object.keys(selectionCounts);
        const newMembers = members.filter(
          (member) => !existingMembers.includes(member)
        );
        if (newMembers.length > 0) {
          const minNonZeroCount =
            existingMembers.length > 0
              ? Math.min(
                  ...existingMembers.map((member) => selectionCounts[member])
                )
              : 0;
          newMembers.forEach((member) => {
            selectionCounts[member] = minNonZeroCount;
          });
        }

        // メンバーの数が減った場合の処理
        const removedMembers = existingMembers.filter(
          (member) => !members.includes(member)
        );
        removedMembers.forEach((member) => {
          delete selectionCounts[member];
        });

        // 初回の場合、members.membersのリストから回数を0に設定して初期値を作成
        if (Object.keys(selectionCounts).length === 0) {
          members.forEach((member) => {
            selectionCounts[member] = 0;
          });
        }

        return selectionCounts;
      };

      // メンバーを選択する関数
      const selectMembers = async (members: string[]): Promise<string[]> => {
        const selectionCounts = await getMemberSelectionCounts(members);
        console.log(selectionCounts);
        const sortedMembers = members.sort((a, b) => {
          return (selectionCounts[a] || 0) - (selectionCounts[b] || 0);
        });

        const selectedMembers: string[] = [];
        let i = 0;
        while (selectedMembers.length < 5 && i < sortedMembers.length) {
          const currentCount = selectionCounts[sortedMembers[i]] || 0;
          const sameCountMembers = sortedMembers.filter(
            (member) => (selectionCounts[member] || 0) === currentCount
          );
          if (sameCountMembers.length + selectedMembers.length <= 5) {
            selectedMembers.push(...sameCountMembers);
            i += sameCountMembers.length;
          } else {
            const remainingSlots = 5 - selectedMembers.length;
            selectedMembers.push(
              ...shuffle(sameCountMembers).slice(0, remainingSlots)
            );
            break;
          }
        }

        // 選択されたメンバーの回数をインクリメント
        selectedMembers.forEach((member) => {
          selectionCounts[member] = (selectionCounts[member] || 0) + 1;
        });

        // Firestoreに保存
        await team.ref.update({ selectionCounts });

        return selectedMembers;
      };

      // メンバーを選択する処理を追加
      const targetUser = await selectMembers(members);
      console.log("Selected Members:", targetUser);

      team.data().members = team.data().members || { members: [] };
      members.sort(() => Math.random() - 0.5);

      // 15時固定
      const targetDate = dayjs().hour(15).minute(0).second(0).millisecond(0);

      postMessage(
        "```\n＿人人人人人人人＿\n＞　突然の会議　＜\n￣Y^Y^Y^Y^Y^Y￣\n```\n" +
          `${targetUser
            .map((user) => `<@${user}> さん`)
            .join("、")}\n\n突然ですが本日15時から雑談しませんか！？\n\n` +
          "時間になったらこのチャンネルのハドルに参加してください！！\n",
        channel ?? SLACK_TARGET_CHANNEL
      );

      // Instantiates a client.
      const client = new CloudTasksClient();

      const project = "sudden-meeting-generator";
      const queue = "sudden-meeting-reminder";
      const location = "us-central1";
      const url = "https://slack.com/api/chat.postMessage";
      const payload = {
        channel: channel ?? SLACK_TARGET_CHANNEL,
        text:
          `${targetUser
            .map((user) => `<@${user}> さん`)
            .join("、")}\n\nもうすぐ雑談の時間になります！\n\n` +
          "時間になったらこのチャンネルのハドルに参加してください！！\n",
      };

      const parent = client.queuePath(project, location, queue);

      const task: protos.google.cloud.tasks.v2.ITask = {
        httpRequest: {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + SLACK_BOT_TOKEN,
          },
          httpMethod: "POST",
          url,
        },
      };

      if (payload && task.httpRequest) {
        task.httpRequest.body = Buffer.from(JSON.stringify(payload)).toString(
          "base64"
        );
      }

      // ５分前に通知＆GMTからJSTに補正
      const diffSeconds =
        targetDate.diff(dayjs(), "seconds") - 60 * 5 - 60 * 60 * 9;

      task.scheduleTime = {
        seconds: diffSeconds + Date.now() / 1000,
      };

      const request: protos.google.cloud.tasks.v2.ICreateTaskRequest = {
        parent: parent,
        task: task,
      };

      console.log("Sending task:");
      console.log(task);
      // Send create task request.
      const [response] = await client.createTask(request);
      const name = response.name;
      console.log(`Created task ${name}`);
    })
  );
};
