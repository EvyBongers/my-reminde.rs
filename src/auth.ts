import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { firebaseApp } from "./firebase";
import { getDoc, setDoc } from "./db";

export let user: User = undefined;
export const auth = getAuth(firebaseApp);
if (location.hostname === "localhost") {
  connectAuthEmulator(auth, "http://localhost:9099");
}

export const login = signInWithEmailAndPassword.bind(null, auth);
export const logout = signOut.bind(null, auth);

onAuthStateChanged(auth, (_user) => {
  user = _user;
});

export const getAccount = () => {
  return getDoc(`accounts/${user.uid}`);
};

export const updateAccount = (values: any) => {
  return setDoc(`accounts/${user.uid}`, values, { merge: true });
};
