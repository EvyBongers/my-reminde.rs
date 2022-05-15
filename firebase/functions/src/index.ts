import * as functions from "firebase-functions";

import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";

initializeApp();

interface AccountDevice {
  name: string;
  token: string;
}

interface AccountDocument {
  devices: { [key: string]: AccountDevice };
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
      console.log(response.successCount + " messages were sent successfully");
    }
  });
