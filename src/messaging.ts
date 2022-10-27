import {getMessaging, getToken, onMessage} from "firebase/messaging";
import {firebaseApp} from "./firebase";
import {getAccount, updateAccount, user} from "./auth";
import {getDeviceId, getDeviceName} from "./helpers/Device";
import {firestoreDelete} from "./db";

const messaging = getMessaging(firebaseApp);

async function updateDevice(deviceId: string, deviceProperties: any) {
  await updateAccount({
    devices: {
      [deviceId]: deviceProperties,
    }
  });
}

export async function enablePushNotifications() {
  let token = await getToken(messaging, {vapidKey: ""});
  console.log(token);

  let deviceName = getDeviceName();
  if (!deviceName) return;

  await updateDevice(getDeviceId(), {
    name: deviceName,
    token: token,
    lastSeen: Date.now(),
  });
}

export async function disablePushNotifications(deviceId?: string) {
  await updateDevice(deviceId ?? getDeviceId(), firestoreDelete());
}

export async function isPushNotificationsEnabled() {
  while (!user) {
    await new Promise(_ => setTimeout(_, 50));
  }

  let account = await getAccount();
  if(!account?.devices) return false;

  if (getDeviceId() in account.devices) {
    console.log(`Updating last seen for ${getDeviceId()}`)
    await updateDevice(getDeviceId(), {
      lastSeen: Date.now(),
    });
    return true
  }
  return false
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
