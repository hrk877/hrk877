import HamburgerMenu from "../../components/navigation/HamburgerMenu"
import Link from "next/link"

export default function SuccessPage() {
    return (
        <div className="min-h-dvh bg-[#FAC800] flex flex-col items-center justify-center px-5">
            <HamburgerMenu />
            <div className="text-center">
                <div className="text-7xl mb-6">🍌</div>
                <h1 className="text-4xl font-black tracking-tighter text-black mb-3">
                    ありがとうございます
                </h1>
                <p className="text-black/60 mb-8 leading-relaxed">
                    ご購入が完了しました。<br />
                    確認メールをご確認ください。
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
