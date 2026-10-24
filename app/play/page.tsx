import type { Metadata, Viewport } from "next"
import BitInstrument from "./BitInstrument"

export const metadata: Metadata = {
    title: "MUSIC — BIT INSTRUMENT",
    description: "タップやキーボードで、バナナの点群と電子音を奏でるインタラクティブアート。",
    alternates: { canonical: "/play" },
    openGraph: {
        title: "MUSIC — BIT INSTRUMENT | 877hand",
        description: "タップやキーボードで、バナナの点群と電子音を奏でる。",
        url: "/play",
    },
}

export const viewport: Viewport = { themeColor: "#f9c70d" }

export default function PlayPage() {
    return <BitInstrument />
}
