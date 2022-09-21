import * as functions from "firebase-functions";

import {initializeApp} from "firebase-admin/app";
import {DocumentData, DocumentReference, FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {getMessaging, MulticastMessage} from "firebase-admin/messaging";
import {parseExpression} from "cron-parser-all";

initializeApp();
const messaging = getMessaging();

interface AccountDevice {
  name: string;
  token: string;
}

interface AccountDocument extends DocumentData {
  devices: { [key: string]: AccountDevice };
}

export interface ReminderDocument extends DocumentData {
  title: string;
  body: string;
  link?: string;
  enabled?: boolean;

  type: string;
  cronExpression?: string;
  nextSend?: Timestamp;
  lastSent?: Timestamp;
}

interface NotificationDocument {
  scheduledNotificationRef: DocumentReference,
  title: string,
  body: string,
  link?: string,
  sent: Timestamp,
}

const calculateNextSend = (notification: ReminderDocument) : Timestamp | null => {
  switch (notification.type) {
    case "cron": {
      // TODO(ebongers): use preference in user profile
      let options = {tz: "Europe/Amsterdam"};
      let cron = parseExpression(notification.cronExpression as string, options);
      return Timestamp.fromDate(cron.next().toDate());
    }
    default: {
      functions.logger.error(`Unknown notification type ${notification.type} on document ${notification._ref}`);
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
    scheduledNotificationRef: ref,
    title: data.title,
    body: data.body,
    link: data.link || "",
    sent: FieldValue.serverTimestamp(),
  } as NotificationDocument);
};

let getPushTokens = (account: AccountDocument) => {
  return Object.entries(account.devices).map(_ => _[1].token);
};

export const updateNextSend = functions.region("europe-west1")
.firestore.document("/accounts/{accountId}/scheduledNotifications/{notificationId}")
.onWrite(async (change, context) => {
  if (context.eventType == "google.firestore.document.delete") return;

  let notification = change.after;
  let notificationData = notification.data() as ReminderDocument;
  if (notificationData.enabled === false) return;

  let oldNotification = change.before;
  let oldNotificationData = oldNotification.data() as ReminderDocument;

  try {
    let nextSend = calculateNextSend(notificationData);
    if (nextSend != oldNotificationData.nextSend) {
      functions.logger.debug(`Updating timestamps on notification ${notification.ref}:`, {nextSend: nextSend});
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
  let notificationData = snapshot.data() as NotificationDocument;
  let accounts = await db.collection("accounts").get();
  for (let account of accounts.docs) {
    let accountData = account.data() as AccountDocument;
    let tokens = getPushTokens(accountData);
    let batchResponse = await messaging.sendMulticast({
      webpush: {
        headers: {
          // Prefer: "respond-async",
          // TTL: "-1",
          Urgency: "high",
          Topic: notificationData.scheduledNotificationRef.id,
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
          timestamp: notificationData.sent.toMillis(),
          title: notificationData.title,
        },
        // fcmOptions: notificationData.link ? {
        //   link: notificationData.link,
        // } : undefined,
      },
      tokens: tokens,
    } as MulticastMessage);
    functions.logger.info(batchResponse.successCount + " messages were sent successfully");
    if (batchResponse.failureCount > 0) {
      functions.logger.error(batchResponse.failureCount + " messages failed to send");
      batchResponse.responses.forEach((response, index) => {
        let error = response.error;
        if (error !== undefined) {
          functions.logger.error("Failure sending notification to", tokens[index], error);
          if (error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered") {
            // TODO: delete/mark device token
          }
        }
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
