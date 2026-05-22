"use client"

import { useState } from "react"
import HamburgerMenu from "../components/navigation/HamburgerMenu"
import { products } from "../data/products"

export default function ShopPage() {
    const [loading, setLoading] = useState<string | null>(null)

    const handleBuy = async (priceId: string, productName: string, productId: string) => {
        if (!priceId) {
            alert("現在準備中です。もうしばらくお待ちください。")
            return
        }
        setLoading(productId)
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ priceId, productName }),
            })
            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                alert("エラーが発生しました。もう一度お試しください。")
            }
        } catch {
            alert("エラーが発生しました。もう一度お試しください。")
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="min-h-dvh bg-[#FAC800]">
            <HamburgerMenu />

            <div className="pt-20 pb-16 px-5 max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                    <p className="text-xs font-bold tracking-[0.2em] text-black/50 mb-1">877hand</p>
                    <h1 className="text-5xl font-black tracking-tighter text-black">SHOP</h1>
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="bg-black rounded-2xl p-6 flex flex-col gap-4"
                        >
                            {/* Emoji */}
                            <div className="text-5xl">{product.emoji}</div>

                            {/* Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-white font-bold text-lg leading-tight">
                                        {product.name}
                                    </h2>
                                    {product.comingSoon && (
                                        <span className="text-[10px] font-bold bg-[#FAC800] text-black px-2 py-0.5 rounded-full shrink-0">
                                            受注生産
                                        </span>
                                    )}
                                </div>
                                <p className="text-white/60 text-sm leading-relaxed">
                                    {product.description}
                                </p>
                            </div>

                            {/* Price + Button */}
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-[#FAC800] font-black text-2xl">
                                    ¥{product.price.toLocaleString()}
                                </span>
                                <button
                                    onClick={() =>
                                        handleBuy(product.stripePriceId, product.name, product.id)
                                    }
                                    disabled={loading === product.id || !product.available}
                                    className="bg-[#FAC800] text-black font-bold text-sm px-5 py-2.5 rounded-full disabled:opacity-50 active:scale-95 transition-transform"
                                >
                                    {loading === product.id ? "処理中..." : "購入する"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Links */}
                <div className="mt-12 flex flex-col gap-2 text-sm text-black/50">
                    <a href="/tokushoho" className="underline underline-offset-2 w-fit">
                        特定商取引法に基づく表記
                    </a>
                    <p>決済はStripeにより安全に処理されます。</p>
                </div>
            </div>
        </div>
    )
}
