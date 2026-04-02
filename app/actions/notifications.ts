"use server"

import { adminDb } from "@/lib/firebase-admin"
import { sendBroadcastEmail } from "@/app/actions/email"

const SITE_URL = "https://877hand.vercel.app"
const EXCLUDED_EMAILS = ["miso.blye17@gmail.com"]

export async function notifyCommunityServer(type: 'banana' | 'museum' | 'journal', _content: string) {
    try {
        console.log(`[Notification] Starting server-side notification for type: ${type}`);
        
        // 1. Fetch all users from Firestore (Admin privilege)
        const usersSnapshot = await adminDb.collection("users").get();
        const recipients: string[] = [];
        
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.email && !data.isAnonymous && !EXCLUDED_EMAILS.includes(data.email)) {
                recipients.push(data.email);
            }
        });

        if (recipients.length === 0) {
            console.log("[Notification] No valid recipients found");
            return { success: false, error: "No recipients" };
        }

        console.log(`[Notification] Found ${recipients.length} recipients. Constructing email...`);

        // 2. Construct Message
        let subject = ""
        let message = ""

        switch (type) {
            case 'banana':
                subject = "A New Banana Has Dropped 🍌"
                message = `
誰かの思考が、バナナとなって落ちてきました。
その言葉の欠片を、拾い上げてみてください。

Visit the 877hand
${SITE_URL}/finger`.trim()
                break
            case 'museum':
                subject = "New Art Has Arrived 🍌"
                message = `
新しいコレクションが追加されました。
静謐な空間で、その作品はあなたを待っています。

Visit the Museum
${SITE_URL}/museum`.trim()
                break
            case 'journal':
                subject = "New Journal Entry Published 🍌"
                message = `
新しい記録が綴られました。
行間にある静けさを、共に味わってみませんか。

Read the Journal
${SITE_URL}/journal`.trim()
                break
        }

        // 3. Send Broadcast
        const result = await sendBroadcastEmail(recipients, subject, message);
        console.log(`[Notification] Broadcast trigger result:`, result);
        
        return { success: true, count: recipients.length };

    } catch (error) {
        console.error("[Notification] Server-side notification failed:", error);
        return { success: false, error: String(error) };
    }
}
