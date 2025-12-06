"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, Banana } from "lucide-react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"

const Letter = ({ onBack }: { onBack: () => void }) => {
    const [message, setMessage] = useState("")
    const [isSent, setIsSent] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSend = async () => {
        if (!message.trim() || !db) return
        setLoading(true)
        try {
            const lettersRef = collection(db, "artifacts", appId, "public", "data", "letters")
            await addDoc(lettersRef, {
                message,
                to: "hrk.877",
                createdAt: serverTimestamp(),
                isAnonymous: true,
            })

            setIsSent(true)
        } catch (e) {
            console.error("Failed to send letter", e)
            setIsSent(true)
        }
        setLoading(false)
    }

    if (isSent) {
        return (
            <div className="min-h-screen bg-[#FAC800] text-black flex flex-col items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="text-center"
                >
                    <Banana size={96} className="mx-auto mb-8 text-black opacity-10" />
                    <h2 className="text-4xl md:text-5xl font-serif mb-6">Received.</h2>
                    <p className="font-mono text-sm md:text-xs tracking-widest opacity-60">YOUR WORDS HAVE TRAVELED.</p>
                    <button
                        onClick={() => {
                            setIsSent(false)
                            setMessage("")
                        }}
                        className="mt-12 text-sm font-mono underline opacity-40 hover:opacity-100 transition-opacity"
                    >
                        WRITE ANOTHER
                    </button>
                    <button
                        onClick={onBack}
                        className="block mx-auto mt-6 text-sm font-mono opacity-30 hover:opacity-100 transition-opacity"
                    >
                        BACK HOME
                    </button>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAC800] text-black p-4 md:p-6 pt-24 md:pt-32 pb-20 flex flex-col">
            <div className="w-full max-w-2xl mx-auto relative flex-1 flex flex-col">
                <div className="mb-8 md:mb-12 border-b border-black pb-6 relative">
                    <button
                        onClick={onBack}
                        className="absolute -top-12 left-0 font-mono text-xs opacity-50 hover:opacity-100 flex items-center gap-2"
                    >
                        <ChevronLeft size={16} /> BACK HOME
                    </button>
                    <span className="font-mono text-sm md:text-xs tracking-[0.3em] opacity-40 block mb-4">ANONYMOUS MESSAGE</span>
                    <h1 className="text-7xl md:text-9xl font-serif font-thin leading-none">LETTER</h1>
                </div>

                <div className="flex-1 flex flex-col">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative flex-1">
                        <div
                            className="absolute inset-0 pointer-events-none opacity-5"
                            style={{ backgroundImage: "linear-gradient(transparent 95%, #000 95%)", backgroundSize: "100% 3rem" }}
                        />

                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="letter-input w-full min-h-[40vh] bg-transparent focus:outline-none placeholder:text-black/20"
                            autoFocus
                        />
                    </motion.div>

                    <div className="mt-8 flex flex-row justify-between items-center gap-4 md:gap-6">
                        <span className="font-mono text-sm md:text-[10px] opacity-30 tracking-widest">{message.length} CHARS</span>
                        <button
                            onClick={handleSend}
                            disabled={!message.trim() || loading}
                            className="group relative px-8 py-4 overflow-hidden border border-black rounded-full hover:border-black transition-colors disabled:opacity-20 disabled:hover:border-black/10 touch-manipulation active:scale-95"
                        >
                            <span className="relative z-10 font-mono text-sm md:text-xs tracking-[0.2em] group-hover:text-white transition-colors duration-500">
                                {loading ? "SEALING..." : "SEND LETTER"}
                            </span>
                            <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Letter
