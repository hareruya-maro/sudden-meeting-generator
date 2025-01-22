import { WebClient } from "@slack/web-api";
import * as functions from "firebase-functions";
import { google as googleApis } from "googleapis";
import {
  CALENDAR_CLIENT_ID,
  CALENDAR_CLIENT_SECRET,
  CALENDAR_REDIRECT_URI,
  SLACK_BOT_TOKEN,
} from "../const";
import { storeOAuthInfo } from "./firestoreService";
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

export const getCalendarLinkUrl = async (
  teamId: string,
  channelId: string,
  threadTs: string
) => {
  // OAuth用に情報を保存する
  const state = await storeOAuthInfo(teamId, channelId, threadTs);

  const oauth2Client = new googleApis.auth.OAuth2(
    CALENDAR_CLIENT_ID,
    CALENDAR_CLIENT_SECRET,
    CALENDAR_REDIRECT_URI
  );

  // カレンダーの読み取りを許可する
  const scopes = ["https://www.googleapis.com/auth/calendar.readonly"];

  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    include_granted_scopes: true,
    prompt: "consent",
  });

  return `${authorizationUrl}&state=${state}`;
};

const linkToGoogle = async (
  teamId: string,
  channelId: string,
  threadTs: string
) => {
  const calendarLinkUrl = await getCalendarLinkUrl(teamId, channelId, threadTs);
  // OAuth用のURLを返す
  postMessage(
    `Google CalendarとSlackを連携します。\n<${calendarLinkUrl}|こちらのリンク（Google Calendar）>をクリックして連携用ページを開いてください。`,
    channelId,
    threadTs
  );
};

// メンションイベントの反応
export const appMention = async (event: {
  team: string;
  channel: string;
  ts: string;
  text: string;
}) => {
  functions.logger.info(event, { structuredData: true });

  const { team, channel, ts, text } = event;

  if (text.includes("create")) {
    // 会議を作成する
    await createSuddenMeeting(channel);
  } else {
    // Google CalendarとのOAuth連携用URLを返す
    await linkToGoogle(team, channel, ts);
  }
};
