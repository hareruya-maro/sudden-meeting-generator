/* eslint-disable camelcase */
import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { REGION } from "../const";
import { getGoogleAccessTokenByCode } from "../service/calendarService";
import { clearOAuthInfo, getOAuthInfo } from "../service/firestoreService";
import { postMessage } from "../service/slackService";

exports.callback = onRequest(
  { region: REGION, timeoutSeconds: 60, memory: "256MiB" },
  async (request, response) => {
    const { code, state } = request.query;
    logger.info(request.query, { structuredData: true });

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
    logger.info(oauthInfo, { structuredData: true });

    const { teamId, channelId, threadTs } = oauthInfo;

    // codeからAccessTokenを取得しfirestoreに保存
    try {
      await getGoogleAccessTokenByCode(code as string, teamId);
      await clearOAuthInfo(state as string);
    } catch (e) {
      logger.error(e, { structuredData: true });
      throw e;
    }

    await postMessage("連携に成功しました!!", channelId, threadTs);

    response.send(
      "Googleとの連携に成功しました。この画面を閉じ、Slackを開いてください。"
    );
  }
);
