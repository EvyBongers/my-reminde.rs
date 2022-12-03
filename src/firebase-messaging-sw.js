importScripts("https://www.gstatic.com/firebasejs/9.12.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.12.1/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyAQeo7TxkZXoPZlB31rnbdJ4YK6J9l3lHY",
  authDomain: "qvyldr.firebaseapp.com",
  projectId: "qvyldr",
  storageBucket: "qvyldr.appspot.com",
  messagingSenderId: "452277637486",
  appId: "1:452277637486:web:afa0d040adf5c183eef17f",
  measurementId: "G-HYCWSGGJCF",
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = firebase.messaging(app);

messaging.onMessage(messaging, (payload) => {
  console.log("[firebase-messaging-sw.js] Received message ", payload);

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

self.addEventListener('notificationclick', (event) => {
  console.log("Notification click registered", event);
  let data = event.notification.data.FCM_MSG?.data ?? event.notification.data;
  switch (event.action) {
    case "":
      console.log(`Opening notification: /notifications/${data.notificationId}`);
      clients.openWindow(`/notifications/${data.notificationId}`);
      break;
    case "open":
      console.log(`Opening notification link: /notifications/${data.notificationId}/open`);
      clients.openWindow(`/notifications/${data.notificationId}/open`);
      break;
    default:
      console.log(`Unknown notification action '${event.action}'`);
  }
  event.notification.close();
});
