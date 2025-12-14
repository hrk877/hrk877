"use server"
// Force rebuild for env update

import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER_NEW,
        pass: process.env.GMAIL_APP_PASSWORD_NEW,
    },
})

export async function sendEmail(message: string) {
    if (!process.env.GMAIL_USER_NEW || !process.env.GMAIL_APP_PASSWORD_NEW) {
        console.error("Missing Gmail credentials")
        return { success: false, error: "Configuration Error" }
    }

    try {
        console.log("Sending email as:", process.env.GMAIL_USER_NEW) // Debug log
        await transporter.sendMail({
            from: process.env.GMAIL_USER_NEW,
            to: "877hand@gmail.com",
            subject: "New Anonymous Letter from hrk.877",
            text: `You received a new anonymous letter:\n\n${message}`,
        })
        return {
            success: true,
            sender: process.env.GMAIL_USER_NEW,
            pwdPrefix: process.env.GMAIL_APP_PASSWORD_NEW?.substring(0, 2)
        }
    } catch (error) {
        console.error("Error sending email:", error)
        return { success: false, error: "Failed to send email" }
    }
}
