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
if (location.hostname === "localhost") {
  connectAuthEmulator(auth, "http://localhost:9099");
}

onAuthStateChanged(auth, (_user) => {
  user = _user;
  document.body.dataset.loggedIn = _user ? "1" : "0";
});

export const login = async (username: string, password: string)=>{
    return await signInWithEmailAndPassword(
      auth,
      username,
      password,
    );
}

export const logout = signOut.bind(null, auth);
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
