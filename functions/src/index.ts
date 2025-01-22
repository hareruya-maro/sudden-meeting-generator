import { initializeApp } from "firebase-admin/app";
initializeApp();

import { onSchedule } from "firebase-functions/v2/scheduler";
import { createSuddenMeeting } from "./service/meetingService";
import dayjs = require("dayjs");
import timezone = require("dayjs/plugin/timezone");
import utc = require("dayjs/plugin/utc");
dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.tz.setDefault("Asia/Tokyo");

// 火曜日9時に実行
exports.scheduledFunctionCrontab = onSchedule(
  {
    schedule: "0 9 * * 2", // b. 構成値は関数の第一引数に
    timeZone: "Asia/Tokyo",
  },
  async () => {
    await createSuddenMeeting();
    return;
  }
);

exports.slack = require("./api/slackController");
exports.calendar = require("./api/calendarController");
