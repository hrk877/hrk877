import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getAnalytics, isSupported } from "firebase/analytics"

// ============================================
// Firebase Configuration
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyB-VjhkzjmebiWphe2PK9WuskqL2fLrLPg",
    authDomain: "hrk877-801a8.firebaseapp.com",
    projectId: "hrk877-801a8",
    storageBucket: "hrk877-801a8.firebasestorage.app",
    messagingSenderId: "977524735776",
    appId: "1:977524735776:web:d76bfaaa526cc96b366145",
    measurementId: "G-0MVZWEGNWC"
};

// Initialize Firebase
let app: any;
let auth: any;
let db: any;
let storage: any;
let analytics: any;

try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)

    // Analytics only runs in the browser
    if (typeof window !== "undefined") {
        isSupported().then(yes => {
            if (yes) analytics = getAnalytics(app)
        })
    }
} catch (error) {
    console.error("Firebase initialization failed:", error)
}

// Firestoreのパスに使用するApp ID
const appId = "1:977524735776:web:d76bfaaa526cc96b366145"

export { app, auth, db, storage, analytics, appId }
