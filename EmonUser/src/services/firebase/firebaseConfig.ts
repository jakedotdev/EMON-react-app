import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration (derived from android/app/google-services.json)
// If you also have a Firebase Web App config, you can replace appId/authDomain with the Web values.
const firebaseConfig = {
  apiKey: 'AIzaSyBzZotbO7QzJETNeV8Sl_N-IEi-v-hVpTo',
  authDomain: 'emoniot-fb5ce.firebaseapp.com',
  databaseURL: 'https://emoniot-fb5ce-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'emoniot-fb5ce',
  storageBucket: 'emoniot-fb5ce.firebasestorage.app',
  messagingSenderId: '434793832350',
  // Note: This is the Android mobilesdk_app_id. If you have a Web app, prefer its web appId here.
  appId: '1:434793832350:android:c0b9d1c4eee126eb0e808f',
};

// Initialize Firebase (reuse app if it already exists to avoid duplicate-app error)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth with React Native persistence so sessions survive app restarts
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize other Firebase services
export const database = getDatabase(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

export default app;
