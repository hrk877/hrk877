"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send } from "lucide-react"
import { sendCustomBroadcast } from "@/app/actions/email"

const BroadcastModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [subject, setSubject] = useState("")
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState("")

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!subject.trim() || !message.trim()) {
            setStatus("Error: Subject and Message are required")
            return
        }

        if (!confirm("Are you sure you want to send this email to ALL users?")) {
            return
        }

        setLoading(true)
        setLoading(true)
        setStatus("")

        try {
            const result = await sendCustomBroadcast(subject, message)
            if (result.success) {
                // Success - close after delay
                // Optional: Clear form or close after delay
                setTimeout(() => {
                    setSubject("")
                    setMessage("")
                    setStatus("")
                    onClose()
                }, 1500)
            } else {
                setStatus(`Error: ${result.error}`)
            }
        } catch (error) {
            setStatus("Error: Unexpected failure")
        } finally {
            setLoading(false)
        }
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
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white p-6 md:p-12 w-full max-w-lg relative flex flex-col shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 transition-colors rounded-full">
                            <X size={20} />
                        </button>

                        <h2 className="text-xl md:text-2xl font-serif mb-8 text-center uppercase tracking-widest text-black border-b border-black/10 pb-4">
                            BROADCAST EMAIL
                        </h2>

                        <form onSubmit={handleSend} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-mono text-gray-500 uppercase">Subject</label>
                                <input
                                    type="text"
                                    placeholder="Enter subject line..."
                                    className="w-full p-3 bg-gray-50 border border-gray-200 focus:outline-none focus:border-black transition-colors font-serif text-lg"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-mono text-gray-500 uppercase">Message</label>
                                <textarea
                                    placeholder="Type your message here..."
                                    className="w-full p-3 bg-gray-50 border border-gray-200 focus:outline-none focus:border-black transition-colors font-mono text-sm min-h-[200px] resize-none"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    disabled={loading}
                                />
                            </div>



                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-black text-[#FAC800] py-4 mt-2 font-mono text-sm tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 group shadow-lg"
                            >
                                {loading ? (
                                    "SENDING..."
                                ) : (
                                    <>
                                        SEND BROADCAST <Send size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        {status && status.startsWith("Error") && (
                            <div className="mt-4 p-3 rounded text-xs font-mono text-center bg-red-50 text-red-500">
                                {status}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default BroadcastModal
