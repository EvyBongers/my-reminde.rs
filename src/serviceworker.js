import {initializeApp} from "https://www.gstatic.com/firebasejs/__FIREBASE_SDK_VERSION__/firebase-app.js";
import {getMessaging} from "https://www.gstatic.com/firebasejs/__FIREBASE_SDK_VERSION__/firebase-messaging.js";
import {deleteDoc, doc, getFirestore} from "https://www.gstatic.com/firebasejs/__FIREBASE_SDK_VERSION__/firebase-firestore.js";

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
const db = getFirestore(app);

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
    event.respondWith(doFetch(event));
  }
});

async function doFetch(event) {
  try {
    // First, try to use the navigation preload response if it's supported.
    const preloadResponse = await event.preloadResponse;
    if (preloadResponse) {
      console.log("Responding with preload:", preloadResponse);
      return preloadResponse;
    }

    const networkResponse = await fetch(event.request);
    console.log("Responding with network:", networkResponse);
    return networkResponse;
  } catch (error) {
    // catch is only triggered if an exception is thrown, which is likely
    // due to a network error.
    // If fetch() returns a valid HTTP response with a response code in
    // the 4xx or 5xx range, the catch() will NOT be called.
    console.log('Fetch failed; returning offline page instead.', error);

    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(OFFLINE_URL);
    console.log("Responding with cache:", cachedResponse);
    return cachedResponse;
  }
}

self.addEventListener('notificationclick', (ev) => {
  ev.waitUntil(async () => {
    let data = ev.notification.data.FCM_MSG?.data ?? ev.notification.data;
    let notificationDocPath = data.notification;
    let notificationId = data.notification.split("/").reverse()[0];

    let url = ev.action || `${location.protocol}//${location.host}/notifications/${notificationId}`;

    if (url === notificationDocPath) {
      let docRef = doc(db, notificationDocPath);
      await deleteDoc(docRef);
      ev.notification.close();
      return;
    }

    let windowClients = await self.clients.matchAll({type: "window"});

    // Look for any window that matches the targeted URL or host
    let client = windowClients.reduce((client, current) => {
      if (client?.url === url) return client;
      else if (current?.url === url) return current;
      else if ((new URL(current?.url)).host == location.host) return current;
      else return client;
    });

    // If none are found, open a new tab to the applicable URL and focus it
    if (client === undefined) {
      client = await self.clients.openWindow(url);
    }
    // Otherwise, navigate to the correct url
    else if (client.url !== url) {
      await client.navigate(url);
    }

    if (client) {
      client.focus();
    }
  });

  if (!ev.action) {
    ev.notification.close();
  }
});
