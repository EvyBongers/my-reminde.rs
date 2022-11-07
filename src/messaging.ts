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

// TODO: fix foreground notifications
onMessage(messaging, (payload) => {
  console.log("[messaging.ts] Received message ", payload);

  // Customize notification here
  const notificationTitle = `[Foreground] ${payload.notification.title}`;
  const notificationOptions = {
    // actions?: NotificationAction[];
    // badge?: string;
    body: payload.notification.body,
    // data?: any;
    // dir?: NotificationDirection;
    // icon?: string;
    image: payload.notification.image ?? "/firebase-logo.png",
    // lang?: string;
    renotify: true,
    requireInteraction: true,
    // silent?: boolean;
    tag: payload.messageId,
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
