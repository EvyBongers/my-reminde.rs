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
  if (!account?.devices) return false;

  if (getDeviceId() in account.devices) {
    console.log(`Updating last seen for ${getDeviceId()}`)
    await updateDevice(getDeviceId(), {
      lastSeen: Date.now(),
    });
    return true
  }
  return false
}

onMessage(messaging, (payload) => {
  console.log("[messaging.ts] Received message ", payload);

  // Customize notification here
  const notificationTitle = `[Foreground] ${payload.notification.title}`;
  const notificationOptions = {
    actions: payload.data.link ? [
      {
        title: "Open",
        action: "open",
        icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAx0lEQVR4Ae2ZsRGDMBTFuKyRDMIiDJgCNoMqmYACfu/KqBDcPd291kgFjT3cmhBC+NSW2lY7Lq2Fn9Mh/wcf1AMWLu8GrI8O6D6AM9V2PwDK3yoAyO9+AJOf/AAmP/gBQN4PAPJ+AJAXA7i8GMDl7QAuDwABXF4N4PJ+AJf3A7i88RNzeT+Ay/sBXN4P4PJ+wMjk/YBX7QvktYAmAshbAU3ECGTNAEACEgBIALjcFbby63V3M3/g8ParvYUnJrytNnfIhxCCwAnGmUVXQgo6RQAAAABJRU5ErkJggg==",
      },
    ] : [],
    // badge?: string;
    body: payload.notification.body,
    data: payload.data,
    // dir?: NotificationDirection;
    // icon?: string;
    image: payload.notification.image ?? "/firebase-logo.png",
    // lang?: string;
    renotify: true,
    requireInteraction: true,
    // silent?: boolean;
    tag: payload.data.reminderId,
    // timestamp: notificationData.sent.toMillis(),
    // vibrate?: VibratePattern;
  };

  navigator.serviceWorker.getRegistration("/firebase-cloud-messaging-push-scope").then(
    registration => {
      if (!registration) return;
      registration.showNotification(notificationTitle, notificationOptions)
    }
  );
});
