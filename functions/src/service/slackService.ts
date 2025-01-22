import { WebClient } from "@slack/web-api";
import * as functions from "firebase-functions";
import { SLACK_BOT_TOKEN } from "../const";
import { createSuddenMeeting } from "./meetingService";

// メッセージを送信する
export const postMessage = async (
  text: string,
  channel: string,
  threadTs?: string
) => {
  try {
    const web = new WebClient(SLACK_BOT_TOKEN);

    const res = await web.chat.postMessage({
      text,
      mrkdwn: true,
      channel,
      thread_ts: threadTs,
    });

    functions.logger.info(res, { structuredData: true });

    return res;
  } catch (e) {
    functions.logger.error(e, { structuredData: true });
  }
  return null;
};

// メンションイベントの反応
export const appMention = async (event: {
  team: string;
  channel: string;
  ts: string;
  text: string;
}) => {
  functions.logger.info(event, { structuredData: true });

  const { channel, text } = event;

  if (text.includes("create")) {
    // 会議を作成する
    await createSuddenMeeting(channel);
  }
};
