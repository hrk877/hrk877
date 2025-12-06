"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { signInWithEmailAndPassword } from "firebase/auth"
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
                        <h2 className="text-2xl font-serif mb-6 text-center">Admin Access</h2>
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
