import type { Metadata } from "next"
import HamburgerMenu from "../components/navigation/HamburgerMenu"

export const metadata: Metadata = {
    title: "SHOP",
    description:
        "877hand（BANANAHAND）のオンラインショップ。バナナ素材のプロダクトを近日公開予定。",
    alternates: {
        canonical: "https://877hand.vercel.app/shop",
    },
    openGraph: {
        title: "SHOP | 877hand",
        description:
            "877hand（BANANAHAND）のオンラインショップ。バナナ素材のプロダクトを近日公開予定。",
        url: "https://877hand.vercel.app/shop",
    },
}

export default function ShopPage() {
    return (
        <div className="min-h-dvh bg-[#FAC800] flex flex-col items-center justify-center">
            <HamburgerMenu />
            <h1 className="text-[clamp(4rem,18vw,14rem)] font-black tracking-tighter text-black leading-none text-center px-6">
                COMING<br />SOON
            </h1>
        </div>
    )
}
