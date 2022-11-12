import * as functions from "firebase-functions";

import {initializeApp} from "firebase-admin/app";
import {DocumentData, DocumentReference, FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {getMessaging, MulticastMessage} from "firebase-admin/messaging";
import {parseExpression} from "cron-parser-all";

initializeApp();
const db = getFirestore();
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

export interface NotificationDocument extends DocumentData {
  reminderRef: DocumentReference,
  title: string,
  body: string,
  link?: string,
  sent: Timestamp,
}

const calculateNextSend = (reminderDocumentData: ReminderDocument): Timestamp | null => {
  switch (reminderDocumentData.type) {
    case "cron": {
      // TODO(ebongers): use preference in user profile
      let options = {tz: "Europe/Amsterdam"};
      let cron = parseExpression(reminderDocumentData.cronExpression as string, options);
      return Timestamp.fromDate(cron.next().toDate());
    }
    default: {
      functions.logger.error(`Unknown reminder type ${reminderDocumentData.type} on document ${reminderDocumentData._ref}`);
      return null;
    }
  }
};

export const doSendNotifications = functions.region("europe-west1").https.onCall(
  async (path: string, context) => {
    let reminderDocumentRef = await db.doc(path);
    let reminderDocumentData = (await reminderDocumentRef.get()).data() as ReminderDocument;
    reminderDocumentData.title = `[forced] ${reminderDocumentData.title}`;
    await triggerNotification(reminderDocumentRef, reminderDocumentData);
  },
);

const triggerNotification = async (reminderDocumentRef: DocumentReference, reminderDocumentData: ReminderDocument) => {
  let accountRef = reminderDocumentRef.parent.parent as DocumentReference;
  await accountRef.collection("notifications").add({
    reminderRef: reminderDocumentRef,
    title: reminderDocumentData.title,
    body: reminderDocumentData.body,
    link: reminderDocumentData.link || "",
    sent: FieldValue.serverTimestamp(),
  } as NotificationDocument);
};

const getPushTokens = (account: AccountDocument) => {
  return Object.entries(account.devices).map(_ => _[1].token);
};

export const updateNextSend = functions.region("europe-west1")
.firestore.document("/accounts/{accountId}/scheduledNotifications/{notificationId}")
.onWrite(async (change, context) => {
  if (context.eventType == "google.firestore.document.delete") return;

  let reminderDocumentRef = change.after;
  let reminderDocumentData = reminderDocumentRef.data() as ReminderDocument;
  if (reminderDocumentData.enabled === false) return;

  let oldReminderDocumentRef = change.before;
  let oldreminderDocumentData = oldReminderDocumentRef.data() as ReminderDocument;

  try {
    let nextSend = calculateNextSend(reminderDocumentData);
    if (nextSend != oldreminderDocumentData.nextSend) {
      functions.logger.debug(`Updating timestamps on reminder ${reminderDocumentRef.ref}:`, {nextSend: nextSend});
      await reminderDocumentRef.ref.update({nextSend: nextSend});
    }
  } catch (e) {
    functions.logger.error(`Failed to update nextSend on document ${reminderDocumentRef.ref}`);
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
          Topic: notificationData.reminderRef.id,
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
  let reminders = await db.collectionGroup("scheduledNotifications")
  .where("nextSend", "<=", new Date())
  .where("enabled", "==", true)
  .get();

  for (let reminderDocument of reminders.docs) {
    let reminderDocumentData = reminderDocument.data() as ReminderDocument;
    let nextSend = calculateNextSend(reminderDocumentData);

    functions.logger.info("creating", reminderDocumentData);
    await triggerNotification(reminderDocument.ref, reminderDocumentData);

    functions.logger.debug(`Updating timestamps on reminder ${reminderDocument.ref.id}:`, {nextSend: nextSend});
    await reminderDocument.ref.update({lastSent: FieldValue.serverTimestamp(), nextSend: nextSend});
  }
});
