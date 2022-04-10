import '@material/mwc-button'
import { firebaseApp } from "./firebase";
import "./auth";
import "./db";
import "./messaging";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import './jdi-app';

const functions = getFunctions(firebaseApp, "europe-west1");
if (location.hostname === "localhost") {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

