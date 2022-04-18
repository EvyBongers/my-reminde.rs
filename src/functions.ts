import {connectFunctionsEmulator, getFunctions, httpsCallable} from "firebase/functions";
import {firebaseApp} from "./firebase";

const functions = getFunctions(firebaseApp, "europe-west1");
if (location.hostname === "localhost") {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export const sendNotifications = httpsCallable(functions, "sendNotifications");
