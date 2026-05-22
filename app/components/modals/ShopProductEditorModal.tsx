"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ImageIcon } from "lucide-react"
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"
import type { User as FirebaseUser } from "firebase/auth"
import { compressImage } from "@/app/lib/image"

export interface ShopProduct {
    id: string
    name: string
    price: number
    description: string
    detail?: string
    image?: string | null
    stock: number
    inStock: boolean
    createdAt?: { seconds: number }
}

const ShopProductEditorModal = ({
    isOpen,
    onClose,
    user,
    editingProduct,
}: {
    isOpen: boolean
    onClose: () => void
    user: FirebaseUser | null
    editingProduct?: ShopProduct | null
}) => {
    const [name, setName] = useState("")
    const [price, setPrice] = useState("")
    const [description, setDescription] = useState("")
    const [detail, setDetail] = useState("")
    const [stock, setStock] = useState("1")
    const [inStock, setInStock] = useState(true)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            const scrollY = window.scrollY
            document.body.style.position = "fixed"
            document.body.style.top = `-${scrollY}px`
            document.body.style.width = "100%"
            document.body.style.overflowY = "scroll"
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

    useEffect(() => {
        if (editingProduct && isOpen) {
            setName(editingProduct.name)
            setPrice(String(editingProduct.price))
            setDescription(editingProduct.description)
            setDetail(editingProduct.detail || "")
            setStock(String(editingProduct.stock))
            setInStock(editingProduct.inStock)
            setImagePreview(editingProduct.image || null)
        } else if (isOpen) {
            setName("")
            setPrice("")
            setDescription("")
            setDetail("")
            setStock("1")
            setInStock(true)
            setImagePreview(null)
        }
    }, [editingProduct, isOpen])

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setLoading(true)
        try {
            const compressed = await compressImage(file)
            setImagePreview(compressed)
        } catch {
            const reader = new FileReader()
            reader.onloadend = () => setImagePreview(reader.result as string)
            reader.readAsDataURL(file)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !db) return
        setLoading(true)
        try {
            const productsRef = collection(db, "artifacts", appId, "public", "data", "shop_products")
            const data = {
                name,
                price: parseInt(price),
                description,
                detail: detail || null,
                image: imagePreview || null,
                stock: parseInt(stock),
                inStock,
                authorId: user.uid,
                ...(editingProduct ? {} : { createdAt: serverTimestamp() }),
            }

            if (editingProduct) {
                await updateDoc(doc(db, "artifacts", appId, "public", "data", "shop_products", editingProduct.id), data)
            } else {
                await addDoc(productsRef, data)
            }
            onClose()
        } catch (error) {
            console.error("Error saving product:", error)
            alert("保存に失敗しました。")
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

                            <h2 className="text-3xl font-serif mb-8">
                                {editingProduct ? "商品を編集" : "新しい商品"}
                            </h2>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square border-2 border-dashed border-black/20 flex flex-col items-center justify-center cursor-pointer hover:border-black/40 transition-colors overflow-hidden bg-black/5"
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <ImageIcon size={48} className="opacity-30 mb-2" />
                                            <span className="font-mono text-sm opacity-50">商品画像を選択</span>
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
                                    placeholder="商品名"
                                    className="admin-input text-2xl font-serif"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                                <input
                                    placeholder="価格 (円)"
                                    type="number"
                                    min="1"
                                    className="admin-input font-mono text-base md:text-sm"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    required
                                />
                                <input
                                    placeholder="短い説明"
                                    className="admin-input font-mono text-base md:text-sm"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                />
                                <textarea
                                    placeholder="詳細説明（任意）"
                                    className="admin-input font-mono text-base md:text-sm resize-none h-24"
                                    value={detail}
                                    onChange={(e) => setDetail(e.target.value)}
                                />
                                <div className="flex gap-4">
                                    <input
                                        placeholder="在庫数"
                                        type="number"
                                        min="0"
                                        className="admin-input font-mono text-base md:text-sm flex-1"
                                        value={stock}
                                        onChange={(e) => setStock(e.target.value)}
                                        required
                                    />
                                    <label className="flex items-center gap-2 font-mono text-sm cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={inStock}
                                            onChange={(e) => setInStock(e.target.checked)}
                                            className="w-4 h-4"
                                        />
                                        販売中
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-black text-[#FAC800] py-4 px-6 mt-4 hover:bg-[#333] transition-colors font-mono text-base md:text-sm tracking-widest disabled:opacity-50 active:scale-95 touch-manipulation"
                                >
                                    {loading ? "保存中..." : editingProduct ? "更新する" : "公開する"}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default ShopProductEditorModal
