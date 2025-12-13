"use client"

interface FooterProps {
    isAdmin: boolean
    handleSecretClick: () => void
    handleLogout: () => void
}

const Footer = ({ isAdmin, handleSecretClick, handleLogout }: FooterProps) => {
    return (
        <footer className="h-[50vh] md:h-[60vh] flex flex-col justify-between p-4 md:p-12 bg-black text-[#FAC800] border-t border-black relative overflow-hidden z-0">
            <div className="flex flex-col md:flex-row justify-between z-10">
                <div className="flex flex-col gap-3 mb-6 md:mb-0">
                    <span className="font-bold text-2xl md:text-3xl">hrk.877</span>
                    <span className="font-mono text-lg md:text-xs max-w-xs leading-relaxed opacity-60">
                        Digital homage to the yellow curve.
                        <br />
                        Designed for banana lovers.
                    </span>
                </div>
                <div className="flex flex-col text-left font-mono text-lg md:text-xs gap-3">
                    {isAdmin && (
                        <button onClick={handleLogout} className="text-left hover:text-white transition-colors uppercase">
                            LOGOUT (ADMIN)
                        </button>
                    )}
                </div>
            </div>
            <div className="absolute left-0 bottom-0 w-full text-center pointer-events-none">
                <h2 className="text-[25vw] md:text-[30vw] leading-none font-bold tracking-tighter opacity-[0.05] select-none text-white">
                    BANANA
                </h2>
            </div>
            <div className="flex justify-between items-end font-mono text-base md:text-xs uppercase opacity-40 z-10 pt-4">
                <span
                    onClick={handleSecretClick}
                    className="cursor-pointer select-none hover:text-white transition-colors"
                    title="5 clicks to login"
                >
                    © 2025 HRK.877
                </span>
                <span>TOKYO / JAPAN</span>
            </div>
        </footer>
    )
}

export default Footer
