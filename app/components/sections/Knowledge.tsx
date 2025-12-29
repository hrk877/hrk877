"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"

const AccordionItem = ({
    item,
    isOpen,
    onClick,
    index,
}: {
    item: { label: string; title: string; text: string }
    isOpen: boolean
    onClick: () => void
    index: number
}) => {
    return (
        <div className="border-b border-black/10 last:border-none">
            <button onClick={onClick} className="w-full flex items-center justify-between py-8 md:py-10 group text-left">
                <div className="flex items-baseline gap-6 md:gap-12">
                    <span className="font-serif text-2xl md:text-3xl opacity-20 group-hover:opacity-40 transition-opacity">
                        0{index + 1}
                    </span>
                    <div className="flex flex-col items-start gap-2">
                        <span className="font-mono text-[10px] tracking-widest border border-black/20 rounded-full px-2 py-0.5 uppercase group-hover:bg-black group-hover:text-white transition-colors">
                            {item.label}
                        </span>
                        <h3 className="text-2xl md:text-5xl font-serif font-light group-hover:translate-x-2 transition-transform duration-300">
                            {item.title}
                        </h3>
                    </div>
                </div>
                <div
                    className={`transform transition-transform duration-500 ${isOpen ? "rotate-180" : "rotate-0"
                        } opacity-30 group-hover:opacity-100`}
                >
                    <ChevronDown size={32} strokeWidth={1} />
                </div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="pl-16 md:pl-32 pr-4 pb-10">
                            <p className="font-serif text-lg md:text-xl leading-loose text-black/70 max-w-2xl">{item.text}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const Knowledge = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    const facts = [
        {
            label: "ENERGY",
            title: "THE PERFECT FUEL",
            text: "バナナの糖質は、即効性のあるブドウ糖、持続性のある果糖とショ糖が奇跡的なバランスで構成されている。この時間差によるエネルギー供給が、脳と身体を長時間覚醒させ続ける。アスリートからクリエイターまで、全てのパフォーマンスを支える自然が生んだ究極のフューエル。",
        },
        {
            label: "HAPPINESS",
            title: "NATURAL RELAXATION",
            text: "幸せホルモン「セロトニン」の生成に不可欠なトリプトファン、そして高ぶった神経を鎮めるGABA。これらを豊富に含むバナナは、食べるだけでメンタルをチューニングする天然のサプリメントである。その優しい甘さは、現代の忙しい日々に深い安らぎと集中をもたらす。",
        },
        {
            label: "BEAUTY",
            title: "BEAUTIFUL LIFE",
            text: "強力な抗酸化作用を持つポリフェノール、むくみを一掃するカリウム、そして腸内環境をデザインする食物繊維。これらが三位一体となり、身体の内側から透き通るような美しさを構築する。それは高価な美容液以上に価値のある、輝くためのミニマルな習慣だ。",
        },
    ]

    return (
        <section id="knowledge" className="py-20 md:py-40 px-4 md:px-12 bg-[#FAFAFA] text-black relative z-10">
            <div className="max-w-6xl mx-auto">
                <div className="mb-12 md:mb-20">
                    <span className="font-mono text-sm md:text-xs tracking-widest opacity-40 block mb-3">SECTION 02</span>
                    <h2 className="text-6xl md:text-8xl font-thin tracking-tight">Knowledge</h2>
                </div>
                <div className="border-t border-black/10">
                    {facts.map((f, i) => (
                        <AccordionItem
                            key={i}
                            item={f}
                            index={i}
                            isOpen={openIndex === i}
                            onClick={() => setOpenIndex(openIndex === i ? null : i)}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Knowledge
