"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Lock } from "lucide-react"

const AccessDeniedModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
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
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.9 }}
                        className="bg-white p-8 md:p-12 w-full max-w-md relative flex flex-col items-center shadow-2xl text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 transition-colors rounded-full">
                            <X size={20} />
                        </button>

                        <div className="mb-6 p-4 bg-gray-50 rounded-full">
                            <Lock size={32} className="text-black" />
                        </div>

                        <h2 className="text-2xl font-serif mb-8 uppercase tracking-widest text-black">
                            ACCESS DENIED
                        </h2>

                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-black text-[#FAC800] font-mono text-xs tracking-[0.2em] hover:bg-[#333] transition-colors"
                        >
                            CLOSE
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default AccessDeniedModal
