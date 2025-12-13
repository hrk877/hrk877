"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

interface HandPost {
    id: string
    content: string
    createdAt: number
}

const PostViewerModal = ({
    post,
    isOpen,
    onClose,
}: {
    post: HandPost | null
    isOpen: boolean
    onClose: () => void
}) => {
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
                        <div className="p-8 md:p-12">
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 hover:bg-gray-100 transition-colors z-10"
                            >
                                <X size={24} className="text-black" />
                            </button>

                            <div className="flex flex-col gap-8">
                                <div className="font-mono text-xs tracking-widest opacity-40 uppercase">banana post</div>

                                <div className="font-serif text-2xl md:text-3xl leading-relaxed text-black whitespace-pre-wrap">
                                    {post.content}
                                </div>

                                <div className="w-full h-px bg-black/5 mt-4" />

                                <div className="flex justify-end items-center gap-2 font-mono text-[10px] opacity-40 uppercase">
                                    <span>POSTED ON</span>
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
