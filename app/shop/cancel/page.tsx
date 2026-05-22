import HamburgerMenu from "../../components/navigation/HamburgerMenu"
import Link from "next/link"

export default function CancelPage() {
    return (
        <div className="min-h-dvh bg-[#FAC800] flex flex-col items-center justify-center px-5">
            <HamburgerMenu />
            <div className="text-center">
                <div className="text-7xl mb-6">🫤</div>
                <h1 className="text-4xl font-black tracking-tighter text-black mb-3">
                    キャンセルされました
                </h1>
                <p className="text-black/60 mb-8">
                    購入がキャンセルされました。<br />
                    またいつでもどうぞ。
                </p>
                <Link
                    href="/shop"
                    className="bg-black text-[#FAC800] font-bold px-8 py-3 rounded-full inline-block"
                >
                    ショップに戻る
                </Link>
            </div>
        </div>
    )
}
