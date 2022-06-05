import * as functions from "firebase-functions";
import { google } from "googleapis";
import {
  CALENDAR_CLIENT_ID,
  CALENDAR_CLIENT_SECRET,
  CALENDAR_REDIRECT_URI,
} from "../const";
import { setTeamInfo } from "./firestoreService";

/**
 * 認可コードを用いてアクセストークンを取得する
 * @param {string} code string 認可コード
 * @param {string} teamId チームID
 * @param {string} userId ユーザーID
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
