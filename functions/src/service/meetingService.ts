/* eslint-disable camelcase */
import { CloudTasksClient, protos } from "@google-cloud/tasks";
import { WebClient } from "@slack/web-api";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { calendar_v3 as calendarV3, google } from "googleapis";
import {
  CALENDAR_CLIENT_ID,
  CALENDAR_CLIENT_SECRET,
  CALENDAR_REDIRECT_URI,
  SLACK_BOT_TOKEN,
  SLACK_TARGET_CHANNEL,
} from "../const";
import { getCalendarCredentials, setTeamInfo } from "./firestoreService";
import { postMessage } from "./slackService";
import dayjs = require("dayjs");

if (admin.apps.length === 0) {
  admin.initializeApp(functions.config().firebase);
}

const firestore = admin.firestore();

/**
 * 認可コードを用いてアクセストークンを取得する
 * @param {string} code string 認可コード
 * @param {string} teamId チームID
 * @return {Promise<string>} アクセストークン
 */
export const getGoogleAccessTokenByCode = async (
  code: string,
  teamId: string
): Promise<string> => {
  // access_tokenの取得
  const oauth2Client = new google.auth.OAuth2(
    CALENDAR_CLIENT_ID,
    CALENDAR_CLIENT_SECRET,
    CALENDAR_REDIRECT_URI
  );
  const tokenResponse = await oauth2Client.getToken(code as string);
  oauth2Client.setCredentials(tokenResponse.tokens);
  functions.logger.info(tokenResponse.tokens, { structuredData: true });

  const calendarCredentials = tokenResponse.tokens;

  await setTeamInfo(teamId, {
    calendarCredentials: calendarCredentials || { access_token: "" },
  });

  return calendarCredentials as string;
};

export const getExpireAt = (expiresIn: number): Date => {
  const expireAt = new Date();
  expireAt.setSeconds(expireAt.getSeconds() + expiresIn);
  return expireAt;
};

export const createSuddenMeeting = async () => {
  const teamList = await firestore.collection("teams").get();
  await Promise.all(
    teamList.docs.map(async (team) => {
      const web = new WebClient(SLACK_BOT_TOKEN);

      const members = await web.conversations.members({
        channel: SLACK_TARGET_CHANNEL,
      });

      if (!members.members) {
        return;
      }
      const mailUserIdMap: { [key: string]: string } = {};
      const mailList = await Promise.all(
        members.members.map(async (member) => {
          const userInfo = await web.users.info({ user: member });
          if (userInfo?.user?.profile?.email) {
            mailUserIdMap[userInfo.user.profile.email] = member;
            return { id: userInfo?.user?.profile?.email };
          }
          return { id: "" };
        })
      );

      const credential = await getCalendarCredentials(team.id);

      const oauth2Client = new google.auth.OAuth2(
        CALENDAR_CLIENT_ID,
        CALENDAR_CLIENT_SECRET,
        CALENDAR_REDIRECT_URI
      );
      oauth2Client.setCredentials(credential);
      const items = mailList.filter((mail) => !!mail.id);

      const result = await google
        .calendar({ version: "v3", auth: oauth2Client })
        .freebusy.query({
          requestBody: {
            items,
            timeMax:
              dayjs()
                .hour(18)
                .minute(0)
                .second(0)
                .format("YYYY-MM-DDTHH:mm:ss") + "+09:00",
            timeMin:
              dayjs()
                .hour(15)
                .minute(0)
                .second(0)
                .format("YYYY-MM-DDTHH:mm:ss") + "+09:00",
            timeZone: "Asia/Tokyo",
          },
        });

      const changeBit = (dateItem: calendarV3.Schema$TimePeriod) => {
        // 予定がある時間帯
        const start = dayjs(dateItem.start);
        const end = dayjs(dateItem.end);

        // 空き時間を求めるために対象としたい時間帯(15時以降（UTC6時以降）)
        const clockInTime = start.clone().hour(6).minute(0);

        // ビット処理するために必要な時間帯
        const dateBit: boolean[] = [];

        let checkDuration = clockInTime;
        for (let i = 0; i < 6; i++) {
          // 予定がある稼働かを設定
          dateBit.push(
            (start.isBefore(checkDuration) || start.isSame(checkDuration)) &&
              end.isAfter(checkDuration)
          );
          // 次の時間帯へ
          checkDuration = checkDuration.add(30, "m");
        }
        const dateKey = start.toISOString();
        return { dateKey, dateBit };
      };

      let resultBit: { email: string; allBit: boolean[] }[] = [];
      if (result?.data?.calendars) {
        resultBit = Object.entries(result.data.calendars).map(
          ([email, events]) => {
            if (Array.isArray(events.busy)) {
              const bitArray = events.busy.map(changeBit);
              const allBit: boolean[] = [];
              bitArray.forEach((bitData) => {
                bitData.dateBit.forEach((bit, index) => {
                  if (index === 0) {
                    allBit.push(bit);
                  } else {
                    allBit[index] = allBit[index] || bit;
                  }
                });
              });
              return { email, allBit };
            }
            return { email, allBit: [] };
          }
        );
      }

      const targetTime = Math.floor(Math.random() * 6);

      const shuffle = ([...array]) => {
        for (let i = array.length - 1; i >= 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      };

      const resultShuffle = shuffle(resultBit);
      const targetUser: string[] = [];

      resultShuffle.forEach((user) => {
        if (targetUser.length < 4 && !user.allBit[targetTime]) {
          targetUser.push(user.email);
        }
      });

      const time = [
        { hour: 15, minute: 0 },
        { hour: 15, minute: 30 },
        { hour: 16, minute: 0 },
        { hour: 16, minute: 30 },
        { hour: 17, minute: 0 },
        { hour: 17, minute: 30 },
      ];

      const targetDate = dayjs()
        .hour(time[targetTime].hour)
        .minute(time[targetTime].minute);

      postMessage(
        "```\n＿人人人人人人人＿\n＞　突然の会議　＜\n￣Y^Y^Y^Y^Y^Y￣\n```\n" +
          `${targetUser
            .map((mail) => `<@${mailUserIdMap[mail]}> さん`)
            .join("、")}\n\n突然ですが本日${targetDate.format(
            "HH:mm"
          )}から雑談しませんか！？\n\n` +
          "時間になったらこのチャンネルのハドルに参加してください！！\n",
        SLACK_TARGET_CHANNEL
      );

      // Instantiates a client.
      const client = new CloudTasksClient();

      const project = "sudden-meeting-generator";
      const queue = "sudden-meeting-reminder";
      const location = "us-central1";
      const url = "https://slack.com/api/chat.postMessage";
      const payload = {
        channel: SLACK_TARGET_CHANNEL,
        text:
          `${targetUser
            .map((mail) => `<@${mailUserIdMap[mail]}> さん`)
            .join("、")}\n\nもうすぐ雑談の時間（${targetDate.format(
            "HH:mm"
          )}）になります！\n\n` +
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
