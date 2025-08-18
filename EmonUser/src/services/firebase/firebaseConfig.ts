import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "EMON_API_KEY",
  authDomain: "EMON_AUTH_DOMAIN",
  databaseURL: "EMON_DATABASE_URL",
  projectId: "EMON_PROJECTID",
  storageBucket: "EMON_STORAGE_BUCKET",
  messagingSenderId: "EMON_MESSENGER_ID",
  appId: "EMON_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const database = getDatabase(app);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

export default app;
