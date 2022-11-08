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

self.addEventListener('notificationclick', (event) => {
  console.log("Notification click registered", event);
  switch (event.action) {
    case "":
      console.log("Opening notification...");
      clients.openWindow(`/notifications/${event.notification.tag}`);
      break;
    case "open":
      console.log("Opening notification link...");
      clients.openWindow(`/notifications/${event.notification.tag}/open`);
    default:
      console.log(`Unknown notification action '${event.action}'`);
  }
  event.notification.close();
});
