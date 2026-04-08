import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
  updateEmail,
  sendPasswordResetEmail,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBcWaztfYdkp0f5XcDcWsjaQRmlfrwI6Os",
  authDomain: "skyvault-f1b5f.firebaseapp.com",
  projectId: "skyvault-f1b5f",
  storageBucket: "skyvault-f1b5f.firebasestorage.app",
  messagingSenderId: "194582960571",
  appId: "1:194582960571:web:4e13b9bf9a2c6866adcc9e",
  measurementId: "G-8F9Q5B9P25",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({ prompt: 'select_account' });

export {
  auth,
  googleProvider,
  microsoftProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  updateEmail,
  sendPasswordResetEmail,
};
