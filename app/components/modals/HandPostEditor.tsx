"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"

export interface HandPost {
    id: string
    content: string
    createdAt: number
}

const HandPostEditor = ({
    isOpen,
    onClose,
}: {
    isOpen: boolean
    onClose: () => void
}) => {
    const [content, setContent] = useState("")
    const [loading, setLoading] = useState(false)

    // Scroll lock
    useEffect(() => {
        if (isOpen) {
            const scrollY = window.scrollY
            document.body.style.position = "fixed"
            document.body.style.top = `-${scrollY}px`
            document.body.style.width = "100%"
            document.body.style.overflowY = "scroll"

            return () => {
                const scrollYStyle = document.body.style.top
                document.body.style.position = ""
                document.body.style.top = ""
                document.body.style.width = ""
                document.body.style.overflowY = ""
                window.scrollTo(0, parseInt(scrollYStyle || "0") * -1)
            }
        }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim() || !db) return

        setLoading(true)
        try {
            await addDoc(collection(db, "artifacts", appId, "public", "data", "banana_hand_posts"), {
                content,
                createdAt: serverTimestamp()
            })
            setContent("")
            onClose()
        } catch (error) {
            console.error("Error saving post:", error)
            alert("Failed to drop banana. Try again.")
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
                    className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-[#FAFAFA] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 md:p-12">
                            <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 transition-colors z-10">
                                <X size={24} />
                            </button>
                            <h2 className="text-3xl font-serif mb-8">New banana post</h2>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                                <div>
                                    <label className="block text-xs font-mono opacity-40 mb-2 tracking-widest">MESSAGE</label>
                                    <textarea
                                        placeholder="Write something to drop a banana..."
                                        className="admin-textarea min-h-[200px]"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-black text-[#FAC800] py-4 px-6 mt-4 hover:bg-[#333] transition-colors font-mono text-base md:text-sm tracking-widest active:scale-95 touch-manipulation disabled:opacity-50"
                                >
                                    {loading ? "DROPPING..." : "DROP BANANA"}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default HandPostEditor
