"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

const MENU_ITEMS = [
    { label: "HAND", href: "/hand" },
    { label: "SHOP", href: "/shop" },
    { label: "SPIN", href: "/spin" },
    { label: "LINE", href: "https://lin.ee/CYLzSSE", external: true },
    { label: "HOME", href: "/" },
]

export default function HamburgerMenu() {
    const [isOpen, setIsOpen] = useState(false)

    // Dynamic Theme Color for Mobile Status Bar
    useEffect(() => {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]')
        if (isOpen) {
            metaThemeColor?.setAttribute("content", "#000000")
        } else {
            metaThemeColor?.setAttribute("content", "#FAC800")
        }
        // Cleanup on unmount not strictly necessary as page change handles it, 
        // but good practice to revert if we were navigating away? 
        // Actually, we want it yellow on /hand.
        return () => {
            if (!isOpen) metaThemeColor?.setAttribute("content", "#FAC800")
        }
    }, [isOpen])

    const toggleMenu = () => setIsOpen(!isOpen)

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={toggleMenu}
                className="fixed top-12 left-6 z-[60] p-4 -ml-4 -mt-4 focus:outline-none mix-blend-difference text-[#FAC800] group"
                aria-label="Toggle Menu"
            >
                {/* 
                   Refined Icon: 
                   - Thinner lines (h-[1px])
                   - Wider gap for elegance
                   - Perfect Center X rotation
                */}
                <div className="flex flex-col gap-[6px] w-8 items-center justify-center">
                    <motion.div
                        animate={isOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                        className="w-full h-[1px] bg-current origin-center"
                    />
                    <motion.div
                        animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
                        className="w-full h-[1px] bg-current"
                    />
                    <motion.div
                        animate={isOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                        className="w-full h-[1px] bg-current origin-center"
                    />
                </div>
            </button>

            {/* Menu Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.3 } }}
                        className="fixed inset-0 z-[55] bg-black flex items-center justify-center h-dvh overscroll-none touch-none"
                    >
                        <nav className="flex flex-col items-center gap-10">
                            {MENU_ITEMS.map((item, index) => (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: 10, filter: "blur(5px)" }}
                                    transition={{
                                        delay: index * 0.05,
                                        duration: 0.6,
                                        ease: [0.22, 1, 0.36, 1]
                                    }}
                                >
                                    {item.external ? (
                                        <a
                                            href={item.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={toggleMenu}
                                            className="text-5xl md:text-7xl font-serif font-thin tracking-[0.1em] text-[#FAC800] hover:text-white transition-all duration-500 hover:scale-110 hover:tracking-[0.15em]"
                                        >
                                            {item.label}
                                        </a>
                                    ) : (
                                        <Link
                                            href={item.href}
                                            onClick={toggleMenu}
                                            className="text-5xl md:text-7xl font-serif font-thin tracking-[0.1em] text-[#FAC800] hover:text-white transition-all duration-500 hover:scale-110 hover:tracking-[0.15em]"
                                        >
                                            {item.label}
                                        </Link>
                                    )}
                                </motion.div>
                            ))}

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.3 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.4, duration: 1 }}
                                className="absolute bottom-12 text-xs font-mono tracking-[0.3em] text-white"
                            >
                                HRK877 COLLECTION
                            </motion.div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
