// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBHQxLU0TPBtG4vW_H4ojin9GvW9G6SiRY",
  authDomain: "ledger-mm.firebaseapp.com",
  projectId: "ledger-mm",
  storageBucket: "ledger-mm.firebasestorage.app",
  messagingSenderId: "553568863593",
  appId: "1:553568863593:web:a3faa65dac9cd8e3d6e9f8",
  measurementId: "G-1BGS4PRX9M"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };