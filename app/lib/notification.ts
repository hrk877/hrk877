
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
                message = `静寂の空間に、またひとつ、誰かの思考がバナナとなってこの場所に舞い降りました。

それは誰かの何気ない日常の欠片かもしれないし、
あるいは、あなたにとって重要なメッセージを含んでいるかもしれません。

バナナの皮をむくように、その言葉に触れてみてください。

[Check the Banana]
${SITE_URL}/hand`
                break
            case 'museum':
                subject = "New Art Exhibition Open 🍌"
                message = `その空間は、常に静かに変化を続けています。

ミュージアムに新しいコレクションが追加されました。
デジタルの額縁の中で、その作品は誰かの眼差しを待っています。

日常の喧騒を離れ、少しだけアートに触れる時間を。

[Visit the Museum]
${SITE_URL}/museum`
                break
            case 'journal':
                subject = "New Journal Entry Published 🍌"
                message = `思考の記録が、新たに綴られました。

言葉は時に、形あるものよりも鮮明に、その瞬間の空気を閉じ込めます。
その行間にある静けさを、共に味わってみませんか。

[Read the Journal]
${SITE_URL}/letter`
                break
        }

        // 3. Send Broadcast
        await sendBroadcastEmail(recipients, subject, message)
        console.log(`Notification sent to ${recipients.length} users`)

    } catch (error) {
        console.error("Failed to notify community:", error)
    }
}
