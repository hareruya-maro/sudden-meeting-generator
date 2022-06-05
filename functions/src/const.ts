import * as functions from "firebase-functions";

export const SLACK_API = {
  OAUTH_V2_ACCESS: "https://slack.com/api/oauth.v2.access",
  CHAT_POST_MESSAGE: "https://slack.com/api/chat.postMessage",
};

export const GOOGLE_CALENDAR_API = {
  TOKEN: "https://oauth2.googleapis.com/token",
};

export const ZOOM_API = {
  TOKEN: "https://zoom.us/oauth/token",
  USERS_ME_MEETINGS: "https://api.zoom.us/v2/users/me/meetings",
};

export const REGION = "asia-northeast1";
export const SLACK_REDIRECT_URI = `https://${REGION}-sudden-meeting-generator.cloudfunctions.net/slack-callback`;
export const SLACK_BOT_TOKEN = functions.config().slack.bot_token;
export const SLACK_TARGET_CHANNEL = functions.config().slack.target_channel;
export const CALENDAR_CLIENT_ID = functions.config().calendar.client_id;
export const CALENDAR_CLIENT_SECRET = functions.config().calendar.client_secret;
export const CALENDAR_REDIRECT_URI = `https://${REGION}-sudden-meeting-generator.cloudfunctions.net/calendar-callback`;
// export const CALENDAR_REDIRECT_URI = `http://localhost:5001/sudden-meeting-generator/asia-northeast1/calendar-callback`;

export const ZOOM_CLIENT_ID = functions.config().zoom.client_id;
export const ZOOM_CLIENT_SECRET = functions.config().zoom.client_secret;
export const ZOOM_REDIRECT_URI = `https://${REGION}-sudden-meeting-generator.cloudfunctions.net/zoom-callback`;
// export const ZOOM_REDIRECT_URI = `https://be60-34-146-171-49.jp.ngrok.io/sudden-meeting-generator/asia-northeast1/zoom-callback`;
