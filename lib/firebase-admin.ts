import * as admin from "firebase-admin";

if (!admin.apps.length) {
    try {
        const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.GA_PRIVATE_KEY)
            ? (process.env.FIREBASE_PRIVATE_KEY || process.env.GA_PRIVATE_KEY)!.replace(/\\n/g, '\n')
            : undefined;

        if (privateKey && (process.env.FIREBASE_CLIENT_EMAIL || process.env.GA_CLIENT_EMAIL)) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || process.env.GA_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
            console.log("Firebase Admin initialized successfully");
        } else {
            console.warn("Firebase Admin: Missing environment variables, skipping initialization");
        }
    } catch (error) {
        console.error("Firebase Admin initialization error:", error);
    }
}

// Function-based access to DB to avoid crashes during build if and when not needed
export const getAdminDb = () => {
    if (!admin.apps.length) return null;
    return admin.firestore();
};

export const getAdminAuth = () => {
    if (!admin.apps.length) return null;
    return admin.auth();
};

// Legacy exports for existing code (will work if initialized)
export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminAuth = admin.apps.length ? admin.auth() : null;
