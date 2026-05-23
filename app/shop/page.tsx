import HamburgerMenu from "../components/navigation/HamburgerMenu"

export default function ShopPage() {
    return (
        <div className="min-h-dvh bg-[#FAC800] flex flex-col items-center justify-center">
            <HamburgerMenu />
            <div className="flex flex-col items-center text-center px-6">
                <p className="font-mono text-xs font-bold tracking-[0.3em] text-black/40 mb-6 uppercase">
                    877hand Shop
                </p>
                <h1 className="text-[clamp(4rem,18vw,14rem)] font-black tracking-tighter text-black leading-none">
                    COMING<br />SOON
                </h1>
            </div>
        </div>
    )
}
