"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ChevronLeft, Plus, Edit, Trash2 } from "lucide-react"
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"

import { ModernBananaSVG } from "../ui/ModernBananaSVG"
import MuseumEditorModal, { type Artwork } from "../modals/MuseumEditorModal"

import { useAuth } from "../providers/AuthProvider"
import Link from "next/link"
import HamburgerMenu from "../navigation/HamburgerMenu"
import AdminLoginModal from "../modals/AdminLoginModal"

const Museum = () => {
    const { isAdmin, user } = useAuth()
    const [artworks, setArtworks] = useState<Artwork[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null)
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

    const defaultArtworks: Artwork[] = [
        { id: "1", title: "The Sovereign", date: "2025", type: "Digital Structure", desc: "完全なる曲線の具現化。" },
        { id: "2", title: "Yellow Silence", date: "2024", type: "Color Study", desc: "言葉を失うほどの彩度。" },
        { id: "3", title: "Peel & Soul", date: "2023", type: "Abstract", desc: "内面を晒す勇気。" },
        { id: "4", title: "Organic Glitch", date: "2025", type: "Installation", desc: "自然界のバグとしての甘み。" },
        { id: "5", title: "Midnight Snack", date: "2022", type: "Photography", desc: "夜の静寂と果実。" },
        { id: "6", title: "Golden Curve", date: "2025", type: "Sculpture", desc: "金属による有機性の模倣。" },
    ]

    useEffect(() => {
        if (!db) {
            setArtworks(defaultArtworks)
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        const museumRef = collection(db, "artifacts", appId, "public", "data", "museum_artworks")
        const q = query(museumRef, orderBy("createdAt", "desc"))
        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const fetchedWorks: Artwork[] = []
                querySnapshot.forEach((docSnap) => {
                    fetchedWorks.push({ id: docSnap.id, ...docSnap.data() } as Artwork)
                })
                setArtworks(fetchedWorks.length > 0 ? fetchedWorks : defaultArtworks)
                setIsLoading(false)
            },
            (err) => {
                console.log("Using default museum data:", err)
                setArtworks(defaultArtworks)
                setIsLoading(false)
            },
        )
        return () => unsubscribe()
    }, [])

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (!db) {
            alert("Firebase not initialized.")
            return
        }
        if (confirm("Delete this artwork?")) {
            try {
                await deleteDoc(doc(db, "artifacts", appId, "public", "data", "museum_artworks", id))
            } catch (err) {
                console.error("Error deleting", err)
                alert("Could not delete.")
            }
        }
    }

    const handleEdit = (e: React.MouseEvent, artwork: Artwork) => {
        e.stopPropagation()
        setEditingArtwork(artwork)
        setIsEditorOpen(true)
    }

    const [currentPageMuseum, setCurrentPageMuseum] = useState(1)
    const itemsPerPageMuseum = 10

    const indexOfLastArtwork = currentPageMuseum * itemsPerPageMuseum
    const indexOfFirstArtwork = indexOfLastArtwork - itemsPerPageMuseum
    const currentArtworks = artworks.slice(indexOfFirstArtwork, indexOfLastArtwork)
    const totalPagesMuseum = Math.ceil(artworks.length / itemsPerPageMuseum)

    const nextPageMuseum = () => setCurrentPageMuseum(Math.min(currentPageMuseum + 1, totalPagesMuseum))
    const prevPageMuseum = () => setCurrentPageMuseum(Math.max(currentPageMuseum - 1, 1))

    return (
        <div className="min-h-screen bg-[#FAC800] text-black p-4 md:p-6 pt-24 md:pt-32 pb-20">
            <HamburgerMenu />
            <MuseumEditorModal
                isOpen={isEditorOpen}
                onClose={() => {
                    setIsEditorOpen(false)
                    setEditingArtwork(null)
                }}
                user={user}
                editingArtwork={editingArtwork}
            />
            <AdminLoginModal
                isOpen={isAdminLoginOpen}
                onClose={() => setIsAdminLoginOpen(false)}
            />

            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start mb-6 md:mb-8 border-b border-black pb-4 md:pb-6 relative">


                    <div>
                        {/* ARCHIVE COLLECTION removed */}
                        <h1 className="text-7xl md:text-9xl font-serif font-thin leading-none">MUSEUM</h1>
                    </div>
                    <div className="text-left mt-6 md:mt-0 flex flex-col items-start gap-4">
                        <p className="font-mono text-lg md:text-xs opacity-60">
                            Curated by <span className="cursor-pointer select-none hover:text-white transition-colors" onClick={handleSecretClick}>HRK.877</span>
                            <br />
                            Tokyo, Japan
                        </p>
                        {isAdmin && (
                            <button
                                onClick={() => {
                                    setEditingArtwork(null)
                                    setIsEditorOpen(true)
                                }}
                                className="inline-flex items-center gap-2 bg-black text-[#FAC800] px-4 py-3 font-mono text-base md:text-xs tracking-widest hover:scale-105 transition-transform active:scale-95 touch-manipulation"
                            >
                                <Plus size={14} /> ADD ARTWORK
                            </button>
                        )}
                    </div>
                </header>

                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center opacity-50 space-y-4">
                        <span className="font-mono text-base md:text-xs tracking-widest flex items-center">
                            LOADING COLLECTION
                            <span className="flex ml-1">
                                <span className="animate-bounce">.</span>
                                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                            </span>
                        </span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24">
                        {currentArtworks.map((art, i) => (
                            <motion.div
                                key={art.id}
                                initial={{ opacity: 0, y: 50 }}
                                animate={i < 4 ? { opacity: 1, y: 0 } : undefined}
                                whileInView={i >= 4 ? { opacity: 1, y: 0 } : undefined}
                                transition={{ duration: 0.8, delay: i * 0.1 }}
                                viewport={{ once: true, margin: "-50px" }}
                                className="group cursor-pointer"
                            >
                                <div
                                    className="aspect-[3/4] bg-black relative overflow-hidden mb-6 flex items-center justify-center"
                                    onContextMenu={(e) => e.preventDefault()}
                                >
                                    <div className="absolute inset-0 bg-[#FAC800] opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                                    {art.image ? (
                                        <Image
                                            src={art.image}
                                            alt={art.title}
                                            fill
                                            priority={i < 4}
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            className="object-cover pointer-events-none select-none"
                                            onDragStart={(e) => e.preventDefault()}
                                            style={{ WebkitTouchCallout: "none" }}
                                        />
                                    ) : (
                                        <ModernBananaSVG
                                            className={`w-48 h-48 text-[#FAC800] transition-transform duration-700 ${i % 2 === 0 ? "group-hover:rotate-12" : "group-hover:-rotate-12"
                                                } group-hover:scale-110`}
                                        />
                                    )}

                                    <div className="absolute bottom-6 right-6 font-mono text-[#FAC800] text-sm md:text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                        NO. 0{indexOfFirstArtwork + i + 1}
                                    </div>

                                    {isAdmin && (
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10">
                                            <button
                                                onClick={(e) => handleEdit(e, art)}
                                                className="p-2 bg-white text-black hover:bg-black hover:text-[#FAC800] rounded-full"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, art.id)}
                                                className="p-2 bg-white text-black hover:bg-red-500 hover:text-white rounded-full"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-baseline border-t border-black pt-4">
                                    <h3 className="text-3xl md:text-4xl font-serif group-hover:italic transition-all duration-300">
                                        {art.title}
                                    </h3>
                                    <span className="font-mono text-base md:text-xs opacity-50">{art.date}</span>
                                </div>
                                <div className="flex justify-between items-baseline mt-2 opacity-60 font-mono text-lg md:text-xs">
                                    <span>{art.type}</span>
                                    <span>{art.desc}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {totalPagesMuseum > 1 && (
                    <div className="flex items-center justify-center gap-8 mt-20 font-mono text-sm md:text-xs tracking-widest">
                        <button onClick={prevPageMuseum} disabled={currentPageMuseum === 1} className="disabled:opacity-20">
                            <ChevronLeft size={24} />
                        </button>
                        <span>
                            Page {currentPageMuseum} of {totalPagesMuseum}
                        </span>
                        <button
                            onClick={nextPageMuseum}
                            disabled={currentPageMuseum === totalPagesMuseum}
                            className="disabled:opacity-20"
                        >
                            <div style={{ transform: "rotate(180deg)" }}>
                                <ChevronLeft size={24} />
                            </div>
                        </button>
                    </div>
                )}

                <div className="mt-32 text-center">
                    <p className="font-serif text-2xl md:text-xl italic opacity-50">&quot;Art mimics the banana.&quot;</p>
                </div>
            </div>
        </div>
    )
}

export default Museum
