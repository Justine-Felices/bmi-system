import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  Timestamp, 
  deleteDoc,
  getDocFromServer,
  collectionGroup,
  where,
  updateDoc
} from 'firebase/firestore';

// Prioritize environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
};

const rawDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID?.trim();
// Normalize "default" to "(default)" which is what the SDK expects for the primary database
const firestoreDatabaseId = (rawDatabaseId && rawDatabaseId !== "" && rawDatabaseId !== "default") 
  ? rawDatabaseId 
  : '(default)';

// Check if config is missing
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.appId
);

// Log configuration status (masked for safety)
if (typeof window !== 'undefined') {
  console.log('Firebase Configuration Status:', {
    apiKey: firebaseConfig.apiKey ? '✅ Set' : '❌ Missing',
    projectId: firebaseConfig.projectId ? `✅ Set (${firebaseConfig.projectId})` : '❌ Missing',
    appId: firebaseConfig.appId ? '✅ Set' : '❌ Missing',
    databaseId: firestoreDatabaseId
  });
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = firestoreDatabaseId === '(default)' 
  ? getFirestore(app) 
  : getFirestore(app, firestoreDatabaseId);

/**
 * Tests the connection to Firestore.
 * If it fails with "the client is offline", the configuration is likely incorrect.
 */
export async function testFirestoreConnection() {
  if (!isFirebaseConfigured) return { success: false, error: 'Missing environment variables' };
  try {
    // Try to fetch a non-existent doc from a test collection to verify connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    return { success: true };
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      return { success: false, error: 'the client is offline' };
    }
    // Other errors (like permission denied) actually mean we ARE connected
    return { success: true };
  }
}

export { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  deleteDoc,
  collectionGroup,
  where,
  updateDoc
};
export type { User };
