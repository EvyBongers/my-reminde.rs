import { firebaseApp } from "./firebase";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc as firestoreGetDoc,
  getFirestore, onSnapshot,
  setDoc as firestoreSetDoc,
} from "firebase/firestore";
export {
  deleteField as firestoreDelete
} from 'firebase/firestore';

export type DataSupplier<T> = AsyncGenerator<T, void, any>;
export type DataCollectionSupplier<T> = AsyncGenerator<T[], void, any>;

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

export async function* loadCollection<T = any>(path: string): DataCollectionSupplier<T> {
  let lastCallback: (docs: any[]) => void;
  let nextItems = new Promise<T[]>((s) => {
    lastCallback = s;
  });

  onSnapshot(collection(db, path), (snapshot) => {
    lastCallback(snapshot.docs.map(_ => {
      let data = _.data();
      Object.defineProperty(data, '_ref', {value: _.ref});

      return data;
    }));

    nextItems = new Promise<T[]>((s) => {
      lastCallback = s;
    });
  });

  while (1) {
    let outputItems = await nextItems;
    yield outputItems;
  }
}

//loadDocument('accounts/asdasda')
export async function* loadDocument<T = any>(path: string): DataSupplier<T> {
  let lastCallback: (doc: any) => void;
  let nextItems = new Promise<T>((s) => {
    lastCallback = s;
  });

  onSnapshot(doc(db, path), (snapshot) => {
    let data = snapshot.data() as T;
    Object.defineProperty(data, '_ref', {value: snapshot.ref});

    lastCallback(data);

    nextItems = new Promise<T>((s) => {
      lastCallback = s;
    });
  });

  while (1) {
    let outputItems = await nextItems;
    yield outputItems;
  }
}
