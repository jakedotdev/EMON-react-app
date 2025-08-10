import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBzZotbO7QzJETNeV8Sl_N-IEi-v-hVpTo",
  authDomain: "emoniot-fb5ce.firebaseapp.com",
  databaseURL: "https://emoniot-fb5ce-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "emoniot-fb5ce",
  storageBucket: "emoniot-fb5ce.appspot.com",
  messagingSenderId: "434793832350",
  appId: "1:434793832350:android:c0b9d1c4eee126eb0e808f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const database = getDatabase(app);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

export default app;
