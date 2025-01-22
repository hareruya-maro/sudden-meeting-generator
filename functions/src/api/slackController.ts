/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable camelcase */
import axios from "axios";
import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { REGION, SLACK_API, SLACK_REDIRECT_URI } from "../const";
import { checkEvent, setTeamInfo } from "../service/firestoreService";
import { appMention } from "../service/slackService";

const CLIENT_ID = "functions.config().slack.client_id";
const CLIENT_SECRET = "functions.config().slack.client_secret";

if (
  !process.env.FUNCTION_NAME ||
  process.env.FUNCTION_NAME === "slack-callback"
) {
  exports.callback = onRequest(
    { region: REGION, timeoutSeconds: 60, memory: "256MiB" },
    async (request, response) => {
      const { code } = request.query;

      if (code) {
        const codeParams = new URLSearchParams();
        codeParams.append("grant_type", "authorization_code");
        codeParams.append("client_id", CLIENT_ID);
        codeParams.append("client_secret", CLIENT_SECRET);
        codeParams.append("code", code as string);
        codeParams.append("redirect_uri", SLACK_REDIRECT_URI);

        const headers = {
          "Content-Type": "application/x-www-form-urlencoded",
        };

        const codeResponse = await axios.post(
          SLACK_API.OAUTH_V2_ACCESS,
          codeParams,
          {
            headers,
          }
        );

        const { access_token, team } = codeResponse.data;

        setTeamInfo(team.id, { slackBotToken: access_token });
      }
      response.send("連携に成功しました。画面を閉じてSlackを開いてください。");
    }
  );
}

if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === "slack-event") {
  // Event Subscriptionsの受信
  exports.event = onRequest(
    { memory: "1GiB", timeoutSeconds: 300, region: REGION },
    async (request, response) => {
      try {
        logger.info(request.body, { structuredData: true });
        const { challenge, type, team_id, event_id, event } = request.body;

        if (type === "url_verification") {
          // SlackのイベントURL検証用
          response.send({ challenge });
          return;
        } else if (type === "event_callback") {
          if (await checkEvent(team_id, event_id, event)) {
            await appMention(event);
          }
        }
        response.send("ok");
        return;
      } catch (e) {
        logger.error(e, { structuredData: true });
      }
      response.send("ok");
      return;
    }
  );
}
