export const SLACK_API = {
  OAUTH_V2_ACCESS: "https://slack.com/api/oauth.v2.access",
  CHAT_POST_MESSAGE: "https://slack.com/api/chat.postMessage",
};

export const GOOGLE_CALENDAR_API = {
  TOKEN: "https://oauth2.googleapis.com/token",
};

export const REGION = "asia-northeast1";
export const SLACK_REDIRECT_URI = `https://${REGION}-sudden-meeting-generator.cloudfunctions.net/slack-callback`;
export const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";
export const SLACK_TARGET_CHANNEL = process.env.SLACK_TARGET_CHANNEL || "";
