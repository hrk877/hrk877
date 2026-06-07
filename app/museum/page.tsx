import type { Metadata } from "next"
import Museum from "../components/pages/Museum"

export const metadata: Metadata = {
    title: "MUSEUM",
    description:
        "877hand（BANANAHAND）のミュージアム。バナナにまつわるアート・知識・物語を体験できるデジタルミュージアム。",
    alternates: {
        canonical: "https://877hand.vercel.app/museum",
    },
    openGraph: {
        title: "MUSEUM | 877hand",
        description:
            "877hand（BANANAHAND）のミュージアム。バナナにまつわるアート・知識・物語を体験できるデジタルミュージアム。",
        url: "https://877hand.vercel.app/museum",
    },
}

export default function MuseumPage() {
    return <Museum />
}
