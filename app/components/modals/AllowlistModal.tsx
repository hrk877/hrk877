"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Trash2, Plus } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, deleteDoc, doc, onSnapshot, query, orderBy, setDoc } from "firebase/firestore"

interface WhitelistedUser {
    id: string
    email: string
    addedAt: any
}

const AllowlistModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [email, setEmail] = useState("")
    const [users, setUsers] = useState<WhitelistedUser[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // Subscribe to whitelist
    useEffect(() => {
        if (!isOpen) return

        const q = query(collection(db, "whitelisted_users"), orderBy("addedAt", "desc"))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as WhitelistedUser[]
            setUsers(userData)
        })

        return () => unsubscribe()
    }, [isOpen])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return
        setLoading(true)
        setError("")

        try {
            // Use email as ID to prevent duplicates easily
            await setDoc(doc(db, "whitelisted_users", email), {
                email: email,
                addedAt: new Date()
            })
            setEmail("")
        } catch (err: any) {
            console.error("Error adding user", err)
            setError("Failed to add user.")
        }
        setLoading(false)
    }

    const handleDelete = async (userId: string) => {
        if (!confirm("Remove this user from access list?")) return
        try {
            await deleteDoc(doc(db, "whitelisted_users", userId))
        } catch (err) {
            console.error("Error deleting user", err)
            setError("Failed to delete user.")
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
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.9 }}
                        className="bg-white p-6 md:p-12 w-full max-w-lg relative flex flex-col shadow-2xl max-h-[80vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 transition-colors rounded-full">
                            <X size={20} />
                        </button>

                        <h2 className="text-xl md:text-2xl font-serif mb-8 text-center uppercase tracking-widest text-black border-b border-black/10 pb-4">
                            VIP ACCESS LIST
                        </h2>

                        <div className="flex-1 overflow-y-auto min-h-[200px] mb-8 pr-2 custom-scrollbar">
                            {users.length === 0 ? (
                                <p className="text-center text-gray-400 font-mono text-xs py-8">NO USERS ALLOWED YET</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {users.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 group hover:border-black/20 transition-colors">
                                            <span className="font-mono text-sm truncate mr-4">{user.email}</span>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleAdd} className="w-full flex gap-2">
                            <input
                                type="email"
                                placeholder="Add email address..."
                                className="flex-1 p-3 bg-gray-50 border border-gray-200 focus:outline-none focus:border-black transition-colors font-mono text-sm"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-black text-[#FAC800] px-4 font-mono text-sm hover:bg-[#333] transition-colors disabled:opacity-50"
                            >
                                <Plus size={20} />
                            </button>
                        </form>

                        {error && (
                            <p className="mt-4 text-red-500 font-mono text-xs text-center">{error}</p>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default AllowlistModal
