import * as functions from "firebase-functions";

import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";
import {firestore} from "firebase-admin";
import {parseExpression} from "cron-parser-all";

initializeApp();


interface AccountDevice {
  name: string;
  token: string;
}

interface AccountDocument {
  devices: { [key: string]: AccountDevice };
}

export interface AccountScheduledNotificationDocument {
  title: string;
  body: string;
  nextSend: any;
  lastSent: any;
  type: string;
  cronExpression?: string;

  [x: string]: any
}

const NOTIFICATION_TYPES: { [key: string]: { calculateNextSend: (cronExpression?: string) => Date } } = {
  // TODO write these
  // "hourly": {
  //   calculateNextSend() {
  //     let date = new Date();
  //     date.setHours(date.getHours() + 1);
  //     date.setMinutes(0);
  //     date.setSeconds(0);
  //     date.setMilliseconds(0);
  //
  //     return date;
  //   },
  // },
  // "daily": {
  //   calculateNextSend() {
  //     let date = new Date();
  //     date.setHours(date.getHours() + 24);
  //     date.setMinutes(0);
  //     date.setSeconds(0);
  //     date.setMilliseconds(0);
  //
  //     return date;
  //   },
  // },
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

const db = getFirestore();

export const doSendNotifications = functions.region("europe-west1").https.onCall(
  async (data, context) => {
    let accounts = await db.collection("accounts").get();
    for (let account of accounts.docs) {
      await account.ref.collection("notifications").add(data);
    }
  },
);

let getPushTokens = (account: AccountDocument) => {
  return Object.entries(account.devices).map(_ => _[1].token);
};

export const updateNextSend = functions.region("europe-west1")
  .firestore.document("/accounts/{accountId}/scheduledNotifications/{notificationId}")
  .onWrite(async (change, context) => {
    let oldNotification = change.before;
    let oldNotificationData = oldNotification.data() as AccountScheduledNotificationDocument;

    let notification = change.after;
    let notificationData = notification.data() as AccountScheduledNotificationDocument;

    try {
      switch (notificationData.type) {
        case "cron":
          if (notification.get("nextSend") === undefined || oldNotificationData.cronExpression != notificationData.cronExpression) {
            let nextSend = NOTIFICATION_TYPES[notificationData.type].calculateNextSend(notificationData.cronExpression);
            functions.logger.debug(`Updating timestamps on notification ${notification.ref.id}:`, {nextSend: nextSend});
            await notification.ref.update({nextSend: nextSend});
          }
          break;
        default:
          functions.logger.error(`Unknown notification type ${notificationData.type} on document ${notification.ref}`);
          break;
      }
    } catch (e) {
      functions.logger.error(`Failed to update nextSend on document ${notification.ref}`);
      functions.logger.error((e as Error).message);
    }
  });

export const sendNotifications = functions.region("europe-west1")
  .firestore.document("/accounts/{accountId}/notifications/{notificationId}")
  .onCreate(async (snapshot, context) => {
    let notificationData = snapshot.data();
    let accounts = await db.collection("accounts").get();
    for (let account of accounts.docs) {
      let accountData = account.data() as AccountDocument;
      let _notification = {
        title: notificationData.title,
        body: notificationData.body,
      };
      let batchResponse = await getMessaging().sendMulticast({
        "notification": _notification,
        "webpush": {
          "notification": {
            ..._notification,
            // "actions": [
            //   {
            //     "title": "OK",
            //     "action": "void()",
            //   },
            //   {
            //     "title": "Dismiss",
            //     "action": "void()",
            //   },
            // ],
            "renotify": true,
            "requireInteraction": true,
            "tag": snapshot.id,
            "timestamp": (notificationData.sent as firestore.Timestamp).toMillis(),
          },
          // "fcmOptions": notificationData.link ? {
          //   "link": notificationData.link,
          // } : {},
        },
        "tokens": getPushTokens(accountData),
      });
      functions.logger.info(batchResponse.successCount + " messages were sent successfully");
      if (batchResponse.failureCount > 0) {
        functions.logger.error(batchResponse.failureCount + " messages failed to send");
        batchResponse.responses.filter(response => !response.success).forEach(response => {
          functions.logger.debug(response.messageId, response.error);
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

    for (let scheduledNotification of scheduledNotifications.docs) {
      let scheduledNotificationData = scheduledNotification.data() as AccountScheduledNotificationDocument;
      functions.logger.info("creating", scheduledNotificationData);
      let accountRef = scheduledNotification.ref.parent.parent as firestore.DocumentReference;
      await accountRef.collection("notifications").add({
        notification: scheduledNotification.ref,
        title: scheduledNotificationData.title,
        body: scheduledNotificationData.body,
        link: scheduledNotificationData.link || "",
        sent: FieldValue.serverTimestamp(),
      });

      let nextSend = NOTIFICATION_TYPES[scheduledNotificationData.type].calculateNextSend(scheduledNotificationData.cronExpression);
      functions.logger.debug(`Updating timestamps on notification ${scheduledNotification.ref.id}:`, {nextSend: nextSend});
      await scheduledNotification.ref.update({lastSent: FieldValue.serverTimestamp(), nextSend: nextSend});
    }
  });
