"use client"

import { useEffect, useRef } from "react"
import HamburgerMenu from "../components/navigation/HamburgerMenu"

export default function BitInstrument() {
    const frame = useRef<HTMLIFrameElement>(null)
    const menuOpen = useRef(false)

    useEffect(() => {
        const elements = [document.documentElement, document.body]
        const previous = elements.map((element) => ({
            overflow: element.style.overflow,
            overscrollBehavior: element.style.overscrollBehavior,
        }))
        elements.forEach((element) => {
            element.style.overflow = "hidden"
            element.style.overscrollBehavior = "none"
        })
        return () => elements.forEach((element, index) => {
            element.style.overflow = previous[index].overflow
            element.style.overscrollBehavior = previous[index].overscrollBehavior
        })
    }, [])

    return (
        <div className="fixed inset-0 h-dvh w-full overflow-hidden overscroll-none touch-none bg-[#f9c70d]">
            <iframe
                ref={frame}
                src="/experiments/bit-instrument/index.html?v=4"
                title="877hand MUSIC"
                allow="autoplay"
                className="absolute inset-0 h-full w-full border-0 bg-[#f9c70d]"
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
        </div>
    )
}
