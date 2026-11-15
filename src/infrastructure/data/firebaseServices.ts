import { FirebaseError, initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, type Firestore } from 'firebase/firestore';
import { initializePlatformAuth } from './firebaseAuthPersistence';

const config: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const requiredConfig = [config.apiKey, config.authDomain, config.projectId, config.appId];
export const firebaseConfigured = requiredConfig.every((value) => typeof value === 'string' && value.length > 0);

let authInstance: Auth | undefined;
let firestoreInstance: Firestore | undefined;

function getApp() {
  if (!firebaseConfigured) {
    throw new Error('Configura las variables EXPO_PUBLIC_FIREBASE_* para conectar Firebase.');
  }
  return getApps()[0] ?? initializeApp(config);
}

export function getFirebaseAuth() {
  if (authInstance) return authInstance;
  const app = getApp();
  try {
    authInstance = initializePlatformAuth(app);
  } catch (error) {
    if (!(error instanceof FirebaseError) || error.code !== 'auth/already-initialized') throw error;
    authInstance = getAuth(app);
  }
  return authInstance;
}

export function getFirebaseFirestore() {
  if (!firestoreInstance) {
    const app = getApp();
    try {
      firestoreInstance = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
    } catch {
      firestoreInstance = getFirestore(app);
    }
  }
  return firestoreInstance;
}

