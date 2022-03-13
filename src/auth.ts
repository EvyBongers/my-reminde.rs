import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { firebaseApp } from "./firebase";
import { getDoc, setDoc } from "./db";

let user: any = undefined;
const auth = getAuth(firebaseApp);
if (location.hostname === "localhost"){
  connectAuthEmulator(auth, "http://localhost:9099");
}

onAuthStateChanged(auth, (_user) => {
  user = _user;
  document.body.dataset.loggedIn = _user ? "1" : "0";
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

let logoutButton = document.getElementById("logout");
logoutButton.addEventListener("click", async (e) => {
  await signOut(auth);
});

export const getAccount = () => {
  return getDoc(`accounts/${user.uid}`);
};

export const updateAccount = (values: any) => {
  return setDoc(`accounts/${user.uid}`, values, { merge: true });
};
