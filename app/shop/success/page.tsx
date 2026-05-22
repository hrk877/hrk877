"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import HamburgerMenu from "../../components/navigation/HamburgerMenu"

export default function ShopSuccessPage() {
    const [dots, setDots] = useState("")

    useEffect(() => {
        const interval = setInterval(() => {
            setDots((d) => (d.length >= 3 ? "" : d + "."))
        }, 400)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="w-full min-h-dvh bg-black flex flex-col items-center justify-center relative px-6">
            <HamburgerMenu color="#FAC800" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="text-center flex flex-col items-center gap-8 max-w-md"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    className="text-7xl"
                >
                    🍌
                </motion.div>

                <div>
                    <h1 className="text-4xl md:text-6xl font-serif font-thin text-[#FAC800] tracking-tight mb-4">
                        THANK YOU
                    </h1>
                    <p className="font-mono text-white/60 text-base md:text-sm tracking-widest">
                        ご購入いただきありがとうございます
                    </p>
                </div>

                <div className="border border-white/10 p-6 w-full text-left font-mono text-sm md:text-xs">
                    <p className="text-white/40 mb-2 tracking-widest">ORDER STATUS</p>
                    <p className="text-[#FAC800] tracking-widest">CONFIRMED ✓</p>
                    <p className="text-white/40 mt-4 leading-relaxed">
                        確認メールをご登録のアドレスに送信しました。
                        発送の準備ができ次第、追ってご連絡いたします。
                    </p>
                </div>

                <Link
                    href="/shop"
                    className="font-mono text-base md:text-sm tracking-[0.3em] text-black bg-[#FAC800] px-8 py-4 hover:bg-white transition-colors"
                >
                    BACK TO SHOP
                </Link>
            </motion.div>
        </div>
    )
}
