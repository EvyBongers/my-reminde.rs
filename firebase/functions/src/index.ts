import {logger, region} from "firebase-functions";
import {initializeApp} from "firebase-admin/app";
import {DocumentData, DocumentReference, FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {getMessaging, MulticastMessage} from "firebase-admin/messaging";
import {parseExpression} from "cron-parser-all";

initializeApp();
const db = getFirestore();
const functions = region("europe-west1");
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
      logger.error(`Unknown reminder type ${reminderDocumentData.type} on document ${reminderDocumentData._ref}`);
      return null;
    }
  }
};

export const doSendNotifications = functions.https.onCall(
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

export const updateNextSend = functions.firestore.document("/accounts/{accountId}/scheduledNotifications/{reminderId}").onWrite(async (change, context) => {
  if (context.eventType == "google.firestore.document.delete") return;

  let reminderDocumentRef = change.after;
  let reminderDocumentData = reminderDocumentRef.data() as ReminderDocument;
  if (reminderDocumentData.enabled === false) return;

  let oldReminderDocumentRef = change.before;
  let oldreminderDocumentData = oldReminderDocumentRef.data() as ReminderDocument;

  try {
    let nextSend = calculateNextSend(reminderDocumentData);
    if (nextSend != oldreminderDocumentData.nextSend) {
      logger.debug(`Updating timestamps on reminder ${reminderDocumentRef.ref}:`, {nextSend: nextSend});
      await reminderDocumentRef.ref.update({nextSend: nextSend});
    }
  } catch (e) {
    logger.error(`Failed to update nextSend on document ${reminderDocumentRef.ref}`);
    logger.error((e as Error).message);
  }
});

export const sendNotifications = functions.firestore.document("/accounts/{accountId}/notifications/{notificationId}").onCreate(async (snapshot, context) => {
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
          actions: [
            {
              title: "Open",
              action: "open",
              icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAx0lEQVR4Ae2ZsRGDMBTFuKyRDMIiDJgCNoMqmYACfu/KqBDcPd291kgFjT3cmhBC+NSW2lY7Lq2Fn9Mh/wcf1AMWLu8GrI8O6D6AM9V2PwDK3yoAyO9+AJOf/AAmP/gBQN4PAPJ+AJAXA7i8GMDl7QAuDwABXF4N4PJ+AJf3A7i88RNzeT+Ay/sBXN4P4PJ+wMjk/YBX7QvktYAmAshbAU3ECGTNAEACEgBIALjcFbby63V3M3/g8ParvYUnJrytNnfIhxCCwAnGmUVXQgo6RQAAAABJRU5ErkJggg==",
            },
          ],
          body: notificationData.body,
          renotify: true,
          requireInteraction: true,
          tag: snapshot.id,
          timestamp: notificationData.sent.toMillis(),
          title: notificationData.title,
        },
        fcmOptions: {
          link: `https://qvyldr.web.app/notifications/${snapshot.ref.id}`,
        },
      },
      tokens: tokens,
    } as MulticastMessage);
    logger.info(batchResponse.successCount + " messages were sent successfully");
    if (batchResponse.failureCount > 0) {
      logger.error(batchResponse.failureCount + " messages failed to send");
      batchResponse.responses.forEach((response, index) => {
        let error = response.error;
        if (error !== undefined) {
          logger.error("Failure sending notification to", tokens[index], error);
          if (error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered") {
            // TODO: delete/mark device token
          }
        }
      });
    }
  }
});

export const runNotify = functions.pubsub.schedule("* * * * *").timeZone("Europe/Amsterdam").onRun(async _context => {
  let reminders = await db.collectionGroup("scheduledNotifications")
  .where("nextSend", "<=", new Date())
  .where("enabled", "==", true)
  .get();

  for (let reminderDocument of reminders.docs) {
    let reminderDocumentData = reminderDocument.data() as ReminderDocument;
    let nextSend = calculateNextSend(reminderDocumentData);

    logger.info("creating", reminderDocumentData);
    await triggerNotification(reminderDocument.ref, reminderDocumentData);

    logger.debug(`Updating timestamps on reminder ${reminderDocument.ref.id}:`, {nextSend: nextSend});
    await reminderDocument.ref.update({lastSent: FieldValue.serverTimestamp(), nextSend: nextSend});
  }
});
