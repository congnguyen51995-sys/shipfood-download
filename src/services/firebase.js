import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA3tjBHdFhvUrOzTZQwYYAshxjjxp3uL9g",
  authDomain: "shipfood-f43b8.firebaseapp.com",
  projectId: "shipfood-f43b8",
  storageBucket: "shipfood-f43b8.firebasestorage.app",
  messagingSenderId: "664916425769",
  appId: "1:664916425769:web:c8e0f9ccf06d3643443038",
  measurementId: "G-YWT27Y29WF",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
