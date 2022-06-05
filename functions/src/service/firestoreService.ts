import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

if (admin.apps.length === 0) {
  admin.initializeApp(functions.config().firebase);
}

const firestore = admin.firestore();

export const setTeamInfo = async (teamId: string, info: any) => {
  const teamRef = firestore.collection("teams").doc(teamId);
  await teamRef.set(info, { merge: true });
};

export const getSlackToken = async (teamId: string, userId?: string) => {
  const teamRef = firestore.collection("teams").doc(teamId);

  if (userId) {
    const userDoc = await teamRef.collection("users").doc(userId).get();
    return userDoc.data()?.slackToken;
  } else {
    const teamDoc = await teamRef.get();
    return teamDoc.data()?.slackBotToken;
  }
};

export const getCalendarCredentials = async (teamId: string) => {
  const teamRef = firestore.collection("teams").doc(teamId);

  const teamDoc = await teamRef.get();

  const { calendarCredentials } = teamDoc.data() || {};

  return calendarCredentials;
};
export const getZoomCredentials = async (teamId: string) => {
  const teamRef = firestore.collection("teams").doc(teamId);

  const teamDoc = await teamRef.get();

  const { zoomCredentials } = teamDoc.data() || {};

  return zoomCredentials;
};

export const checkEvent = async (
  teamId: string,
  eventId: string,
  event: object
) => {
  const teamRef = firestore.collection("teams").doc(teamId);
  const eventRef = teamRef.collection("events").doc(eventId);
  const eventDoc = await eventRef.get();
  if (eventDoc.exists) {
    return false;
  } else {
    await eventRef.set({
      ...event,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  }
};

export const clearEvent = async (teamId: string, eventId: string) => {
  const teamRef = firestore.collection("teams").doc(teamId);
  const eventRef = teamRef.collection("events").doc(eventId);
  await eventRef.delete();
};

export const storeOAuthInfo = async (
  teamId: string,
  channelId: string,
  threadTs: string
) => {
  const eventRef = firestore.collection("oauth");
  const oauthDoc = await eventRef.add({
    teamId,
    channelId,
    threadTs,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return oauthDoc.id;
};

export const getOAuthInfo = async (state: string) => {
  const oauthDoc = await firestore.collection("oauth").doc(state).get();
  if (oauthDoc.exists) {
    return oauthDoc.data();
  } else {
    return null;
  }
};

export const clearOAuthInfo = async (state: string) => {
  await firestore.collection("oauth").doc(state).delete();
};
