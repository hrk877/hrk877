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
            label: "GENETICS",
            title: "The Cavendish Paradox",
            text: "現在流通しているバナナの99%は「キャベンディッシュ種」である。これらは種がなく、株分け（クローン）で増殖する。つまり、世界中のバナナは遺伝的に同一であり、一つの病原菌で全滅するリスクを抱えている。",
        },
        {
            label: "PHYSICS",
            title: "Friction Coefficient",
            text: "「バナナの皮で滑る」は漫画の表現ではない。2014年のイグノーベル賞研究により、バナナの皮の内側の摩擦係数は約0.07であることが証明された。これは氷の上を歩くのとほぼ同等の滑りやすさである。",
        },
        {
            label: "RADIOACTIVITY",
            title: "Banana Equivalent Dose",
            text: "バナナにはカリウム40が含まれており、ごく微量の放射線を出している。「バナナ等価線量(BED)」という単位さえ存在するが、人体に影響を与えるには一度に数千万本を摂取する必要があるため、全くの無害である。",
        },
        {
            label: "BOTANY",
            title: "It's a Berry",
            text: "驚くべきことに、植物学上の分類ではバナナは「ベリー（液果）」の一種である。一方、イチゴやラズベリーは植物学的にはベリーではない。この分類の矛盾もまた、バナナのミステリアスな魅力の一つだ。",
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
