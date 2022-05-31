import { firebaseApp } from "./firebase";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc as firestoreGetDoc, getDocs,
  getFirestore,
  setDoc as firestoreSetDoc,
} from "firebase/firestore";
export {
  deleteField as firestoreDelete
} from 'firebase/firestore';

export const db = getFirestore(firebaseApp);
if (location.hostname === "localhost") {
  connectFirestoreEmulator(db, "localhost", 8080);
}
export const getDoc = async (path: string) => {
  let docRef = doc(db, path);
  let docSnap = await firestoreGetDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    return undefined;
  }
};

export const setDoc = async (path: string, values: any, options: any) => {
  let docRef = doc(db, path);
  return await firestoreSetDoc(docRef, values, options);
};
