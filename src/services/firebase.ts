/**
 * Firebase Configuration for MaxPlay
 * 
 * Firestore Security Rules:
 * =========================
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     // User document rules: users can only read/write their own document
 *     match /users/{userId} {
 *       allow read, write: if request.auth != null && request.auth.uid == userId;
 *     }
 *     
 *     // Content rules: read-only for all authenticated/unauthenticated users
 *     match /content/{contentId} {
 *       allow read: if true;
 *       allow write: if request.auth != null && request.auth.token.admin == true;
 *       
 *       match /episodes/{episodeId} {
 *         allow read: if true;
 *         allow write: if request.auth != null && request.auth.token.admin == true;
 *       }
 *     }
 *     
 *     // User progress & history & myList: users can only access their own
 *     match /userProgress/{userId}/progress/{contentId} {
 *       allow read, write: if request.auth != null && request.auth.uid == userId;
 *     }
 *     match /watchHistory/{userId}/items/{historyId} {
 *       allow read, write: if request.auth != null && request.auth.uid == userId;
 *     }
 *     match /myList/{userId}/items/{contentId} {
 *       allow read, write: if request.auth != null && request.auth.uid == userId;
 *     }
 *     match /downloadTasks/{userId}/tasks/{taskId} {
 *       allow read, write: if request.auth != null && request.auth.uid == userId;
 *     }
 *   }
 * }
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, memoryLocalCache, doc, getDoc, setLogLevel } from 'firebase/firestore';

// Safe non-sensitive public default configuration to prevent Git leakage alerts on GitHub
// Overridden securely using environment variables at build-time in production (Vercel/Cloud Run)
const metaEnv = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyB9ru5QTU3Wt8xr8aPPx38NuDhoV87KdQ0",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0291911037.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0291911037",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:596965139357:web:5a1d0502c7745f44f58574",
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || "ai-studio-maxplay-e5163e97-7cd5-4a42-875c-8b5dce9fd72d",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0291911037.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "596965139357",
  oAuthClientId: "596965139357-0ml5nqmtv353av35ggn0bitufukk2mom.apps.googleusercontent.com"
};

// Silence verbose/internal SDK connection logs (e.g., transient offline/retry messages in sandboxed iframe)
try {
  setLogLevel('silent');
} catch (_) {}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const dbId = firebaseConfig.firestoreDatabaseId;
export const auth = getAuth(app);

// Use initializeFirestore with memoryLocalCache to prevent IndexedDB closing/hidden errors in iframes and preview environments
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    ignoreUndefinedProperties: true,
  }, dbId);
} catch (e) {
  try {
    firestoreDb = getFirestore(app, dbId);
  } catch (err2) {
    firestoreDb = getFirestore(app);
  }
}

export const db = firestoreDb;

// Safe non-blocking connection check with graceful offline fallback
async function testFirestoreConnection() {
  try {
    if (typeof window !== 'undefined' && db) {
      await getDoc(doc(db, 'settings', 'general')).catch(() => {});
    }
  } catch (error: any) {
    // Non-blocking fallback
  }
}

if (typeof window !== 'undefined') {
  // Global suppression for benign IndexedDB closing/hidden browser iframe events and transient connection retries
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event?.reason?.message || String(event?.reason || '');
    const code = event?.reason?.code;
    if (
      msg.includes('Database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('Could not reach Cloud Firestore backend') ||
      msg.includes('unavailable') ||
      code === 'unavailable' ||
      event?.reason?.name === 'InvalidStateError'
    ) {
      event.preventDefault();
    }
  });

  testFirestoreConnection().catch(() => {});
}

export default app;


