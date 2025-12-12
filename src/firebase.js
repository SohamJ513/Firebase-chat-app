// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "Enter your firebase api key here",
  authDomain: "Enter your Auth domain here",
  projectId: "Your project id",
  storageBucket: "Your storage bucket id",
  messagingSenderId: " Your message sender id",
  appId: "Your app id",
  measurementId: "Your measurement id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

export default app;
