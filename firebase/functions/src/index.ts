import * as functions from "firebase-functions";

import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";

initializeApp();

interface AccountDocument {
  devices: { name: string; token: string }[];
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

export const sendNotifications = functions.region("europe-west1")
  .firestore.document("/accounts/{accountId}/notifications/{notificationId}")
  .onCreate(async (snapshot, context) => {
    let notificationData = snapshot.data();
    let accounts = await db.collection("accounts").get();
    for (let account of accounts.docs) {
      let accountData = account.data() as AccountDocument;
      let message = {
        title: notificationData.title,
        body: notificationData.body,
        tokens: accountData.devices.map((_) => _.token),
      };
      let response = await getMessaging().sendMulticast(message);
      console.log(response.successCount + " messages were sent successfully");
    }
  });
