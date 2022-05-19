import * as functions from "firebase-functions";

import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";
import {firestore} from "firebase-admin";
import {parseCronExpression} from "cron-schedule";
import DocumentReference = firestore.DocumentReference;

initializeApp();


const NOTIFICATION_TYPES: { [key: string]: { calculateNextSend: (cronExpression?: string) => Date } } = {
  // TODO write these
  "hourly": {
    calculateNextSend() {
      let date = new Date();
      date.setHours(date.getHours() + 1);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);

      return date;
    },
  },
  "daily": {
    calculateNextSend() {
      let date = new Date();
      date.setHours(date.getHours() + 24);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);

      return date;
    },
  },
  "cron": {
    calculateNextSend(cronExpression?: string) {
      let cron = parseCronExpression(cronExpression as string);
      return cron.getNextDate(new Date());
    },
  },
};

interface AccountDevice {
  name: string;
  token: string;
}

interface AccountDocument {
  devices: { [key: string]: AccountDevice };
}

interface AccountScheduledNotificationDocument {
  title: string;
  body: string;
  nextSend: any;
  lastSend: any;
  type: string;
  cronExpression?: string;
}

export const doSendNotifications = functions.region("europe-west1").https.onCall(
  async (data, context) => {
    let accounts = await db.collection("accounts").get();
    for (let account of accounts.docs) {
      await account.ref.collection("notifications").add(data);
    }
  },
);

const db = getFirestore();


let getPushTokens = (account: AccountDocument) => {
  return Object.entries(account.devices).map(_ => _[1].token);
};

export const sendNotifications = functions.region("europe-west1")
  .firestore.document("/accounts/{accountId}/notifications/{notificationId}")
  .onCreate(async (snapshot, context) => {
    let notificationData = snapshot.data();
    let accounts = await db.collection("accounts").get();
    for (let account of accounts.docs) {
      let accountData = account.data() as AccountDocument;
      let message = {
        data: {
          title: notificationData.title,
          body: notificationData.body,
        },
        tokens: getPushTokens(accountData),
      };
      let response = await getMessaging().sendMulticast(message);
      functions.logger.info(response.successCount + " messages were sent successfully");
    }
  });


export const runNotify = functions.region("europe-west1")
  .pubsub
  .schedule("* * * * *")
  .timeZone("Europe/Amsterdam")
  .onRun(async _context => {
    let scheduledNotifications = await db.collectionGroup("scheduledNotifications")
      .where("nextSend", "<=", new Date())
      .get();

    functions.logger.info("scheduledNotifications", scheduledNotifications);

    for (let scheduledNotification of scheduledNotifications.docs) {
      let scheduledNotificationData = scheduledNotification.data() as AccountScheduledNotificationDocument;
      functions.logger.info("creating", scheduledNotificationData);
      let accountRef = scheduledNotification.ref.parent.parent as DocumentReference;
      await accountRef.collection("notifications").add({
        notification: scheduledNotification.ref,
        title: scheduledNotificationData.title,
        body: scheduledNotificationData.body,
        sent: FieldValue.serverTimestamp(),
      });

      let data = {
        lastSend: FieldValue.serverTimestamp(),
        nextSend: NOTIFICATION_TYPES[scheduledNotificationData.type]
          .calculateNextSend(scheduledNotificationData.cronExpression),
      };
      functions.logger.debug(`Updating timestamps on notification ${scheduledNotification.ref.id}:`, data);
      await scheduledNotification.ref.update(data);
    }
  });
