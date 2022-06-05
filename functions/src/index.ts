import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { REGION } from "./const";
import { createSuddenMeeting } from "./service/zoomService";
import dayjs = require("dayjs");
import timezone = require("dayjs/plugin/timezone");
import utc = require("dayjs/plugin/utc");
dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.tz.setDefault("Asia/Tokyo");

if (admin.apps.length === 0) {
  admin.initializeApp(functions.config().firebase);
}

// 毎日
exports.scheduledFunctionCrontab = functions.pubsub
  .schedule("0 7 * * 1-5")
  .timeZone("Asia/Tokyo")
  .onRun(async () => {
    await createSuddenMeeting();
    return null;
  });

exports.suddenMeeting = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    await createSuddenMeeting();

    res.send("create meeting");
  });

if (
  !process.env.FUNCTION_NAME ||
  process.env.FUNCTION_NAME.startsWith("slack")
) {
  exports.slack = require("./api/slackController");
}
if (
  !process.env.FUNCTION_NAME ||
  process.env.FUNCTION_NAME.startsWith("calendar")
) {
  exports.calendar = require("./api/calendarController");
}
if (
  !process.env.FUNCTION_NAME ||
  process.env.FUNCTION_NAME.startsWith("zoom")
) {
  exports.zoom = require("./api/zoomController");
}
