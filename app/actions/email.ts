"use server"

import { Resend } from "resend"

const FROM_ADDRESS = "877hand <hello@877hand.com>"

export async function sendEmail(message: string) {
    if (!process.env.RESEND_API_KEY) {
        console.error("Missing Resend API key")
        return { success: false, error: "Configuration Error" }
    }

    try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const { error } = await resend.emails.send({
            from: FROM_ADDRESS,
            to: "877hand@gmail.com",
            subject: "New Anonymous Letter from hrk.877",
            text: `You received a new anonymous letter:\n\n${message}`,
        })
        if (error) {
            console.error("Error sending email:", error)
            return { success: false, error: "Failed to send email" }
        }
        return {
            success: true
        }
    } catch (error) {
        console.error("Error sending email:", error)
        return { success: false, error: "Failed to send email" }
    }
}

export async function sendBroadcastEmail(bcc: string[], subject: string, message: string) {
    if (!process.env.RESEND_API_KEY) {
        console.error("Missing Resend API key")
        return { success: false, error: "Configuration Error" }
    }

    try {
        console.log(`Sending broadcast to ${bcc.length} recipients`)
        const resend = new Resend(process.env.RESEND_API_KEY)
        const { error } = await resend.emails.send({
            from: FROM_ADDRESS,
            to: "hello@877hand.com", // Send to self
            bcc: bcc, // Blind copy all users
            subject: subject,
            text: message,
        })
        if (error) {
            console.error("Error sending broadcast:", error)
            return { success: false, error: "Failed to send broadcast" }
        }
        return { success: true }
    } catch (error) {
        console.error("Error sending broadcast:", error)
        return { success: false, error: "Failed to send broadcast" }
    }
}

import { getAllUserEmails } from "@/app/lib/users"
import { adminDb } from "@/lib/firebase-admin"

export async function sendCustomBroadcast(subject: string, message: string) {
    try {
        // Fetch all users with emails using Admin SDK to bypass Firestore rules
        if (!adminDb) {
            console.warn("adminDb not initialized, falling back to empty recipients");
            return { success: false, error: "Database not initialized" };
        }
        const usersSnapshot = await adminDb.collection("users").get();
        const recipients: string[] = [];
        const EXCLUDED_EMAILS = ["miso.blye17@gmail.com", "uratamomona@gmail.com"];

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.email && !data.isAnonymous && !EXCLUDED_EMAILS.includes(data.email)) {
                recipients.push(data.email);
            }
        });

        if (recipients.length === 0) {
            console.log("No recipients found for custom broadcast")
            return { success: false, error: "No recipients found" }
        }

        return await sendBroadcastEmail(recipients, subject, message)
    } catch (error) {
        console.error("Custom broadcast failed:", error)
        return { success: false, error: "Failed to send custom broadcast" }
    }
}
