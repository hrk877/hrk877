"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Edit, Trash2 } from "lucide-react"
import type { HandPost } from "./HandPostEditor"

const PostViewerModal = ({
    post,
    isOpen,
    onClose,
    currentUserId,
    onEdit,
    onDelete,
}: {
    post: HandPost | null
    isOpen: boolean
    onClose: () => void
    currentUserId?: string | null
    onEdit: (post: HandPost) => void
    onDelete: (id: string) => void
}) => {
    const isAuthor = currentUserId && post?.authorId === currentUserId

    return (
        <AnimatePresence>
            {isOpen && post && (
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
                        exit={{ y: 50, opacity: 0 }}
                        className="bg-[#FAFAFA] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 md:p-12">
                            <div className="absolute top-6 right-6 flex items-center gap-4 z-10">
                                {isAuthor && (
                                    <div className="flex items-center gap-3 border-r border-black/10 pr-4">
                                        <button
                                            onClick={() => onEdit(post)}
                                            className="hover:opacity-50 transition-opacity p-1"
                                            title="Edit Post"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm("Delete this banana?")) {
                                                    onDelete(post.id)
                                                    onClose()
                                                }
                                            }}
                                            className="hover:text-red-500 transition-colors p-1"
                                            title="Delete Post"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 transition-colors"
                                >
                                    <X size={24} className="text-black" />
                                </button>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1 border-b border-black/10 pb-6 mb-4">
                                    <span className="font-mono text-[10px] tracking-[0.2em] opacity-40 uppercase">DROPPED BY</span>
                                    <h2 className="text-3xl font-serif">
                                        {post.authorFingerId ? post.authorFingerId.replace(/^finger(\d+)$/, (_, n) => `Finger ${n}`) : 'Anonymous'}
                                    </h2>
                                </div>

                                <div className="font-serif text-2xl md:text-3xl leading-relaxed text-black whitespace-pre-wrap">
                                    {post.content}
                                </div>

                                <div className="flex justify-end items-center gap-2 font-mono text-[10px] opacity-40 uppercase mt-2 pt-0 border-t-0">
                                    <span>DROPPED ON</span>
                                    <span>
                                        {new Date(post.createdAt).toLocaleDateString("ja-JP", {
                                            year: "numeric",
                                            month: "2-digit",
                                            day: "2-digit"
                                        }).replace(/\//g, '.')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default PostViewerModal
