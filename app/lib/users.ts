import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function getAllUserEmails(): Promise<string[]> {
    try {
        const usersRef = collection(db, "users");
        // Query users where email is not null
        const q = query(usersRef, where("email", "!=", null));
        const querySnapshot = await getDocs(q);

        const emails: string[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Ensure they have an email AND are not anonymous (though the query checks for non-null email, isAnonymous check is safer for logic)
            if (data.email && !data.isAnonymous) {
                emails.push(data.email);
            }
        });

        return emails;
    } catch (error) {
        console.error("Error fetching user emails:", error);
        return [];
    }
}
