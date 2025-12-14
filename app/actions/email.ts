"use server"

import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
})

export async function sendEmail(message: string) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.error("Missing Gmail credentials")
        return { success: false, error: "Configuration Error" }
    }

    try {
        console.log("Sending email as:", process.env.GMAIL_USER) // Debug log
        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: "877hand@gmail.com",
            subject: "New Anonymous Letter from hrk.877",
            text: `You received a new anonymous letter:\n\n${message}`,
        })
        return { success: true }
    } catch (error) {
        console.error("Error sending email:", error)
        return { success: false, error: "Failed to send email" }
    }
}
