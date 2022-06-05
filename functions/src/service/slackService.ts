import { WebClient } from "@slack/web-api";
import * as functions from "firebase-functions";
import { google as googleApis } from "googleapis";
import {
  CALENDAR_CLIENT_ID,
  CALENDAR_CLIENT_SECRET,
  CALENDAR_REDIRECT_URI,
  SLACK_BOT_TOKEN,
  ZOOM_CLIENT_ID,
  ZOOM_REDIRECT_URI,
} from "../const";
import { storeOAuthInfo } from "./firestoreService";

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

  // カレンダーの読み取りとイベントの書き込みを許可する
  const scopes = ["https://www.googleapis.com/auth/calendar.readonly"];

  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    include_granted_scopes: true,
    prompt: "consent",
  });

  return `${authorizationUrl}&state=${state}`;
};

export const getZoomLinkUrl = async (
  teamId: string,
  channelId: string,
  threadTs: string
) => {
  // OAuth用に情報を保存する
  const state = await storeOAuthInfo(teamId, channelId, threadTs);

  return `https://zoom.us/oauth/authorize?response_type=code&client_id=${ZOOM_CLIENT_ID}&redirect_uri=${ZOOM_REDIRECT_URI}&state=${state}`;
};

const linkToGoogle = async (
  teamId: string,
  channelId: string,
  threadTs: string
) => {
  const calendarLinkUrl = await getCalendarLinkUrl(teamId, channelId, threadTs);
  const zoomLinkUrl = await getZoomLinkUrl(teamId, channelId, threadTs);
  // OAuth用のURLを返す
  postMessage(
    `Google Calendar / ZoomとSlackを連携します。\n<${calendarLinkUrl}|こちらのリンク（Google Calendar）>と<${zoomLinkUrl}|こちらのリンク（Zoom）>をクリックして連携用ページを開いてください。`,
    channelId,
    threadTs
  );
};

export const appMention = async (event: {
  team: string;
  channel: string;
  ts: string;
}) => {
  functions.logger.info(event, { structuredData: true });

  const { team, channel, ts } = event;

  functions.logger.info(team, channel, ts);

  // Google Calendarとの連携用URLを返す
  await linkToGoogle(team, channel, ts);
};
