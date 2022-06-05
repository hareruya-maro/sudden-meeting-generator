/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable camelcase */
import axios from "axios";
import * as functions from "firebase-functions";
import {
  REGION,
  ZOOM_API,
  ZOOM_CLIENT_ID,
  ZOOM_CLIENT_SECRET,
  ZOOM_REDIRECT_URI,
} from "../const";
import {
  clearOAuthInfo,
  getOAuthInfo,
  setTeamInfo,
} from "../service/firestoreService";
import { getExpireAt } from "../service/zoomService";

if (
  !process.env.FUNCTION_NAME ||
  process.env.FUNCTION_NAME === "zoom-callback"
) {
  exports.callback = functions
    .runWith({
      timeoutSeconds: 60,
      memory: "256MB",
    })
    .region(REGION)
    .https.onRequest(async (request, response) => {
      const { code, state } = request.query;
      // stateが設定されていなければエラー
      if (!state) {
        response.status(400).send("state is not found");
        return;
      }

      if (!code) {
        response.status(400).send("code is not found");
        return;
      }

      const oauthInfo = await getOAuthInfo(state as string);

      // 取得できなければ正しいstateではない
      if (!oauthInfo) {
        response.status(400).send("invalid state");
        return;
      }
      functions.logger.info(oauthInfo, { structuredData: true });

      if (code) {
        const codeParams = new URLSearchParams();
        codeParams.append("grant_type", "authorization_code");
        codeParams.append("client_id", ZOOM_CLIENT_ID);
        codeParams.append("client_secret", ZOOM_CLIENT_SECRET);
        codeParams.append("code", code as string);
        codeParams.append("redirect_uri", ZOOM_REDIRECT_URI);

        const headers = {
          "Content-Type": "application/x-www-form-urlencoded",
        };

        const codeResponse = await axios.post(ZOOM_API.TOKEN, codeParams, {
          headers,
        });

        console.log(codeResponse.data);
        const { teamId } = oauthInfo;
        const { access_token, expires_in, refresh_token, scope, token_type } =
          codeResponse.data;
        const expiresAt = getExpireAt(expires_in);

        setTeamInfo(teamId, {
          zoomCredentials: {
            access_token,
            expires_at: expiresAt,
            refresh_token,
            scope,
            token_type,
          },
        });
        await clearOAuthInfo(state as string);
      }
      response.send(
        "Zoomとの連携に成功しました。画面を閉じてSlackを開いてください。"
      );
    });
}
