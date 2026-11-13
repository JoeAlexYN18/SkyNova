import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';

export function initializePlatformAuth(app: FirebaseApp): Auth {
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}
