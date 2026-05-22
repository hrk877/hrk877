import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-04-22.dahlia",
})

export async function POST(req: NextRequest) {
    try {
        const { priceId, productName } = await req.json()

        if (!priceId) {
            return NextResponse.json({ error: "priceId is required" }, { status: 400 })
        }

        const origin = req.headers.get("origin") ?? "https://877hand.vercel.app"

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/shop/cancel`,
            locale: "ja",
            shipping_address_collection: {
                allowed_countries: ["JP"],
            },
            metadata: {
                productName,
            },
        })

        return NextResponse.json({ url: session.url })
    } catch (error) {
        console.error("Stripe checkout error:", error)
        return NextResponse.json({ error: "決済セッションの作成に失敗しました" }, { status: 500 })
    }
}
