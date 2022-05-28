import {getMessaging, getToken, onMessage} from "firebase/messaging";
import {firebaseApp} from "./firebase";
import {getAccount, updateAccount, user} from "./auth";
import {getDeviceId} from "./helpers/Device";
import {firestoreDelete} from "./db";

const messaging = getMessaging(firebaseApp);

export async function enablePushNotifications() {
  let token = await getToken(messaging, {vapidKey: ""});
  console.log(token);

  let deviceName =  prompt('Device name?', navigator.userAgent);
  if (!deviceName) return;

  await updateAccount({
    devices: {
      [getDeviceId()]: {
        name: deviceName,
        token: token
      },
    }
  });
}

export async function disablePushNotifications() {
  await updateAccount({
    devices: {
      [getDeviceId()]: firestoreDelete(),
    }
  });
}

export async function isPushNotificationsEnabled() {
  while (!user) {
    await new Promise(_ => setTimeout(_, 50));
  }

  let account = await getAccount();
  if(!account?.devices) return false;

  return getDeviceId() in account.devices;
}

// TODO: fix foreground notifications
onMessage(messaging, (payload) => {
  console.log(
    "[messaging.ts] Received message ",
    payload,
  );
  // Customize notification here
  const notificationTitle = `[Foreground] ${payload.data.title}`;
  const notificationOptions = {
    body: payload.data.body,
    icon: "/firebase-logo.png",
  };

  new Notification(notificationTitle, notificationOptions);
});
