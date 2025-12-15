"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ImageIcon } from "lucide-react"
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"
import type { User as FirebaseUser } from "firebase/auth"

export interface Artwork {
    id: string
    title: string
    date: string
    type: string
    desc: string
    image?: string | null
    createdAt?: { seconds: number }
}

const MuseumEditorModal = ({
    isOpen,
    onClose,
    user,
    editingArtwork,
}: {
    isOpen: boolean
    onClose: () => void
    user: FirebaseUser | null
    editingArtwork?: Artwork | null
}) => {
    const [title, setTitle] = useState("")
    const [date, setDate] = useState("")
    const [type, setType] = useState("")
    const [desc, setDesc] = useState("")
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

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
        if (editingArtwork && isOpen) {
            setTitle(editingArtwork.title)
            setDate(editingArtwork.date)
            setType(editingArtwork.type)
            setDesc(editingArtwork.desc)
            setImagePreview(editingArtwork.image || null)
        } else if (isOpen) {
            // Clear form for new entry
            setTitle("")
            setDate("")
            setType("")
            setDesc("")
            setImagePreview(null)
        }
    }, [editingArtwork, isOpen])

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !db) return
        setLoading(true)
        try {
            const museumRef = collection(db, "artifacts", appId, "public", "data", "museum_artworks")

            const dataToSave = {
                title,
                date,
                type,
                desc,
                image: imagePreview || null,
                createdAt: editingArtwork ? undefined : serverTimestamp(), // Keep original timestamp if editing
                authorId: user.uid,
                authorName: user.displayName || "Anonymous",
                authorPhoto: user.photoURL || null,
                authorEmail: user.email || null,
            }

            // Remove undefined fields
            Object.keys(dataToSave).forEach((key) => {
                if (dataToSave[key as keyof typeof dataToSave] === undefined) {
                    delete dataToSave[key as keyof typeof dataToSave]
                }
            })

            if (editingArtwork) {
                // Update existing
                await updateDoc(doc(db, "artifacts", appId, "public", "data", "museum_artworks", editingArtwork.id), dataToSave)
            } else {
                // Create new
                await addDoc(museumRef, dataToSave)
            }

            onClose()
        } catch (error) {
            console.error("Error saving artwork: ", error)
            alert("Error saving artwork.")
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

                            <h2 className="text-3xl font-serif mb-8">{editingArtwork ? "Edit Artwork" : "New Artwork"}</h2>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-[3/2] border-2 border-dashed border-black/20 flex flex-col items-center justify-center cursor-pointer hover:border-black/40 transition-colors overflow-hidden bg-black/5"
                                >
                                    {imagePreview ? (
                                        <img
                                            src={imagePreview || "/placeholder.svg"}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <>
                                            <ImageIcon size={48} className="opacity-30 mb-2" />
                                            <span className="font-mono text-sm opacity-50">CLICK TO ADD IMAGE</span>
                                        </>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />

                                <input
                                    placeholder="Title"
                                    className="admin-input text-2xl font-serif"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                                <input
                                    placeholder="Year / Date"
                                    className="admin-input font-mono text-base md:text-sm"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                                <input
                                    placeholder="Type (e.g. Digital Structure)"
                                    className="admin-input font-mono text-base md:text-sm"
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    required
                                />
                                <input
                                    placeholder="Description (Short)"
                                    className="admin-input font-mono text-base md:text-sm"
                                    value={desc}
                                    onChange={(e) => setDesc(e.target.value)}
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-black text-[#FAC800] py-4 px-6 mt-4 hover:bg-[#333] transition-colors font-mono text-base md:text-sm tracking-widest disabled:opacity-50 active:scale-95 touch-manipulation"
                                >
                                    {loading ? "SAVING..." : editingArtwork ? "UPDATE" : "PUBLISH"}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default MuseumEditorModal
