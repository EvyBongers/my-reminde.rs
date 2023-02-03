import {firebaseApp} from "./firebase";
import {
  addDoc,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getFirestore,
  onSnapshot,
  QueryDocumentSnapshot,
  setDoc
} from "firebase/firestore";

export {deleteField as firestoreDelete} from 'firebase/firestore';

export type DataSupplier<T> = AsyncGenerator<T, void, any>;
export type DataCollectionSupplier<T> = AsyncGenerator<T[], void, any>;

export const db = getFirestore(firebaseApp);
if (location.hostname === "localhost") {
  connectFirestoreEmulator(db, "localhost", 8080);
}

export const addDocByRef = async (collectionRef: any, values: any) => {
  return await addDoc(collectionRef, values);
}

export const deleteDocByRef = async (docRef: any) => {
  return await deleteDoc(docRef);
}

export const getCollectionByPath = async (path: string) => {
  return collection(db, path)
};

export const getDocByPath = async (path: string) => {
  let docRef = doc(db, path);
  let docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    return undefined;
  }
};

export const setDocByPath = async (path: string, values: any, options: any) => {
  let docRef = doc(db, path);
  return await setDoc(docRef, values, options);
};

export const setDocByRef = async (docRef: any, values: any, options: any) => {
  return await setDoc(docRef, values, options);
};

export async function* loadCollection<T extends DocumentData>(path: string, compareFn?: (a: QueryDocumentSnapshot<T>, b: QueryDocumentSnapshot<T>) => number): DataCollectionSupplier<T> {
  let lastCallback: (docs: any[]) => void;
  let nextItems = new Promise<T[]>((s) => {
    lastCallback = s;
  });

  onSnapshot(collection(db, path), (snapshot) => {
    lastCallback(snapshot.docs.sort(compareFn).map(_ => {
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
