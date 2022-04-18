import {getMessaging, getToken, onMessage} from "firebase/messaging";
import {firebaseApp} from "./firebase";
import {getAccount, updateAccount, user} from "./auth";

const messaging = getMessaging(firebaseApp);

export async function enablePushNotifications() {
  let token = await getToken(messaging, {vapidKey: ""});
  console.log(token);
  await updateAccount({pushToken: token});
}

export async function disablePushNotifications() {
  await updateAccount({pushToken: null});
}

export async function isPushNotifications() {
  while(!user){
    await new Promise(_=>setTimeout(_, 50));
  }

  let account = await getAccount();

  return !!account.pushToken;
}

// TODO: fix foreground notifications
onMessage(messaging, (payload) => {
  console.log(
    "[index.ts] Received message ",
    payload,
  );
  // Customize notification here
  const notificationTitle = "Background Message Title";
  const notificationOptions = {
    body: "Foreground Message body.",
    icon: "/firebase-logo.png",
  };

  new Notification(notificationTitle, notificationOptions);
});
