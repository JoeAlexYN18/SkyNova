import 'firebase/auth';
import type { initializeAuth } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): NonNullable<Parameters<typeof initializeAuth>[1]>['persistence'];
}
