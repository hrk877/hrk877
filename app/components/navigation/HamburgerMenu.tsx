"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useAuth } from "../providers/AuthProvider"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Settings } from "lucide-react"

import LoginModal from "../modals/LoginModal"
import AllowlistModal from "../modals/AllowlistModal"
import AccessDeniedModal from "../modals/AccessDeniedModal"

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
            { label: "HABIT", href: "/habit", restricted: true },
            { label: "SPIN", href: "/spin" },
            { label: "MOON", href: "/moon" },
            { label: "WEATHER", href: "/weather" },
        ]
    },
    { label: "LETTER", href: "/letter" },
]

interface HamburgerMenuProps {
    color?: string
}

export default function HamburgerMenu({ color }: HamburgerMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [currentView, setCurrentView] = useState<"MAIN" | "LAB" | "SNS">("MAIN")
    const { user, isAdmin, isWhitelisted } = useAuth()
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
    const [isAllowlistOpen, setIsAllowlistOpen] = useState(false)
    const [isAccessDeniedOpen, setIsAccessDeniedOpen] = useState(false)

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

    // Handle LINE Button Click
    const handleLineClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        // 1. Not Logged In OR Anonymous -> Open Access Denied Modal
        if (!user || user.isAnonymous) {
            setIsAccessDeniedOpen(true)
            return
        }

        // 2. Admin or Whitelisted -> Allowed
        if (isAdmin || isWhitelisted) {
            window.open("https://lin.ee/CYLzSSE", "_blank")
        } else {
            setIsAccessDeniedOpen(true)
        }
    }

    // Helper to get items for current view
    const getVisibleItems = () => {
        switch (currentView) {
            case "LAB":
                return [
                    { label: "AI", href: "/ai" },
                    { label: "HABIT", href: "/habit", restricted: true },
                    { label: "SPIN", href: "/spin" },
                    { label: "MOON", href: "/moon" },
                    { label: "WEATHER", href: "/weather" },
                    { label: "BACK", action: () => setCurrentView("MAIN") }
                ]
            case "SNS":
                return [
                    { label: "INSTAGRAM", href: "https://www.instagram.com/877hand/", external: true },
                    { label: "LINE", href: "https://lin.ee/CYLzSSE", external: true },
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
                style={{ color: color }}
                className={`absolute top-12 left-6 z-[101] p-4 -ml-4 -mt-4 focus:outline-none group ${color ? '' : 'mix-blend-difference text-[#FAC800]'
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
                                                <div className="relative flex items-center justify-center">
                                                    {item.label === "LINE" && (!isAdmin && !isWhitelisted) ? (
                                                        // RESTRICTED LINE BUTTON (No HREF to prevent preview)
                                                        <button
                                                            onClick={handleLineClick}
                                                            className="text-2xl md:text-3xl font-serif font-light tracking-[0.2em] text-[#FAC800] hover:tracking-[0.3em] hover:text-white transition-all duration-500"
                                                        >
                                                            {item.label}
                                                        </button>
                                                    ) : (
                                                        // NORMAL LINK (Authorized LINE or Other External)
                                                        <a
                                                            href={item.href}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => {
                                                                if (item.label !== "LINE") {
                                                                    toggleMenu()
                                                                }
                                                                // Authorized LINE uses native href behavior
                                                            }}
                                                            className="text-2xl md:text-3xl font-serif font-light tracking-[0.2em] text-[#FAC800] hover:tracking-[0.3em] hover:text-white transition-all duration-500"
                                                        >
                                                            {item.label}
                                                        </a>
                                                    )}
                                                    {/* Admin Gear Icon for LINE */}
                                                    {item.label === "LINE" && isAdmin && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setIsAllowlistOpen(true)
                                                            }}
                                                            className="absolute -right-10 top-1/2 -translate-y-1/2 text-[#FAC800] hover:text-white transition-colors"
                                                        >
                                                            <Settings size={20} />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : item.restricted && (!isAdmin && !isWhitelisted) ? (
                                                <button
                                                    onClick={() => setIsAccessDeniedOpen(true)}
                                                    className="text-2xl md:text-3xl font-serif font-light tracking-[0.2em] text-[#FAC800] hover:tracking-[0.3em] hover:text-white transition-all duration-500"
                                                >
                                                    {item.label}
                                                </button>
                                            ) : (
                                                // Internal Link
                                                <div className="relative flex items-center justify-center">
                                                    <Link
                                                        href={item.href!}
                                                        onClick={toggleMenu}
                                                        className="text-2xl md:text-3xl font-serif font-light tracking-[0.2em] text-[#FAC800] hover:tracking-[0.3em] hover:text-white transition-all duration-500"
                                                    >
                                                        {item.label}
                                                    </Link>

                                                    {/* Admin Gear Icon for HABIT */}
                                                    {item.label === "HABIT" && isAdmin && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                setIsAllowlistOpen(true)
                                                            }}
                                                            className="absolute -right-10 top-1/2 -translate-y-1/2 text-[#FAC800] hover:text-white transition-colors"
                                                        >
                                                            <Settings size={20} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </motion.div>
                            </AnimatePresence>

                            {/* Logout Button (Replaces Collection Text) */}
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
            <AllowlistModal isOpen={isAllowlistOpen} onClose={() => setIsAllowlistOpen(false)} />
            <AccessDeniedModal isOpen={isAccessDeniedOpen} onClose={() => setIsAccessDeniedOpen(false)} />
        </>
    )
}
