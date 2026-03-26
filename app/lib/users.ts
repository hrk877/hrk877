import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const EXCLUDED_EMAILS = [
    "miso.blye17@gmail.com"
];

export async function getAllUserEmails(): Promise<string[]> {
    if (!db) return []
    try {
        const usersRef = collection(db, "users");
        // Query users where email is not null
        const q = query(usersRef, where("email", "!=", null));
        const querySnapshot = await getDocs(q);

        const emails: string[] = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // Ensure they have an email AND are not anonymous
            // AND the email is not in the excluded list
            if (data.email && !data.isAnonymous && !EXCLUDED_EMAILS.includes(data.email)) {
                emails.push(data.email);
            }
        });

        return emails;
    } catch (error) {
        console.error("Error fetching user emails:", error);
        return [];
    }
}
