import type { Metadata } from "next"
import BananaAI from "../components/pages/BananaAI"

export const metadata: Metadata = {
    title: "BANANA AI",
    description:
        "877hand（BANANAHAND）のAIコンテンツ。バナナについてAIと対話できるインタラクティブな体験。",
    alternates: {
        canonical: "https://877hand.com/ai",
    },
    openGraph: {
        title: "BANANA AI | 877hand",
        description:
            "877hand（BANANAHAND）のAIコンテンツ。バナナについてAIと対話できるインタラクティブな体験。",
        url: "https://877hand.com/ai",
    },
}

export default function BananaAIPage() {
    return <BananaAI />
}
