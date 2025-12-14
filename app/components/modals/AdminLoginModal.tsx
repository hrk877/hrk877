"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"

const AdminLoginModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!auth) return
        setLoading(true)
        setError("")
        try {
            await signInWithEmailAndPassword(auth, email, password)
            onClose()
        } catch (err: any) {
            console.error("Error logging in", err)
            console.error("Error code:", err.code)
            console.error("Error message:", err.message)
            setError(err.message || "Authentication failed.")
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
                        exit={{ scale: 0.9 }}
                        className="bg-white p-8 md:p-12 w-full max-w-md relative flex flex-col items-center shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 transition-colors rounded-full">
                            <X size={20} />
                        </button>

                        <h2 className="text-2xl font-serif mb-8 text-center uppercase tracking-widest text-black">
                            Admin Login
                        </h2>

                        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
                            <input
                                type="email"
                                placeholder="Email"
                                className="w-full p-4 bg-gray-50 border border-gray-200 focus:outline-none focus:border-black transition-colors font-mono"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                className="w-full p-4 bg-gray-50 border border-gray-200 focus:outline-none focus:border-black transition-colors font-mono"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black text-[#FAC800] py-4 mt-4 font-mono text-sm tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 group shadow-lg"
                            >
                                {loading ? "CONNECTING..." : "ENTER"}
                            </button>
                        </form>

                        {error && (
                            <p className="mt-4 text-red-500 font-mono text-xs">{error}</p>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default AdminLoginModal
