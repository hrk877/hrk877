"use client"

import { useRef } from "react"
import HamburgerMenu from "../components/navigation/HamburgerMenu"

export default function BitInstrument() {
    const frame = useRef<HTMLIFrameElement>(null)
    const menuOpen = useRef(false)

    return (
        <>
        <iframe
            ref={frame}
            src="/experiments/bit-instrument/index.html?v=3"
            title="877hand MUSIC"
            allow="autoplay"
            className="fixed inset-0 h-dvh w-full border-0 bg-[#f9c70d]"
            onLoad={() => { if (!menuOpen.current) frame.current?.contentWindow?.focus() }}
        />
        <HamburgerMenu
            color="#17220c"
            themeColor="#f9c70d"
            onToggle={(open) => {
                menuOpen.current = open
                if (!open) frame.current?.contentWindow?.focus()
            }}
        />
        </>
    )
}
