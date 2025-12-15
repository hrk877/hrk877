"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"
import type { User as FirebaseUser } from "firebase/auth"

export interface BlogPost {
    id: string
    date: string
    title: string
    content: string
    createdAt?: { seconds: number }
    authorId?: string
}

const BlogEditor = ({
    isOpen,
    onClose,
    user,
    editingPost,
}: {
    isOpen: boolean
    onClose: () => void
    user: FirebaseUser | null
    editingPost?: BlogPost | null
}) => {
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [loading, setLoading] = useState(false)

    // Proper scroll locking mechanism that preserves position
    useEffect(() => {
        if (isOpen) {
            // When modal opens, save current scroll position and fix body
            const scrollY = window.scrollY
            document.body.style.position = "fixed"
            document.body.style.top = `-${scrollY}px`
            document.body.style.width = "100%"
            document.body.style.overflowY = "scroll" // Maintain scrollbar width to prevent jump on desktop

            // When effect cleans up (modal closes), restore scroll position
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

    // Populate form if editing
    useEffect(() => {
        if (editingPost && isOpen) {
            setTitle(editingPost.title)
            setContent(editingPost.content)
        } else if (isOpen) {
            // Clear form for new entry
            setTitle("")
            setContent("")
        }
    }, [editingPost, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !db) return
        setLoading(true)
        try {
            const postsRef = collection(db, "artifacts", appId, "public", "data", "posts")

            if (editingPost) {
                // Update existing
                await updateDoc(doc(db, "artifacts", appId, "public", "data", "posts", editingPost.id), {
                    title,
                    content,
                })
            } else {
                // Create new
                await addDoc(postsRef, {
                    title,
                    content,
                    date: new Date()
                        .toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })
                        .replace(/\//g, "."),
                    createdAt: serverTimestamp(),
                    authorId: user.uid,
                    authorName: user.displayName || "Anonymous",
                    authorPhoto: user.photoURL || null,
                    authorEmail: user.email || null,
                })
            }

            onClose()
        } catch (error) {
            console.error("Error saving document: ", error)
            alert("Error saving post.")
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
                            <h2 className="text-3xl font-serif mb-8">{editingPost ? "Edit Article" : "New Article"}</h2>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                                <div>
                                    <label className="block text-xs font-mono opacity-40 mb-2 tracking-widest">TITLE</label>
                                    <input
                                        placeholder="Enter title..."
                                        className="admin-input text-2xl font-serif"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-mono opacity-40 mb-2 tracking-widest">CONTENT</label>
                                    <textarea
                                        placeholder="Write your thoughts..."
                                        className="admin-textarea"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-black text-[#FAC800] py-4 px-6 mt-4 hover:bg-[#333] transition-colors font-mono text-base md:text-sm tracking-widest disabled:opacity-50 active:scale-95 touch-manipulation"
                                >
                                    {loading ? "SAVING..." : editingPost ? "UPDATE" : "PUBLISH"}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default BlogEditor
