import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"
import type { User as FirebaseUser } from "firebase/auth"
import { notifyCommunity } from "@/app/lib/notification"
import TipTapEditor from "../editor/TipTapEditor"
import { NotificationToggle } from "../ui/NotificationToggle"

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
    const [sendNotification, setSendNotification] = useState(true)
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

                // Notify community only for new posts if enabled
                if (sendNotification) {
                    notifyCommunity('journal', title)
                }
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
                    className="fixed inset-0 z-[9999] bg-[#FAC800] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="min-h-screen flex flex-col">
                        <div className="noise-overlay pointer-events-none" />
                        {/* Editor Header */}
                        <header className="sticky top-0 z-50 bg-[#FAC800]/90 backdrop-blur-md border-b border-black/10 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-black/5 rounded-full transition-colors text-black/40 hover:text-black"
                                >
                                    <X size={20} />
                                </button>
                                <span className="font-mono text-[10px] tracking-widest opacity-30 px-3 border-l border-black/10">
                                    {editingPost ? "EDITING ARCHIVE" : "NEW DRAFT"}
                                </span>
                            </div>

                            <div className="flex items-center gap-6">
                                {!editingPost && (
                                    <NotificationToggle
                                        enabled={sendNotification}
                                        onChange={setSendNotification}
                                    />
                                )}
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || !title || !content}
                                    className="bg-black text-[#FAC800] py-2 px-8 hover:bg-[#333] transition-all font-mono text-xs tracking-widest disabled:opacity-20 active:scale-95 rounded-full shadow-md"
                                >
                                    {loading ? "SAVING..." : editingPost ? "UPDATE" : "PUBLISH"}
                                </button>
                            </div>
                        </header>

                        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 md:py-24 relative z-10">
                            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-12">
                                <div className="space-y-4">
                                    <textarea
                                        placeholder="Title for your journal..."
                                        className="w-full text-5xl md:text-8xl font-['Cormorant_Garamond',_serif] font-light bg-transparent border-none focus:ring-0 resize-none placeholder:opacity-5 leading-tight break-words"
                                        rows={1}
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        onInput={(e) => {
                                            const target = e.target as HTMLTextAreaElement
                                            target.style.height = 'auto'
                                            target.style.height = target.scrollHeight + 'px'
                                        }}
                                        required
                                    />
                                    <div className="flex items-center gap-3 font-mono text-[10px] opacity-20 tracking-wider">
                                        <span>BY {user?.displayName || "HRK.877"}</span>
                                        <span>•</span>
                                        <span>{new Date().toLocaleDateString('ja-JP').replace(/\//g, '.')}</span>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <TipTapEditor content={content} onChange={setContent} />
                                </div>
                            </form>
                        </main>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default BlogEditor
