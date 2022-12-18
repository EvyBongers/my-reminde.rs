importScripts(`https://www.gstatic.com/firebasejs/__FIREBASE_SDK_VERSION__/firebase-app-compat.js`);
importScripts(`https://www.gstatic.com/firebasejs/__FIREBASE_SDK_VERSION__/firebase-messaging-compat.js`);

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
  let data = event.notification.data.FCM_MSG?.data ?? event.notification.data;
  let url = event.action || `${location.protocol}//${location.host}/notifications/${data.notificationId}`;
  console.log(`Opening url: ${url}`);
  self.clients.openWindow(url);
  event.notification.close();
});
