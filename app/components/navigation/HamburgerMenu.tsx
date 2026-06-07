"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useAuth } from "../providers/AuthProvider"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import LoginModal from "../modals/LoginModal"

const MENU_ITEMS = [
    { label: "HOME", href: "/" },
    { label: "JOURNAL", href: "/journal" },
    { label: "MUSEUM", href: "/museum" },
    { label: "SHOP", href: "/shop" },
    {
        label: "SNS",
        children: [
            { label: "INSTAGRAM", href: "https://www.instagram.com/877hand/", external: true },
            { label: "LINE", href: "https://lin.ee/CYLzSSE", external: true },
        ]
    },
    {
        label: "LAB",
        children: [
            { label: "AI", href: "/ai" },
            { label: "CAMERA", href: "/camera" },
            { label: "SPIN", href: "/spin" },
            { label: "MOON", href: "/moon" },
            { label: "HABIT", href: "/habit", isPrivate: true },
            { label: "RUNNING", href: "/training", isPrivate: true },
        ]
    },
    { label: "LETTER", href: "/letter" },
]

interface HamburgerMenuProps {
    color?: string
    onToggle?: (isOpen: boolean) => void
}

export default function HamburgerMenu({ color, onToggle }: HamburgerMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [currentView, setCurrentView] = useState<"MAIN" | "LAB" | "SNS">("MAIN")
    const { user } = useAuth()
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

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
        const nextState = !isOpen
        if (isOpen) {
            // Reset view when closing
            setTimeout(() => setCurrentView("MAIN"), 200)
        } else {
            setCurrentView("MAIN")
        }
        setIsOpen(nextState)
        onToggle?.(nextState)
    }

    // Helper to get items for current view
    const getVisibleItems = () => {
        switch (currentView) {
            case "LAB":
                const labItems = [
                    { label: "AI", href: "/ai" },
                    { label: "CAMERA", href: "/camera" },
                    { label: "SPIN", href: "/spin" },
                    { label: "MOON", href: "/moon" },
                    { label: "HABIT", href: "/habit", isPrivate: true },
                    { label: "RUNNING", href: "/training", isPrivate: true },
                    { label: "STATS", href: "/stats", isPrivate: true },
                    { label: "BACK", action: () => setCurrentView("MAIN") }
                ]
                // Hide private items if not logged in
                if (!user || user.isAnonymous) {
                    return labItems.filter((item) => !item.isPrivate)
                }
                return labItems
            case "SNS":
                return [
                    { label: "INSTAGRAM", href: "https://www.instagram.com/877hand/", external: true },
                    { label: "LINE", href: "https://lin.ee/CYLzSSE", external: true },
                    { label: "BACK", action: () => setCurrentView("MAIN") }
                ]
            default:
                // Filter top level items (though only LAB children are currently marked isPrivate)
                if (!user || user.isAnonymous) {
                    return MENU_ITEMS.filter((item: any) => !item.isPrivate)
                }
                return MENU_ITEMS
        }
    }

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={toggleMenu}
                style={{ color: isOpen ? "#FAC800" : color }}
                className={`absolute top-12 left-6 z-[101] p-4 -ml-4 -mt-4 focus:outline-none group ${
                    isOpen ? "" : (color ? "" : "mix-blend-difference text-[#FAC800]")
                }`}
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
                                                <button
                                                    onClick={() => setCurrentView(item.label as any)}
                                                    className="text-2xl md:text-3xl font-serif font-light tracking-[0.2em] text-[#FAC800] hover:tracking-[0.3em] hover:text-white transition-all duration-500"
                                                >
                                                    {item.label}
                                                </button>
                                            ) : item.action ? (
                                                <button
                                                    onClick={item.action}
                                                    className="text-sm md:text-base font-serif font-light tracking-[0.2em] text-[#FAC800]/50 hover:text-[#FAC800] hover:tracking-[0.3em] transition-all duration-500 mt-4"
                                                >
                                                    {item.label}
                                                </button>
                                            ) : item.external ? (
                                                <div className="relative flex items-center justify-center">
                                                    <a
                                                        href={item.href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={() => toggleMenu()}
                                                        className="text-2xl md:text-3xl font-serif font-light tracking-[0.2em] text-[#FAC800] hover:tracking-[0.3em] hover:text-white transition-all duration-500"
                                                    >
                                                        {item.label}
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="relative flex items-center justify-center">
                                                    <Link
                                                        href={item.href!}
                                                        onClick={toggleMenu}
                                                        className="text-2xl md:text-3xl font-serif font-light tracking-[0.2em] text-[#FAC800] hover:tracking-[0.3em] hover:text-white transition-all duration-500"
                                                    >
                                                        {item.label}
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </motion.div>
                            </AnimatePresence>

                        {/* Logout Button */}
                        {user && !user.isAnonymous && (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                onClick={() => signOut(auth)}
                                className="absolute bottom-12 text-xs font-mono tracking-[0.3em] text-white hover:opacity-50 transition-opacity"
                            >
                                LOGOUT
                            </motion.button>
                        )}
                    </nav>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Modals */}
            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        </>
    )
}
