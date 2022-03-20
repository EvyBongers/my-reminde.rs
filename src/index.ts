import './components/jdi-login';
import './components/jdi-logout';
import { firebaseApp } from "./firebase";
import "./auth";
import "./db";
import "./messaging";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";

const functions = getFunctions(firebaseApp, "europe-west1");
if (location.hostname === "localhost") {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

const sendNotifications = httpsCallable(functions, "sendNotifications");
document.getElementById("send").addEventListener("click", async (e) => {
  let t = await sendNotifications();
  debugger;
  console.log("ttt", t);
});
