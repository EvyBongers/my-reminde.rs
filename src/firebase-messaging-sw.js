import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

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
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = getMessaging(app);

self.addEventListener('notificationclick', (event) => {
  console.log("Notification click registered", event);
  if (event.action === 'open') {
    console.log("Opening notification...");

    event.waitUntil(self.clients.matchAll({
      type: "window"
    }).then((_) => {
      return clients.openWindow(`/notifications/${event.notifiation.tag}`);
    }));
  } else {
    console.log(`Unknown notification action '${event.action}'`);
  }
  event.notification.close();
}, false);
