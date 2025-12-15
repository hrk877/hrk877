
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { sendBroadcastEmail } from "@/app/actions/email"

const SITE_URL = "https://877hand.vercel.app"

export const notifyCommunity = async (type: 'banana' | 'museum' | 'journal', _content: string) => {
    try {
        // 1. Fetch all users with emails
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("email", "!=", null))
        const querySnapshot = await getDocs(q)

        const recipients: string[] = []
        querySnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.email && !data.isAnonymous) {
                recipients.push(data.email)
            }
        })

        if (recipients.length === 0) {
            console.log("No recipients found for notification")
            return
        }

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
${SITE_URL}/hand`
                break
            case 'museum':
                subject = "New Art Has Arrived 🍌"
                message = `
新しいコレクションが追加されました。
静謐な空間で、その作品はあなたを待っています。

Visit the Museum
${SITE_URL}/museum`
                break
            case 'journal':
                subject = "New Journal Entry Published 🍌"
                message = `
新しい記録が綴られました。
行間にある静けさを、共に味わってみませんか。

Read the Journal
${SITE_URL}`
                break
        }

        // 3. Send Broadcast
        await sendBroadcastEmail(recipients, subject, message)
        console.log(`Notification sent to ${recipients.length} users`)

    } catch (error) {
        console.error("Failed to notify community:", error)
    }
}
