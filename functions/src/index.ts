import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { REGION } from "./const";
import { createSuddenMeeting } from "./service/meetingService";
import dayjs = require("dayjs");
import timezone = require("dayjs/plugin/timezone");
import utc = require("dayjs/plugin/utc");
dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.tz.setDefault("Asia/Tokyo");

if (admin.apps.length === 0) {
  admin.initializeApp(functions.config().firebase);
}

// 火曜日9時に実行
exports.scheduledFunctionCrontab = functions.pubsub
  .schedule("0 9 * * 2")
  .timeZone("Asia/Tokyo")
  .onRun(async () => {
    await createSuddenMeeting();
    return null;
  });

// テスト用にHTTPリクエストでも実行可能にする
exports.suddenMeeting = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    await createSuddenMeeting();

    res.send("create meeting");
  });

exports.slack = require("./api/slackController");
exports.calendar = require("./api/calendarController");
