import * as functions from "firebase-functions";

import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";
import {firestore} from "firebase-admin";
import {parseExpression} from "cron-parser-all";

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
      let options = {
        tz: "Europe/Amsterdam", // TODO(ebongers): use preference in user profile
      };
      let cron = parseExpression(cronExpression as string, options);
      return cron.next().toDate();
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
  lastSent: any;
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
      let batchResponse = await getMessaging().sendMulticast({
        webpush: {
          notification: {
            title: notificationData.title,
            actions: [
              {
                title: "aaaa",
                action: "aaaify",
              },
            ],
            body: notificationData.body,
          },
        },
        tokens: getPushTokens(accountData),
      });
      functions.logger.info(batchResponse.successCount + " messages were sent successfully");
      if (batchResponse.failureCount > 0) {
        functions.logger.error(batchResponse.failureCount + " messages failed to send");
        batchResponse.responses.filter(response => !response.success).forEach(response => {
          functions.logger.debug(response.messageId, response.error?.toJSON());
        });
      }
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
      let accountRef = scheduledNotification.ref.parent.parent as firestore.DocumentReference;
      await accountRef.collection("notifications").add({
        notification: scheduledNotification.ref,
        title: scheduledNotificationData.title,
        body: scheduledNotificationData.body,
        sent: FieldValue.serverTimestamp(),
      });

      let nextSend = NOTIFICATION_TYPES[scheduledNotificationData.type].calculateNextSend(scheduledNotificationData.cronExpression);
      functions.logger.debug(`Updating timestamps on notification ${scheduledNotification.ref.id}:`, {nextSend: nextSend});
      await scheduledNotification.ref.update({lastSent: FieldValue.serverTimestamp(), nextSend: nextSend});
    }
  });
