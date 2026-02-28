import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// ============================================
// Firebase Configuration
// ============================================

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
let app: any;
let auth: any;
let db: any;
let storage: any;

const isConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId;

if (isConfigValid) {
    try {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
        auth = getAuth(app)
        db = getFirestore(app)
        storage = getStorage(app)
    } catch (error) {
        console.error("Firebase initialization failed:", error)
    }
} else {
    // Only warn in development or if not in build process to reduce clutter
    if (process.env.NODE_ENV !== 'production') {
        console.warn("Firebase configuration is incomplete. Some features may not work.")
    }
}

// Firestoreのパスに使用するApp ID (プロジェクト内の共通識別子として使用)
// .env.localに設定されているか確認
const appIdValue = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "hrk877-default"

export { app, auth, db, storage, appIdValue as appId }
