"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { auth } from "@/lib/firebase"

const LoginModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!auth) {
            setError("Firebase not initialized.")
            return
        }
        setLoading(true)
        setError("")
        try {
            await signInWithEmailAndPassword(auth, email, password)
            onClose()
        } catch (err) {
            console.error("Error posting", err)
            setError("Authentication failed.")
        }
        setLoading(false)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="bg-white p-8 md:p-12 w-full max-w-md relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 transition-colors">
                            <X size={20} />
                        </button>
                        <h2 className="text-2xl font-serif mb-6 text-center">Login</h2>

                        <button
                            onClick={async () => {
                                setLoading(true)
                                try {
                                    const provider = new GoogleAuthProvider()
                                    await signInWithPopup(auth, provider)
                                    onClose()
                                } catch (e) {
                                    console.error(e)
                                    setError("Google Sign-In failed")
                                }
                                setLoading(false)
                            }}
                            className="w-full bg-[#4285F4] text-white py-3 mb-6 hover:bg-[#3367D6] transition-colors font-sans font-medium flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign in with Google
                        </button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-px bg-gray-200 flex-1" />
                            <span className="text-xs text-gray-400 font-mono">OR ADMIN</span>
                            <div className="h-px bg-gray-200 flex-1" />
                        </div>

                        <form onSubmit={handleLogin} className="flex flex-col gap-4">
                            <input
                                type="email"
                                placeholder="Email"
                                className="admin-input"
                                style={{ fontSize: "1.2rem" }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                className="admin-input"
                                style={{ fontSize: "1.2rem" }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            {error && <p className="text-red-500 text-xs font-mono">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading || !auth}
                                className="bg-black text-[#FAC800] py-3 mt-4 hover:bg-[#333] transition-colors font-mono text-sm tracking-widest disabled:opacity-50 active:scale-95 touch-manipulation"
                            >
                                {loading ? "CONNECTING..." : "ENTER"}
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default LoginModal
