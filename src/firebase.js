// firebase.js
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB_2ENI6fCDdM4SCO4AZyaCqAwuYPEHSqc",
  authDomain: "chat-app-f4bb5.firebaseapp.com",
  databaseURL: "https://chat-app-f4bb5-default-rtdb.firebaseio.com",
  projectId: "chat-app-f4bb5",
  storageBucket: "chat-app-f4bb5.firebasestorage.app",
  messagingSenderId: "618364636557",
  appId: "1:618364636557:web:5154882cef1f56409241c4",
  measurementId: "G-MWET80R2RC"
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

// Export authentication functions for manual login/signup
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
};

export default app;