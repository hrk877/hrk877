"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"

const PhilosophyItem = ({
    data,
}: {
    data: { no: string; title: string; subtitle: string; desc: string }
}) => {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: false, amount: 0.5 })

    return (
        <div ref={ref} className="min-h-[80vh] flex flex-col justify-center py-20 relative">
            <div className="max-w-4xl mx-auto px-6 w-full relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={isInView ? { opacity: 0.1, x: 0 } : { opacity: 0, x: -50 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="font-mono text-[12rem] md:text-[15rem] leading-none absolute -top-20 -left-10 md:-left-20 font-bold text-[#FAC800] select-none pointer-events-none"
                >
                    {data.no}
                </motion.div>

                <div className="relative overflow-hidden mb-4">
                    <motion.h3
                        initial={{ y: "100%" }}
                        animate={isInView ? { y: 0 } : { y: "100%" }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                        className="text-6xl md:text-9xl font-thin text-[#FAC800] leading-tight"
                    >
                        {data.title}
                    </motion.h3>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="border-l-2 border-[#FAC800] pl-6 md:pl-10 ml-2"
                >
                    <p className="font-mono text-[#FAC800] text-sm tracking-[0.2em] mb-6 uppercase opacity-70">
                        {data.subtitle}
                    </p>
                    <p className="text-[#FAC800] text-xl md:text-2xl font-serif leading-loose opacity-90 max-w-2xl">
                        {data.desc}
                    </p>
                </motion.div>
            </div>
        </div>
    )
}

const Philosophy = () => {
    const slides = [
        {
            no: "01",
            title: "Curve",
            subtitle: "The miracle of negative geotropism",
            desc: "バナナの曲線は、重力への反逆である。果実は最初、地面に向かって成長するが、やがて太陽を求め、重力に逆らって上へと首を持ち上げる。「負の向地性」と呼ばれるこの現象こそが、あの美しい曲線を生み出している。",
        },
        {
            no: "02",
            title: "Color",
            subtitle: "Visualization of time",
            desc: "緑から黄色、そして茶色へ。バナナほど雄弁に自らの「時」を語る果物はない。シュガースポット（茶色の斑点）は劣化ではなく、糖度が最高潮に達した証である。我々は色を通じて、自然のリズムを体感する。",
        },
        {
            no: "03",
            title: "Unity",
            subtitle: "Individual yet collective",
            desc: "バナナは一本では実らない。必ず「ハンド（房）」と呼ばれる集団で成長する。この「バナナハンド」としての構造は、それぞれが独立した個体でありながら、一つの茎を共有し、互いに支え合いながら空を目指す。この姿は、理想的なコミュニティの在り方を示唆している。",
        },
    ]

    return (
        <section id="philosophy" className="bg-black py-20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#FAC800] to-transparent opacity-10 pointer-events-none" />
            <div className="container mx-auto">
                <div className="mb-20 px-6 md:px-12 text-center">
                    <span className="font-mono text-[#FAC800] text-xs tracking-[0.3em] opacity-40 block mb-4">
                        SECTION 01 — PHILOSOPHY
                    </span>
                    <h2 className="text-[#FAC800] text-4xl md:text-6xl font-thin italic opacity-80">The Aesthetics</h2>
                </div>

                <div>
                    {slides.map((s, i) => (
                        <PhilosophyItem key={i} data={s} />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Philosophy
