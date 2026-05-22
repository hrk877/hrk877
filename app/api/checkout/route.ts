import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-04-22.dahlia",
})

export async function POST(request: Request) {
    try {
        const { name, price, description, quantity = 1, productId } = await request.json()

        if (!name || !price) {
            return NextResponse.json({ error: "商品情報が不足しています" }, { status: 400 })
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "jpy",
                        product_data: {
                            name,
                            ...(description ? { description } : {}),
                        },
                        unit_amount: price,
                    },
                    quantity,
                },
            ],
            mode: "payment",
            success_url: `${baseUrl}/shop/success?session_id={CHECKOUT_SESSION_ID}&product_id=${productId || ""}`,
            cancel_url: `${baseUrl}/shop`,
            locale: "ja",
        })

        return NextResponse.json({ url: session.url })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "決済の準備に失敗しました"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
