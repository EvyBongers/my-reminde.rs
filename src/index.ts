// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);

const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  document.body.dataset.loggedIn = user ? "1" : "0";
});

let loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  let formData = new FormData(e.currentTarget as HTMLFormElement);
  try {
    let response = await signInWithEmailAndPassword(
      auth,
      formData.get("username") as string,
      formData.get("password") as string,
    );
  } catch (e) {
    alert(e.message);
  }
});
