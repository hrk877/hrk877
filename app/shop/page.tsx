import HamburgerMenu from "../components/navigation/HamburgerMenu"

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
