"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

const TermsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="bg-[#FAFAFA] w-full max-w-2xl max-h-[85vh] shadow-xl relative flex flex-col rounded-sm overflow-hidden font-sans text-gray-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 px-4 py-4 md:px-8 md:py-6 border-b border-gray-100 flex justify-between items-center bg-white relative z-20">
                            <h2 className="text-xl md:text-2xl font-serif tracking-in-expand text-black">Terms & Privacy</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 transition-colors rounded-full text-black"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto px-8 py-10 space-y-12 text-sm leading-8 text-justify">

                            {/* Intro */}
                            <section>
                                <p className="opacity-80">
                                    HRK.877へようこそ。ここは有機的な曲線と、少しの遊び心でできたデジタル空間です。
                                    <br />
                                    あなたがこの場所（877hand、Museum、Letter、AI等）を利用するとき、私たちはいくつかの約束を共有します。
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-serif mb-4 flex items-center gap-3 opacity-90">
                                    <span className="text-xs font-mono bg-black text-white px-2 py-1">01</span>
                                    Identity & Account
                                </h3>
                                <p className="opacity-80">
                                    Google認証の向こう側で、あなたには「Finger ID」という唯一の指紋が与えられます。
                                    <br />
                                    これはあなたがあなたであることを証明する大切な鍵です。誰かに貸したり、譲ったりしないでください。この指紋で行われたすべての行為は、あなたの意思として扱われます。
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-serif mb-4 flex items-center gap-3 opacity-90">
                                    <span className="text-xs font-mono bg-black text-white px-2 py-1">02</span>
                                    Notifications
                                </h3>
                                <p className="opacity-80">
                                    思考の種（バナナ）が落ちてきたとき、美術館に新しい作品が飾られたとき、あるいは日誌が更新されたとき。
                                    <br />
                                    私たちはその知らせを、あなたのメールボックスへ届けます。ログインすることは、この静かな招待状を受け取ることに同意することを意味します。
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-serif mb-4 flex items-center gap-3 opacity-90">
                                    <span className="text-xs font-mono bg-black text-white px-2 py-1">03</span>
                                    Banana AI & Memory
                                </h3>
                                <p className="opacity-80">
                                    Banana AIとの対話は、すべてデジタルの地層として記録されます。
                                    <br />
                                    あなたの言葉はAIの栄養となり、より賢く、より深く思考するための糧（学習データ）となります。ただし、真実の名前や住所といった個人情報は、ここには埋めないでください。
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-serif mb-4 flex items-center gap-3 opacity-90">
                                    <span className="text-xs font-mono bg-black text-white px-2 py-1">04</span>
                                    The Void (Letter)
                                </h3>
                                <p className="opacity-80">
                                    管理者への手紙（Letter）は、完全な暗闇を通じて届きます。
                                    <br />
                                    Finger IDもメールアドレスも、ここには介在しません。誰にも知られない、完全な匿名性が保証された場所で、あなたの真実の声を届けてください。
                                </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-serif mb-4 flex items-center gap-3 opacity-90">
                                    <span className="text-xs font-mono bg-black text-white px-2 py-1">05</span>
                                    Privacy Policy
                                </h3>
                                <div className="space-y-4 opacity-80">
                                    <p>
                                        <strong>情報の取得：</strong> ログイン時にGoogleアカウントのメールアドレスとアイコンをお預かりします。これらはあなたを識別し、通知を届けるためにのみ使用されます。
                                    </p>
                                    <p>
                                        <strong>第三者への提供：</strong> 法令に基づく場合を除き、あなたの同意なく個人情報を誰かに渡すことはありません。
                                    </p>
                                    <p>
                                        <strong>Cookieと分析：</strong> サイトの使い心地を良くするために、CookieとGoogleアナリティクスを使用しています。これらは匿名の足跡として記録されます。
                                    </p>
                                </div>
                            </section>

                            <section className="pt-8 border-t border-gray-100">
                                <p className="font-mono text-xs opacity-40 text-right">LAST UPDATED: 2025.12</p>
                            </section>
                        </div>

                        {/* Footer Action */}
                        <div className="flex-shrink-0 p-6 bg-white border-t border-gray-100 flex justify-center z-20">
                            <button
                                onClick={onClose}
                                className="w-full bg-black text-[#FAC800] py-4 font-mono text-sm tracking-[0.2em] hover:bg-[#333] transition-colors active:scale-95 duration-200"
                            >
                                AGREE & CLOSE
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default TermsModal
