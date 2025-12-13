"use client"

import HamburgerMenu from "../components/navigation/HamburgerMenu"

export default function ShopPage() {
    return (
        <div className="w-full h-dvh bg-[#FAC800] overflow-hidden fixed inset-0 touch-none flex flex-col items-center justify-center">
            <HamburgerMenu />

            <h1 className="font-black text-4xl md:text-6xl tracking-tighter text-black opacity-80">
                COMING SOON
            </h1>
        </div>
    )
}
