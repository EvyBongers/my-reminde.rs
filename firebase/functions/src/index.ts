import * as functions from "firebase-functions";

import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";
import {firestore} from "firebase-admin";
import {parseExpression} from "cron-parser-all";

initializeApp();
const messaging = getMessaging();


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

const calculateNextSend = (notificationType: string, cronExpression?: string) => {
    switch (notificationType) {
        case "cron": {
            // TODO(ebongers): use preference in user profile
            let options = {tz: "Europe/Amsterdam"};
            let cron = parseExpression(cronExpression as string, options);
            return cron.next().toDate();
        }
        default: {
            return null;
        }
    }
};

const db = getFirestore();

export const doSendNotifications = functions.region("europe-west1").https.onCall(
  async (path: string, context) => {
    let notificationDocumentRef = await db.doc(path);
    let notificationDocument = await notificationDocumentRef.get();
    await triggerNotification(notificationDocumentRef, notificationDocument.data() as AccountScheduledNotificationDocument);
  },
);

const triggerNotification = async (ref: firestore.DocumentReference, data: AccountScheduledNotificationDocument) => {
  let accountRef = ref.parent.parent as firestore.DocumentReference;
  await accountRef.collection("notifications").add({
    notification: ref,
    title: data.title,
    body: data.body,
    link: data.link || "",
    sent: FieldValue.serverTimestamp(),
  });
};

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
            let nextSend = calculateNextSend(notificationData.type, notificationData.cronExpression);
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
      let batchResponse = await messaging.sendMulticast({
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
      let nextSend = calculateNextSend(scheduledNotificationData.type, scheduledNotificationData.cronExpression);

      functions.logger.info("creating", scheduledNotificationData);
      await triggerNotification(scheduledNotification.ref, scheduledNotificationData);

      functions.logger.debug(`Updating timestamps on notification ${scheduledNotification.ref.id}:`, {nextSend: nextSend});
      await scheduledNotification.ref.update({lastSent: FieldValue.serverTimestamp(), nextSend: nextSend});
    }
  });
