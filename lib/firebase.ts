import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

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
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

// Firestoreのパスに使用するApp ID
const appId = "1:977524735776:web:d76bfaaa526cc96b366145"

export { app, auth, db, storage, appId }
