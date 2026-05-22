export type Product = {
    id: string
    name: string
    description: string
    price: number // 円
    stripePriceId: string // Stripeダッシュボードで作成したPrice ID
    emoji: string
    available: boolean
    comingSoon?: boolean
}

export const products: Product[] = [
    {
        id: "banana-sticker",
        name: "バナナステッカーパック",
        description: "877handオリジナルバナナステッカー。防水素材で屋外使用OK。5枚入り。",
        price: 800,
        stripePriceId: process.env.STRIPE_PRICE_STICKER ?? "",
        emoji: "🍌",
        available: true,
    },
    {
        id: "banana-ring",
        name: "バナナリング",
        description: "シルバー925製のバナナ型リング。受注生産・発送まで約3週間。",
        price: 12800,
        stripePriceId: process.env.STRIPE_PRICE_RING ?? "",
        emoji: "💍",
        available: true,
        comingSoon: true,
    },
    {
        id: "banana-tshirt",
        name: "877hand Tシャツ",
        description: "ユニセックスTシャツ。サイズはS/M/L/XLから選択。",
        price: 4800,
        stripePriceId: process.env.STRIPE_PRICE_TSHIRT ?? "",
        emoji: "👕",
        available: true,
    },
]
