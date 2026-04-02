import * as admin from "firebase-admin";

if (!admin.apps.length) {
    try {
        const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.GA_PRIVATE_KEY)
            ? (process.env.FIREBASE_PRIVATE_KEY || process.env.GA_PRIVATE_KEY)!.replace(/\\n/g, '\n')
            : undefined;

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL || process.env.GA_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
        console.log("Firebase Admin initialized successfully");
    } catch (error) {
        console.error("Firebase Admin initialization error:", error);
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
