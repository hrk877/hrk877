"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"

import { ModernBananaSVG } from "../ui/ModernBananaSVG"
import type { BlogPost } from "../modals/BlogEditor"

const Journal = ({
    isAdmin,
    onOpenPost,
    onNewPost,
}: {
    isAdmin: boolean
    onOpenPost: (post: BlogPost) => void
    onNewPost: () => void
}) => {
    const [posts, setPosts] = useState<BlogPost[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(0)
    const postsPerPage = 3

    const mockPosts: BlogPost[] = [
        {
            id: "1",
            date: "2025.02.15",
            title: "なぜバナナは美しいのか：曲線の方程式",
            content: `バナナの曲線美について考えるとき、我々は自然界の完璧なデザインに直面する。\n\n工業製品の直線とは対照的に、バナナの形状は有機的でありながら、ある種の数学的な整合性を持っているように見える。手に持った時のフィット感、皮を剥くときの抵抗のなさ、そして口に運ぶ際の角度。すべてが「食べる」という行為のために最適化されているかのようだ。`,
        },
    ]

    useEffect(() => {
        if (!db) {
            setPosts(mockPosts)
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        const postsRef = collection(db, "artifacts", appId, "public", "data", "posts")
        const q = query(postsRef, orderBy("createdAt", "desc"))
        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const fetchedPosts: BlogPost[] = []
                querySnapshot.forEach((docSnap) => {
                    fetchedPosts.push({ id: docSnap.id, ...docSnap.data() } as BlogPost)
                })
                setPosts(fetchedPosts.length > 0 ? fetchedPosts : mockPosts)
                setIsLoading(false)
            },
            (err) => {
                console.log("Using offline/mock mode due to error:", err)
                setPosts(mockPosts)
                setIsLoading(false)
            },
        )
        return () => unsubscribe()
    }, [])

    const totalPages = Math.ceil(posts.length / postsPerPage)
    const displayedPosts = posts.slice(currentPage * postsPerPage, (currentPage + 1) * postsPerPage)

    return (
        <section id="blog" className="min-h-screen bg-[#FAC800] px-4 md:px-10 py-16 md:py-32 relative overflow-hidden">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start mb-12 md:mb-24 border-b border-black pb-6">
                    <div>
                        <span className="font-mono text-sm md:text-xs tracking-widest opacity-40 block mb-3">SECTION 03</span>
                        <h2 className="text-[18vw] md:text-[8vw] leading-[0.8] font-light tracking-tighter">JOURNAL</h2>
                    </div>
                    <div className="text-left flex flex-col items-start gap-4 mt-8 md:mt-0">
                        {isAdmin && (
                            <button
                                onClick={onNewPost}
                                className="inline-flex items-center gap-2 bg-black text-[#FAC800] px-4 py-3 font-mono text-base md:text-xs tracking-widest hover:scale-105 transition-transform active:scale-95 touch-manipulation"
                            >
                                <Plus size={14} /> NEW POST
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center opacity-50 space-y-4">
                            <span className="font-mono text-base md:text-xs tracking-widest flex items-center">
                                LOADING JOURNAL
                                <span className="flex ml-1">
                                    <span className="animate-bounce">.</span>
                                    <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                                    <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                                </span>
                            </span>
                        </div>
                    ) : (
                        <>
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={currentPage}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    {displayedPosts.map((post, index) => (
                                        <motion.div
                                            key={post.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1, duration: 0.5 }}
                                            onClick={() => onOpenPost(post)}
                                            className="group border-t border-black/20 py-6 md:py-12 cursor-pointer hover:bg-black hover:text-[#FAC800] active:bg-black active:text-[#FAC800] transition-all duration-300 relative overflow-hidden -mx-4 px-4"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-12 relative z-10">
                                                <span className="font-mono text-sm md:text-xs opacity-50 w-32">{post.date}</span>
                                                <div className="flex-1">
                                                    <h3 className="text-3xl md:text-5xl font-serif font-light mb-2 group-hover:translate-x-2 md:group-hover:translate-x-4 transition-transform duration-300">
                                                        {post.title}
                                                    </h3>
                                                </div>
                                                <div className="hidden md:flex items-center gap-4 font-mono text-xs opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <span>READ</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </AnimatePresence>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-4 mt-12 pt-8 border-t border-black/10">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                                        disabled={currentPage === 0}
                                        className={`p-2 transition-opacity ${currentPage === 0 ? "opacity-20 cursor-not-allowed" : "hover:opacity-60"}`}
                                    >
                                        <ChevronLeft size={24} strokeWidth={1} />
                                    </button>

                                    <div className="flex items-center gap-3">
                                        {Array.from({ length: totalPages }).map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentPage(idx)}
                                                className={`w-3 h-3 rounded-full transition-all duration-300 ${idx === currentPage ? "bg-black scale-125" : "bg-black/30 hover:bg-black/50"
                                                    }`}
                                                aria-label={`Go to page ${idx + 1}`}
                                            />
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                                        disabled={currentPage === totalPages - 1}
                                        className={`p-2 transition-opacity ${currentPage === totalPages - 1 ? "opacity-20 cursor-not-allowed" : "hover:opacity-60"}`}
                                    >
                                        <ChevronRight size={24} strokeWidth={1} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </section>
    )
}

export default Journal
