import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAITZ-hUt9QFE4NCLzLs4FxERn2DrvaqAs",
  authDomain: "lunch-check-a5bbc.firebaseapp.com",
  projectId: "lunch-check-a5bbc",
  storageBucket: "lunch-check-a5bbc.firebasestorage.app",
  messagingSenderId: "111677749326",
  appId: "1:111677749326:web:876ab6228e1ccd37bd2b1f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);