import {logger, region} from "firebase-functions";
import {credential} from "firebase-admin";
import {initializeApp} from "firebase-admin/app";
import {DocumentData, DocumentReference, FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {getMessaging, MulticastMessage} from "firebase-admin/messaging";
import {parseExpression} from "cron-parser-all";
import {existsSync, readFileSync} from "fs";
import {env} from "process";

let options: { [key: string]: any } = {};
try {
  const serviceAccountFile = env.FIREBASE_SERVICE_ACCOUNT_FILE as string;
  if (serviceAccountFile && existsSync(serviceAccountFile)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountFile, "utf8"));
    if (serviceAccount !== null) {
      options.credential = credential.cert(serviceAccount);
    }
  }
} catch (e) {
  console.debug(`Failed to read service account file (${env.FIREBASE_SERVICE_ACCOUNT_FILE})`, e);
  console.debug("Falling back on default initialization");
} finally {
  initializeApp(options);
}

const db = getFirestore();
const functions = region("europe-west1");
const messaging = getMessaging();

interface RegisteredDevice {
  name: string;
  token: string;
}

interface AccountDocument extends DocumentData {
  devices: { [key: string]: RegisteredDevice };
  reminders?: { [key: string]: ReminderDocument };
  notifications?: { [key: string]: NotificationDocument };
}

export interface ReminderBase extends DocumentData {
  title: string;
  body: string;
  link?: string;
}

export interface ReminderDocument extends ReminderBase {
  enabled: boolean;

  type: string;
  cronExpression?: string;

  lastSent?: Timestamp;
  nextSend?: Timestamp;
}

export interface NotificationDocument extends ReminderBase {
  reminderRef: DocumentReference,
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

export const openNotificationLink = functions.https.onRequest(
  async (req, resp) => {
    logger.debug("Headers", JSON.stringify(req.headers));
    logger.debug("Cookies", JSON.stringify(req.cookies));

    // logger.debug("Users", auth.listUsers());
    let uid;
    if (uid === undefined) {
      // TODO: show a nice page
      resp.status(200).send(JSON.stringify(Object.entries(req)));
      return;
    }

    let notificationId = req.url.split("/")[-1];
    let notificationDocumentRef = await db.doc(`/users/${uid}/notifications/${notificationId}`);
    let notificationDocumentData = (await notificationDocumentRef.get()).data() as ReminderDocument;
    if (notificationDocumentData.link === undefined) {
      // TODO: show a nice page
      resp.status(404);
      return;
    }

    resp.redirect(302, notificationDocumentData.link as string);
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
  return Object.values(account.devices).map(_ => _.token);
};

export const updateNextSend = functions.firestore.document("/accounts/{accountId}/reminders/{reminderId}").onWrite(async (change, context) => {
  if (context.eventType == "google.firestore.document.delete") return;

  let reminderDocumentRef = change.after;
  let reminderDocumentData = reminderDocumentRef.data() as ReminderDocument;
  if (reminderDocumentData === undefined || reminderDocumentData.enabled === false) return;

  let oldReminderDocumentRef = change.before;
  let oldReminderDocumentData = oldReminderDocumentRef.data() as ReminderDocument;

  try {
    let nextSend = calculateNextSend(reminderDocumentData);
    if (nextSend != oldReminderDocumentData?.nextSend) {
      logger.info(`Updating timestamps on reminder ${reminderDocumentRef.ref.id}:`, {nextSend: nextSend?.toDate().toUTCString()});
      let writtenAt = await reminderDocumentRef.ref.update({nextSend: nextSend});
      logger.debug(`Reminder ${reminderDocumentRef.ref.id} updated at ${writtenAt.writeTime.toDate().toUTCString()}`);
    }
  } catch (e) {
    logger.error(`Failed to update nextSend on document ${reminderDocumentRef.ref.id}`, JSON.stringify(e));
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
        data: {
          notificationId: snapshot.ref.id,
          reminderId: notificationData.reminderRef.id,
          link: notificationData.link,
        },
        headers: {
          // Prefer: "respond-async",
          // TTL: "-1",
          Urgency: "high",
          Topic: notificationData.reminderRef.id,
        },
        notification: {
          actions: notificationData.link ? [
            {
              title: "Open",
              action: notificationData.link,
              icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAx0lEQVR4Ae2ZsRGDMBTFuKyRDMIiDJgCNoMqmYACfu/KqBDcPd291kgFjT3cmhBC+NSW2lY7Lq2Fn9Mh/wcf1AMWLu8GrI8O6D6AM9V2PwDK3yoAyO9+AJOf/AAmP/gBQN4PAPJ+AJAXA7i8GMDl7QAuDwABXF4N4PJ+AJf3A7i88RNzeT+Ay/sBXN4P4PJ+wMjk/YBX7QvktYAmAshbAU3ECGTNAEACEgBIALjcFbby63V3M3/g8ParvYUnJrytNnfIhxCCwAnGmUVXQgo6RQAAAABJRU5ErkJggg==",
            },
          ] : [],
          body: notificationData.body,
          renotify: true,
          requireInteraction: true,
          tag: notificationData.reminderRef.id,
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
  let reminders = await db.collectionGroup("reminders")
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
