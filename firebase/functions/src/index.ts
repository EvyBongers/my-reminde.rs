import * as functions from "firebase-functions";

import {initializeApp} from "firebase-admin/app";
import {DocumentReference, FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";
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

export interface ReminderDocument {
  title: string;
  body: string;
  nextSend?: any;
  lastSent?: any;
  type: string;
  enabled?: boolean;
  cronExpression?: string;

  [x: string]: any
}

const calculateNextSend = (notification: ReminderDocument) => {
  switch (notification.type) {
    case "cron": {
      // TODO(ebongers): use preference in user profile
      let options = {tz: "Europe/Amsterdam"};
      let cron = parseExpression(notification.cronExpression as string, options);
      return cron.next().toDate();
    }
    default: {
      functions.logger.error(`Unknown notification type ${notification.type} on document ${notification.ref}`);
      return null;
    }
  }
};

const db = getFirestore();

export const doSendNotifications = functions.region("europe-west1").https.onCall(
  async (path: string, context) => {
    let notificationDocumentRef = await db.doc(path);
    let notificationDocumentData = (await notificationDocumentRef.get()).data() as ReminderDocument;
    notificationDocumentData.title = `[forced] ${notificationDocumentData.title}`;
    await triggerNotification(notificationDocumentRef, notificationDocumentData);
  },
);

const triggerNotification = async (ref: DocumentReference, data: ReminderDocument) => {
  let accountRef = ref.parent.parent as DocumentReference;
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
  let oldNotificationData = oldNotification.data() as ReminderDocument;

  let notification = change.after;
  let notificationData = notification.data() as ReminderDocument;

  if (notificationData.enabled === false) return;

  try {
    let nextSend = calculateNextSend(notificationData);
    if (nextSend != oldNotificationData.nextSend) {
      functions.logger.debug(`Updating timestamps on notification ${notification.ref.id}:`, {nextSend: nextSend});
      await notification.ref.update({nextSend: nextSend});
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
    let batchResponse = await messaging.sendMulticast({
      webpush: {
        headers: {
          Prefer: "respond-async",
          TTL: "-1",
          Urgency: "high",
          Topic: notificationData.notificationId,
        },
        notification: {
          // actions: [
          //   {
          //     title: "OK",
          //     action: "void()",
          //   },
          //   {
          //     title: "Dismiss",
          //     action: "void()",
          //   },
          // ],
          body: notificationData.body,
          renotify: true,
          requireInteraction: true,
          tag: snapshot.id,
          timestamp: (notificationData.sent as Timestamp).toMillis(),
          title: notificationData.title,
        },
        // fcmOptions: notificationData.link ? {
        //   link: notificationData.link,
        // } : undefined,
      },
      tokens: getPushTokens(accountData),
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
  .where("enabled", "==", true)
  .get();

  for (let scheduledNotification of scheduledNotifications.docs) {
    let scheduledNotificationData = scheduledNotification.data() as ReminderDocument;
    let nextSend = calculateNextSend(scheduledNotificationData);

    functions.logger.info("creating", scheduledNotificationData);
    await triggerNotification(scheduledNotification.ref, scheduledNotificationData);

    functions.logger.debug(`Updating timestamps on notification ${scheduledNotification.ref.id}:`, {nextSend: nextSend});
    await scheduledNotification.ref.update({lastSent: FieldValue.serverTimestamp(), nextSend: nextSend});
  }
});
