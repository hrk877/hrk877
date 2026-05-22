import HamburgerMenu from "../components/navigation/HamburgerMenu"
import Link from "next/link"

export default function TokushohoPage() {
    return (
        <div className="min-h-dvh bg-[#FAC800]">
            <HamburgerMenu />
            <div className="pt-20 pb-16 px-5 max-w-2xl mx-auto">
                <p className="text-xs font-bold tracking-[0.2em] text-black/50 mb-1">877hand</p>
                <h1 className="text-3xl font-black tracking-tighter text-black mb-10">
                    特定商取引法に基づく表記
                </h1>

                <div className="bg-black rounded-2xl p-6 space-y-5 text-sm">
                    {[
                        { label: "販売業者", value: "877hand" },
                        { label: "運営責任者", value: "請求があり次第、遅滞なく開示します" },
                        { label: "所在地", value: "請求があり次第、遅滞なく開示します" },
                        { label: "電話番号", value: "請求があり次第、遅滞なく開示します" },
                        { label: "メールアドレス", value: "877hand@gmail.com" },
                        { label: "販売価格", value: "各商品ページに記載の価格（税込）" },
                        { label: "送料", value: "全国一律 ¥500（¥5,000以上で送料無料）" },
                        { label: "支払方法", value: "クレジットカード（Stripe）" },
                        { label: "支払時期", value: "ご注文時にお支払いが確定します" },
                        { label: "商品の引き渡し時期", value: "ご注文から5〜14営業日以内に発送（受注生産品は約3週間）" },
                        { label: "返品・交換", value: "商品到着後7日以内に877hand@gmail.comまでご連絡ください。不良品の場合は送料当社負担で対応いたします。お客様都合による返品はお受けできません。" },
                    ].map(({ label, value }) => (
                        <div key={label} className="grid grid-cols-[120px_1fr] gap-3">
                            <span className="text-[#FAC800] font-bold shrink-0">{label}</span>
                            <span className="text-white/80 leading-relaxed">{value}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-8">
                    <Link href="/shop" className="text-black/60 underline underline-offset-2 text-sm">
                        ← ショップに戻る
                    </Link>
                </div>
            </div>
        </div>
    )
}
