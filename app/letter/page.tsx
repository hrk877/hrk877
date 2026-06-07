import type { Metadata } from "next"
import Letter from "../components/pages/Letter"

export const metadata: Metadata = {
    title: "LETTER",
    description:
        "877hand（BANANAHAND）へ手紙を送ろう。バナナブランドとつながる、アナログな温もりのあるレター体験。",
    alternates: {
        canonical: "https://877hand.vercel.app/letter",
    },
    openGraph: {
        title: "LETTER | 877hand",
        description:
            "877hand（BANANAHAND）へ手紙を送ろう。バナナブランドとつながる、アナログな温もりのあるレター体験。",
        url: "https://877hand.vercel.app/letter",
    },
}

export default function LetterPage() {
    return <Letter />
}
