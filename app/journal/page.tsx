"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"
import { useAuth } from "../components/providers/AuthProvider"
import { Plus, ChevronRight } from "lucide-react"

// Components
import TopNavigation from "../components/layout/TopNavigation"

// Modals
import BlogEditor, { type BlogPost } from "../components/modals/BlogEditor"
import JournalDetailPage from "../components/modals/JournalDetailPage"
import AdminLoginModal from "../components/modals/AdminLoginModal"

export default function JournalPage() {
    const { user, isAdmin } = useAuth()

    // Blog State
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
    const [allPosts, setAllPosts] = useState<BlogPost[]>([])
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
    const [isBlogEditorOpen, setIsBlogEditorOpen] = useState(false)

    // Admin Login State
    const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false)
    const [secretClickCount, setSecretClickCount] = useState(0)

    const handleSecretClick = () => {
        setSecretClickCount(prev => {
            const newCount = prev + 1
            if (newCount === 5) {
                setIsAdminLoginOpen(true)
                return 0
            }
            return newCount
        })
    }

    useEffect(() => {
        if (!db) return

        const postsRef = collection(db, "artifacts", appId, "public", "data", "posts")
        const q = query(postsRef, orderBy("createdAt", "desc"))
        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const fetchedPosts: BlogPost[] = []
                querySnapshot.forEach((docSnap) => {
                    fetchedPosts.push({ id: docSnap.id, ...docSnap.data() } as BlogPost)
                })
                setAllPosts(fetchedPosts)
            },
            (err) => {
                console.log("Error fetching posts for navigation:", err)
            },
        )
        return () => unsubscribe()
    }, [])

    const handleOpenPost = (post: BlogPost) => {
        setSelectedPost(post)
    }

    const handleDeletePost = async (id: string) => {
        if (!db) return
        try {
            await deleteDoc(doc(db, "artifacts", appId, "public", "data", "posts", id))
        } catch (err) {
            console.error("Error deleting:", err)
            alert("Error deleting post.")
        }
    }

    const handleEditPost = (post: BlogPost) => {
        setEditingPost(post)
        setIsBlogEditorOpen(true)
        setSelectedPost(null)
    }

    return (
        <div className="min-h-screen bg-[#FAC800] text-black p-4 md:p-6 pt-20 md:pt-24 pb-20">
            <TopNavigation />

            <BlogEditor
                isOpen={isBlogEditorOpen}
                onClose={() => {
                    setIsBlogEditorOpen(false)
                    setEditingPost(null)
                }}
                user={user}
                editingPost={editingPost}
            />

            <AdminLoginModal
                isOpen={isAdminLoginOpen}
                onClose={() => setIsAdminLoginOpen(false)}
            />

            <AnimatePresence>
                {selectedPost && allPosts.length > 0 && (
                    <JournalDetailPage
                        post={selectedPost}
                        posts={allPosts}
                        onClose={() => setSelectedPost(null)}
                        onNavigate={(post) => setSelectedPost(post)}
                        isAdmin={isAdmin}
                        onDelete={handleDeletePost}
                        onEdit={handleEditPost}
                    />
                )}
            </AnimatePresence>

            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start mb-6 md:mb-8 border-b border-black pb-4 md:pb-6 relative">
                    <div>
                        <h1 className="text-7xl md:text-9xl font-serif font-thin leading-none">JOURNAL</h1>
                    </div>
                    <div className="text-left mt-6 md:mt-0 flex flex-col items-start gap-4">
                        <p className="font-mono text-lg md:text-xs opacity-60">
                            Written by <span className="cursor-pointer select-none hover:text-white transition-colors" onClick={handleSecretClick}>HRK.877</span>
                            <br />
                            Tokyo, Japan
                        </p>
                        {isAdmin && (
                            <button
                                onClick={() => {
                                    setEditingPost(null)
                                    setIsBlogEditorOpen(true)
                                }}
                                className="inline-flex items-center gap-2 bg-black text-[#FAC800] px-4 py-3 font-mono text-base md:text-xs tracking-widest hover:scale-105 transition-transform active:scale-95 touch-manipulation"
                            >
                                <Plus size={14} /> NEW POST
                            </button>
                        )}
                    </div>
                </header>

                <div className="max-w-4xl mx-auto flex flex-col gap-px">
                    {allPosts.map((post, index) => (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => handleOpenPost(post)}
                            className="group border-t border-black/20 py-6 cursor-pointer hover:bg-black hover:text-[#FAC800] transition-colors duration-300 relative overflow-hidden px-4 md:px-6 -mx-4 md:mx-0"
                        >
                            <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-12 relative z-10 p-2">
                                <span className="font-mono text-xs md:text-xs opacity-40 w-24 shrink-0">{post.date}</span>
                                <div className="flex-1">
                                    <h3 className="text-2xl md:text-3xl font-serif font-light leading-snug group-hover:translate-x-2 transition-transform duration-300">
                                        {post.title}
                                    </h3>
                                </div>
                                <div className="hidden md:flex items-center gap-2 font-mono text-[10px] opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">
                                    <span>READ ENTRY</span>
                                    <ChevronRight size={12} />
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {allPosts.length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center opacity-50 space-y-4">
                            <span className="font-mono text-base md:text-xs tracking-widest flex items-center">
                                LOADING ARCHIVE
                                <span className="flex ml-1">
                                    <span className="animate-bounce">.</span>
                                    <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                                    <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                                </span>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
