import { FirebaseError, initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { initializePlatformAuth } from './firebaseAuthPersistence';

const config: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const requiredConfig = [config.apiKey, config.authDomain, config.projectId, config.appId];
export const firebaseConfigured = requiredConfig.every((value) => typeof value === 'string' && value.length > 0);

let authInstance: Auth | undefined;
let firestoreInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;
export const firebaseStorageConfigured =
  typeof config.storageBucket === 'string' && config.storageBucket.length > 0;

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
  if (!firestoreInstance) firestoreInstance = getFirestore(getApp());
  return firestoreInstance;
}

export function getFirebaseStorage() {
  if (!firebaseStorageConfigured) {
    throw new Error('Configura el bucket de Firebase Storage para adjuntar comprobantes.');
  }
  if (!storageInstance) storageInstance = getStorage(getApp());
  return storageInstance;
}
