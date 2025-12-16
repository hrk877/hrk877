
"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { auth } from "@/lib/firebase"
import TermsModal from "./TermsModal"

const LoginModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [hasAgreed, setHasAgreed] = useState(false)
    const [showTerms, setShowTerms] = useState(false)
    const safeToClose = useRef(false)

    useEffect(() => {
        if (isOpen) {
            safeToClose.current = false
            const timer = setTimeout(() => {
                safeToClose.current = true
            }, 300)
            return () => clearTimeout(timer)
        } else {
            // Reset state when closed
            setHasAgreed(false)
            setShowTerms(false)
        }
    }, [isOpen])

    return (
        <AnimatePresence>
            {showTerms && <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />}

            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={() => {
                        if (safeToClose.current) onClose()
                    }}
                >
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="bg-[#FAFAFA] w-full max-w-md shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 md:p-12 flex flex-col items-center">
                            <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 transition-colors">
                                <X size={24} />
                            </button>

                            <h2 className="text-3xl font-serif mb-8 text-center">Login</h2>

                            {/* Terms Agreement */}
                            <div className="w-full mb-6 flex items-start gap-3">
                                <div className="relative flex items-center h-5 mt-1">
                                    <input
                                        id="terms-checkbox"
                                        type="checkbox"
                                        checked={hasAgreed}
                                        onChange={(e) => setHasAgreed(e.target.checked)}
                                        className="w-4 h-4 border-black text-black focus:ring-black cursor-pointer accent-black bg-transparent rounded-none"
                                    />
                                </div>
                                <label htmlFor="terms-checkbox" className="font-mono text-xs text-gray-600 leading-relaxed select-none cursor-pointer">
                                    I agree to the <span className="underline hover:text-black transition-colors" onClick={(e) => {
                                        e.preventDefault()
                                        setShowTerms(true)
                                    }}>Terms of Service</span> and Privacy Policy.
                                </label>
                            </div>

                            <button
                                onClick={async () => {
                                    if (!hasAgreed) return // Safety check
                                    setLoading(true)
                                    try {
                                        const provider = new GoogleAuthProvider()
                                        await signInWithPopup(auth, provider)
                                        // The AuthProvider will handle the state update
                                        // onClose is called by parent or logic here
                                        onClose()
                                    } catch (e) {
                                        console.error(e)
                                        setError("Login Failed")
                                    }
                                    setLoading(false)
                                }}
                                disabled={loading || !hasAgreed}
                                className={`w-full py-4 px-6 font-mono text-base md:text-sm tracking-widest transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2
                                    ${loading || !hasAgreed
                                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        : "bg-black text-[#FAC800] hover:bg-[#333]"}`}
                            >
                                {loading ? "CONNECTING..." : "SIGN IN WITH GOOGLE"}
                            </button>

                            {error && (
                                <p className="mt-4 text-red-500 font-mono text-xs">{error}</p>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default LoginModal
