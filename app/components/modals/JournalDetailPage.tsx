"use client"

import { motion } from "framer-motion"
import { ChevronLeft, Edit, Trash2, ChevronRight, X, Share2 } from "lucide-react"
import type { BlogPost } from "./BlogEditor"
import { useRouter } from "next/navigation"

const JournalDetailPage = ({
    post,
    posts,
    onClose,
    onNavigate,
    isAdmin,
    onDelete,
    onEdit,
}: {
    post: BlogPost
    posts: BlogPost[]
    onClose: () => void
    onNavigate: (post: BlogPost) => void
    isAdmin: boolean
    onDelete: (id: string) => void
    onEdit: (post: BlogPost) => void
}) => {
    const router = useRouter()
    const currentIndex = posts.findIndex((p) => p.id === post.id)
    const prevPost = currentIndex > 0 ? posts[currentIndex - 1] : null
    const nextPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null

    const handleBack = () => {
        onClose()
    }

    const handleNavigate = (targetPost: BlogPost) => {
        onNavigate(targetPost)
    }

    const handleShare = () => {
        const url = `${window.location.origin}/journal/${post.id}`
        navigator.clipboard.writeText(url).then(() => {
            alert("URL copied to clipboard!")
        }).catch(err => {
            console.error("Failed to copy:", err)
        })
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999] bg-[#FAC800] overflow-y-auto selection:bg-black selection:text-[#FAC800]"
        >
            <div className="noise-overlay" />
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAC800]/90 backdrop-blur-md border-b border-black/10">
                <div className="max-w-6xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 font-mono text-xs tracking-widest hover:opacity-60 transition-opacity"
                    >
                        <ChevronLeft size={20} strokeWidth={1.5} />
                        <span>BACK TO JOURNAL</span>
                    </button>

                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-3 ${isAdmin ? 'border-r border-black/10 pr-4 mr-4' : ''}`}>
                            <button
                                onClick={handleShare}
                                className="hover:opacity-50 transition-opacity"
                                title="Share Post"
                            >
                                <Share2 size={18} />
                            </button>
                            {isAdmin && (
                                <>
                                    <button
                                        onClick={() => onEdit(post)}
                                        className="hover:opacity-50 transition-opacity"
                                        title="Edit Post"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm("Delete this post?")) {
                                                onDelete(post.id)
                                            }
                                        }}
                                        className="hover:text-red-500 transition-colors"
                                        title="Delete Post"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </>
                            )}
                        </div>
                        <span className="font-mono text-xs opacity-50">
                            {currentIndex !== -1 ? `${currentIndex + 1} / ${posts.length}` : "- / -"}
                        </span>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-32 px-6 md:px-10">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-6 flex items-center gap-4"
                    >
                        <span className="font-mono text-sm tracking-widest opacity-60">{post.date}</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-6xl lg:text-7xl font-['Cormorant_Garamond',_serif] font-light leading-tight mb-12 break-words"
                    >
                        {post.title}
                    </motion.h1>

                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="w-24 h-px bg-black/30 mb-12 origin-left"
                    />

                    <motion.article
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="prose prose-base md:prose-lg max-w-none font-['Cormorant_Garamond',_serif] text-black/90 leading-relaxed"
                    >
                        <div
                            dangerouslySetInnerHTML={{ __html: post.content }}
                            className="rich-text-content break-words whitespace-pre-wrap"
                        />
                    </motion.article>
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 bg-black text-[#FAC800] border-t border-[#FAC800]/20 z-40">
                <div className="max-w-6xl mx-auto grid grid-cols-2 divide-x divide-[#FAC800]/20">
                    <button
                        onClick={() => prevPost && handleNavigate(prevPost)}
                        disabled={!prevPost}
                        className={`group p-6 md:p-8 text-left transition-all duration-300 ${prevPost ? "hover:bg-[#FAC800]/10" : "opacity-30 cursor-not-allowed"
                            }`}
                    >
                        <span className="font-mono text-xs tracking-widest opacity-50 flex items-center gap-2 mb-2">
                            <ChevronLeft size={14} /> PREV
                        </span>
                        <span className="font-serif text-sm md:text-lg line-clamp-1 group-hover:translate-x-1 transition-transform">
                            {prevPost?.title || "No previous post"}
                        </span>
                    </button>

                    <button
                        onClick={() => nextPost && handleNavigate(nextPost)}
                        disabled={!nextPost}
                        className={`group p-6 md:p-8 text-right transition-all duration-300 ${nextPost ? "hover:bg-[#FAC800]/10" : "opacity-30 cursor-not-allowed"
                            }`}
                    >
                        <span className="font-mono text-xs tracking-widest opacity-50 flex items-center justify-end gap-2 mb-2">
                            NEXT <ChevronRight size={14} />
                        </span>
                        <span className="font-serif text-sm md:text-lg line-clamp-1 group-hover:-translate-x-1 transition-transform">
                            {nextPost?.title || "No next post"}
                        </span>
                    </button>
                </div>
            </footer>
        </motion.div>
    )
}

export default JournalDetailPage
