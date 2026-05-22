"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Edit, Trash2, X, ShoppingBag } from "lucide-react"
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"
import { useAuth } from "../components/providers/AuthProvider"
import HamburgerMenu from "../components/navigation/HamburgerMenu"
import AdminPlusButton from "../components/navigation/AdminPlusButton"
import AdminLoginModal from "../components/modals/AdminLoginModal"
import ShopProductEditorModal, { type ShopProduct } from "../components/modals/ShopProductEditorModal"

const defaultProducts: ShopProduct[] = [
    {
        id: "1",
        name: "HRK.877 Tee — Black",
        price: 8800,
        description: "バナナモチーフ半袖Tシャツ",
        detail: "100% オーガニックコットン。ユニセックスサイズ展開。",
        inStock: true,
        stock: 10,
    },
    {
        id: "2",
        name: "877 Tote Bag",
        price: 4400,
        description: "キャンバストートバッグ",
        detail: "A4サイズが入るキャンバス素材。",
        inStock: true,
        stock: 5,
    },
    {
        id: "3",
        name: "Banana Zine vol.1",
        price: 1650,
        description: "限定フォトジン",
        detail: "A5判、28ページ。",
        inStock: false,
        stock: 0,
    },
]

function formatPrice(price: number) {
    return `¥${price.toLocaleString("ja-JP")}`
}

export default function ShopPage() {
    const { isAdmin, user } = useAuth()
    const [products, setProducts] = useState<ShopProduct[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null)
    const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false)
    const [secretClickCount, setSecretClickCount] = useState(0)
    const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null)
    const [buyingId, setBuyingId] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [stripeConfigured, setStripeConfigured] = useState(true)

    const handleSecretClick = () => {
        setSecretClickCount((prev) => {
            const n = prev + 1
            if (n === 5) {
                setIsAdminLoginOpen(true)
                return 0
            }
            return n
        })
    }

    useEffect(() => {
        if (!db) {
            setProducts(defaultProducts)
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        const ref = collection(db, "artifacts", appId, "public", "data", "shop_products")
        const q = query(ref, orderBy("createdAt", "desc"))
        const unsubscribe = onSnapshot(
            q,
            (snap) => {
                const fetched: ShopProduct[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopProduct))
                setProducts(fetched.length > 0 ? fetched : defaultProducts)
                setIsLoading(false)
            },
            () => {
                setProducts(defaultProducts)
                setIsLoading(false)
            }
        )
        return () => unsubscribe()
    }, [])

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (!db || !confirm("この商品を削除しますか？")) return
        try {
            await deleteDoc(doc(db, "artifacts", appId, "public", "data", "shop_products", id))
        } catch {
            alert("削除に失敗しました。")
        }
    }

    const handleEdit = (e: React.MouseEvent, product: ShopProduct) => {
        e.stopPropagation()
        setEditingProduct(product)
        setIsEditorOpen(true)
    }

    const handleBuy = async (product: ShopProduct) => {
        if (!product.inStock) return
        setErrorMsg(null)
        setBuyingId(product.id)
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: product.name,
                    price: product.price,
                    description: product.description,
                    productId: product.id,
                }),
            })
            const data = await res.json()
            if (!res.ok || data.error) {
                if (data.error?.includes("No API key") || data.error?.includes("apiKey")) {
                    setStripeConfigured(false)
                    setErrorMsg("Stripe APIキーが設定されていません。環境変数 STRIPE_SECRET_KEY を設定してください。")
                } else {
                    setErrorMsg(data.error || "決済の準備に失敗しました")
                }
                return
            }
            if (data.url) {
                window.location.href = data.url
            }
        } catch {
            setErrorMsg("ネットワークエラーが発生しました")
        } finally {
            setBuyingId(null)
        }
    }

    return (
        <div className="min-h-screen bg-[#FAC800] text-black p-4 md:p-6 pt-24 md:pt-32 pb-20 relative">
            <HamburgerMenu onToggle={setIsMenuOpen} />

            {isAdmin && (
                <AdminPlusButton
                    onClick={() => {
                        setEditingProduct(null)
                        setIsEditorOpen(true)
                    }}
                    isVisible={!isMenuOpen}
                />
            )}

            <ShopProductEditorModal
                isOpen={isEditorOpen}
                onClose={() => {
                    setIsEditorOpen(false)
                    setEditingProduct(null)
                }}
                user={user}
                editingProduct={editingProduct}
            />

            <AdminLoginModal
                isOpen={isAdminLoginOpen}
                onClose={() => setIsAdminLoginOpen(false)}
            />

            {/* Product Detail Modal */}
            <AnimatePresence>
                {selectedProduct && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9000] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
                        onClick={() => setSelectedProduct(null)}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="bg-[#FAC800] w-full md:max-w-2xl max-h-[90vh] overflow-y-auto relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="absolute top-4 right-4 z-10 p-2 bg-black/10 hover:bg-black/20 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex flex-col md:flex-row">
                                <div className="w-full md:w-1/2 aspect-square bg-black/5 flex items-center justify-center overflow-hidden">
                                    {selectedProduct.image ? (
                                        <img
                                            src={selectedProduct.image}
                                            alt={selectedProduct.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-8xl opacity-30">🍌</div>
                                    )}
                                </div>
                                <div className="p-8 md:w-1/2 flex flex-col justify-between gap-6">
                                    <div>
                                        <p className="font-mono text-xs tracking-widest opacity-50 mb-2">HRK.877</p>
                                        <h2 className="text-3xl font-serif leading-tight mb-4">{selectedProduct.name}</h2>
                                        <p className="font-mono text-sm opacity-60 mb-2">{selectedProduct.description}</p>
                                        {selectedProduct.detail && (
                                            <p className="font-mono text-xs opacity-40 leading-relaxed">{selectedProduct.detail}</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-4xl font-serif mb-6">{formatPrice(selectedProduct.price)}</p>
                                        {errorMsg && (
                                            <div className="mb-4 p-3 bg-black/10 font-mono text-xs text-black/70 leading-relaxed">
                                                {errorMsg}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleBuy(selectedProduct)}
                                            disabled={!selectedProduct.inStock || buyingId === selectedProduct.id}
                                            className={`w-full py-4 font-mono text-sm tracking-widest transition-all flex items-center justify-center gap-3 ${
                                                selectedProduct.inStock
                                                    ? "bg-black text-[#FAC800] hover:bg-black/80 active:scale-95"
                                                    : "bg-black/20 text-black/40 cursor-not-allowed"
                                            }`}
                                        >
                                            {buyingId === selectedProduct.id ? (
                                                <>処理中...</>
                                            ) : selectedProduct.inStock ? (
                                                <><ShoppingBag size={16} /> 購入する</>
                                            ) : (
                                                <>SOLD OUT</>
                                            )}
                                        </button>
                                        {selectedProduct.inStock && selectedProduct.stock <= 3 && selectedProduct.stock > 0 && (
                                            <p className="font-mono text-xs opacity-50 mt-2 text-center">
                                                残り {selectedProduct.stock} 点
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start mb-6 md:mb-8 border-b border-black pb-4 md:pb-6">
                    <div>
                        <h1 className="text-7xl md:text-9xl font-serif font-thin leading-none">SHOP</h1>
                    </div>
                    <div className="text-left mt-6 md:mt-0 flex flex-col items-start gap-4">
                        <p className="font-mono text-lg md:text-xs opacity-60">
                            <span
                                className="cursor-pointer select-none hover:text-white transition-colors"
                                onClick={handleSecretClick}
                            >
                                HRK.877
                            </span>
                            <br />
                            Tokyo, Japan
                        </p>
                    </div>
                </header>

                {!stripeConfigured && (
                    <div className="mb-8 p-4 border border-black/20 bg-black/5 font-mono text-sm md:text-xs">
                        <p className="font-bold mb-1">STRIPE SETUP REQUIRED</p>
                        <p className="opacity-60">
                            決済を有効にするには環境変数 <code className="bg-black/10 px-1">STRIPE_SECRET_KEY</code> と{" "}
                            <code className="bg-black/10 px-1">NEXT_PUBLIC_BASE_URL</code> を設定してください。
                        </p>
                    </div>
                )}

                {isLoading ? (
                    <div className="py-20 flex items-center justify-center opacity-50">
                        <span className="font-mono text-base md:text-xs tracking-widest">
                            LOADING
                            <span className="inline-flex ml-1">
                                <span className="animate-bounce">.</span>
                                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                            </span>
                        </span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
                        {products.map((product, i) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: i * 0.08 }}
                                onClick={() => setSelectedProduct(product)}
                                className={`group cursor-pointer ${!product.inStock ? "opacity-60" : ""}`}
                            >
                                <div className="aspect-square bg-black/5 relative overflow-hidden mb-3 flex items-center justify-center">
                                    {product.image ? (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="text-6xl opacity-20 group-hover:scale-110 transition-transform duration-500">
                                            🍌
                                        </div>
                                    )}

                                    {!product.inStock && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="font-mono text-xs tracking-widest bg-black text-[#FAC800] px-3 py-1">
                                                SOLD OUT
                                            </span>
                                        </div>
                                    )}

                                    {isAdmin && (
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10">
                                            <button
                                                onClick={(e) => handleEdit(e, product)}
                                                className="p-2 bg-white text-black hover:bg-black hover:text-[#FAC800] rounded-full"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, product.id)}
                                                className="p-2 bg-white text-black hover:bg-red-500 hover:text-white rounded-full"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-black pt-3">
                                    <h3 className="font-serif text-xl md:text-2xl leading-tight group-hover:italic transition-all duration-300 mb-1">
                                        {product.name}
                                    </h3>
                                    <p className="font-mono text-xs opacity-50 mb-2">{product.description}</p>
                                    <p className="font-serif text-lg">{formatPrice(product.price)}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                <div className="mt-32 text-center">
                    <p className="font-serif text-2xl md:text-xl italic opacity-50">
                        &quot;Every object holds a curve.&quot;
                    </p>
                </div>
            </div>
        </div>
    )
}
