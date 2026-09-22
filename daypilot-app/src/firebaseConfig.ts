import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

export type FirebaseWebConfig = {
  apiKey: string
  authDomain: string
  databaseURL: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId?: string
}

// Firebase web configuration is intentionally client-side. Keep server-only
// credentials (service-account keys, SMTP passwords, OpenAI keys, etc.) out of
// this file and out of the browser bundle.
export const firebaseConfig: FirebaseWebConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAeLqSPOhnI8wc0So8ugLVzGcxLqPmOpwA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'daypilot-8a3a2.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://daypilot-8a3a2-default-rtdb.firebaseio.com/',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'daypilot-8a3a2',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'daypilot-8a3a2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '77318434331',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:77318434331:web:28a234a6ca22bf05f052be',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-GQHDCFDE89',
}

const app = initializeApp(firebaseConfig)

// DayPilot now points at the new Firebase Realtime Database instead of the
// previous Firestore configuration.
export const db = getDatabase(app)
