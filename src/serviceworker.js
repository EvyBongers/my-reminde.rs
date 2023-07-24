import {initializeApp} from "https://www.gstatic.com/firebasejs/__FIREBASE_SDK_VERSION__/firebase-app.js";
import {getMessaging} from "https://www.gstatic.com/firebasejs/__FIREBASE_SDK_VERSION__/firebase-messaging.js";

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

// Incrementing OFFLINE_VERSION will kick off the install event and force
// previously cached resources to be updated from the network.
const OFFLINE_VERSION = 1;
const CACHE_NAME = 'offline';
// Customize this with a different URL if needed.
const OFFLINE_URL = 'offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(async () => {
    const cache = await caches.open(CACHE_NAME);
    // Setting {cache: 'reload'} in the new request will ensure that the response
    // isn't fulfilled from the HTTP cache; i.e., it will be from the network.
    await cache.add(new Request(OFFLINE_URL, {cache: 'reload'}));
  });
});

self.addEventListener('activate', (event) => {
  event.waitUntil(async () => {
    // Enable navigation preload if it's supported.
    // See https://developers.google.com/web/updates/2017/02/navigation-preload
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }

    // Tell the active service worker to take control of the page immediately.
    await self.clients.claim();
  });
});

self.addEventListener('fetch', (event) => {
  // We only want to call event.respondWith() if this is a navigation request
  // for an HTML page.
  if (event.request.mode === 'navigate') {
    event.respondWith(async () => {
      try {
        // First, try to use the navigation preload response if it's supported.
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) {
          return preloadResponse;
        }

        const networkResponse = await fetch(event.request);
        return networkResponse;
      } catch (error) {
        // catch is only triggered if an exception is thrown, which is likely
        // due to a network error.
        // If fetch() returns a valid HTTP response with a response code in
        // the 4xx or 5xx range, the catch() will NOT be called.
        console.log('Fetch failed; returning offline page instead.', error);

        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(OFFLINE_URL);
        return cachedResponse;
      }
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log("Notification click registered", event);
  let data = event.notification.data.FCM_MSG?.data ?? event.notification.data;
  let url = event.action || `${location.protocol}//${location.host}/notifications/${data.notificationId}`;

  for (let _type of ["window", "worker", "sharedworker", "all"]) {
    for (let _includeUncontrolled of [false, true]) {
      let options = {
        type: _type,
        includeUncontrolled: _includeUncontrolled,
      }
      console.log("Options:", options);
      self.clients.matchAll(options).then((clientList) => {
        console.log("Matching clients:", clientList);
        // for (const client of clientList) {
        //   if (client.url === "index.html") {
        //     clients.openWindow(client);
        //     // or do something else involving the matching client
        //   }
        // }
      });
    }
  }

  console.log(`Opening url: ${url}`);
  self.clients.openWindow(url);
  event.notification.close();
});
