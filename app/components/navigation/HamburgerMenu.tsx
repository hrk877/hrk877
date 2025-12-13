"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

const MENU_ITEMS = [
    { label: "HAND", href: "/hand" },
    { label: "SHOP", href: "/shop" },
    {
        label: "GAME",
        children: [
            { label: "SPIN", href: "/spin" },
        ]
    },
    {
        label: "SNS",
        children: [
            { label: "LINE", href: "https://lin.ee/CYLzSSE", external: true },
            { label: "INSTAGRAM", href: "https://www.instagram.com/877hand/", external: true },
        ]
    },
    { label: "hrk.877", href: "/" },
    { label: "CONTACT", href: "mailto:877hand@gmail.com", external: true },
]

export default function HamburgerMenu() {
    const [isOpen, setIsOpen] = useState(false)
    const [currentView, setCurrentView] = useState<"MAIN" | "GAME" | "SNS">("MAIN")

    // Dynamic Theme Color for Mobile Status Bar
    useEffect(() => {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]')
        if (isOpen) {
            metaThemeColor?.setAttribute("content", "#000000")
        } else {
            metaThemeColor?.setAttribute("content", "#FAC800")
        }
        return () => {
            if (!isOpen) metaThemeColor?.setAttribute("content", "#FAC800")
        }
    }, [isOpen])

    const toggleMenu = () => {
        if (isOpen) {
            // Reset view when closing
            setTimeout(() => setCurrentView("MAIN"), 200)
        } else {
            setCurrentView("MAIN")
        }
        setIsOpen(!isOpen)
    }

    // Helper to get items for current view
    const getVisibleItems = () => {
        switch (currentView) {
            case "GAME":
                return [
                    { label: "SPIN", href: "/spin" },
                    { label: "BACK", action: () => setCurrentView("MAIN") }
                ]
            case "SNS":
                return [
                    { label: "LINE", href: "https://lin.ee/CYLzSSE", external: true },
                    { label: "INSTAGRAM", href: "https://www.instagram.com/877hand/", external: true },
                    { label: "BACK", action: () => setCurrentView("MAIN") }
                ]
            default:
                return MENU_ITEMS
        }
    }

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={toggleMenu}
                className="fixed top-12 left-6 z-[101] p-4 -ml-4 -mt-4 focus:outline-none mix-blend-difference text-[#FAC800] group"
                aria-label="Toggle Menu"
            >
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
                        exit={{ opacity: 0, transition: { duration: 0.2 } }}
                        className="fixed inset-0 z-[100] bg-black flex items-center justify-center h-dvh overscroll-none touch-none pointer-events-auto"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <nav className="flex flex-col items-center justify-center w-full px-4 min-h-[50vh]">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentView}
                                    initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                    className="flex flex-col items-center gap-8"
                                >
                                    {getVisibleItems().map((item: any) => (
                                        <div key={item.label}>
                                            {item.children ? (
                                                // Trigger for Submenu (Drill down)
                                                <button
                                                    onClick={() => setCurrentView(item.label as any)}
                                                    className="text-2xl md:text-3xl font-serif font-light tracking-[0.2em] text-[#FAC800] hover:tracking-[0.3em] hover:text-white transition-all duration-500"
                                                >
                                                    {item.label}
                                                </button>
                                            ) : item.action ? (
                                                // Back Button
                                                <button
                                                    onClick={item.action}
                                                    className="text-sm md:text-base font-serif font-light tracking-[0.2em] text-[#FAC800]/50 hover:text-[#FAC800] hover:tracking-[0.3em] transition-all duration-500 mt-4"
                                                >
                                                    {item.label}
                                                </button>
                                            ) : item.external ? (
                                                // External Link
                                                <a
                                                    href={item.href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={toggleMenu}
                                                    className="text-2xl md:text-3xl font-serif font-light tracking-[0.2em] text-[#FAC800] hover:tracking-[0.3em] hover:text-white transition-all duration-500"
                                                >
                                                    {item.label}
                                                </a>
                                            ) : (
                                                // Internal Link
                                                <Link
                                                    href={item.href!}
                                                    onClick={toggleMenu}
                                                    className="text-2xl md:text-3xl font-serif font-light tracking-[0.2em] text-[#FAC800] hover:tracking-[0.3em] hover:text-white transition-all duration-500"
                                                >
                                                    {item.label}
                                                </Link>
                                            )}
                                        </div>
                                    ))}
                                </motion.div>
                            </AnimatePresence>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.3 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="absolute bottom-12 text-xs font-mono tracking-[0.3em] text-white pointer-events-none"
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
