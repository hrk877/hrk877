"use client"

import { useRef } from "react"
import Image from "next/image"
import { motion, useInView } from "framer-motion"

const SHOP_URL = "https://877hand.base.shop"

type PhilosophyData = {
    no: string
    title: string
    subtitle: string
    desc: string
    image?: string
    imageAlt: string
    href?: string
}

const PhilosophyImage = ({ data }: { data: PhilosophyData }) => {
    const frame = (
        <div className="relative w-full aspect-[4/3] overflow-hidden">
            {data.image ? (
                <Image
                    src={data.image}
                    alt={data.imageAlt}
                    fill
                    sizes="(min-width: 768px) 320px, 80vw"
                    className="object-cover object-[50%_54%]"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center font-mono text-[#FAC800] text-xs tracking-[0.3em] opacity-40">
                    PHOTO COMING
                </div>
            )}
        </div>
    )
    if (!data.href) return frame
    return (
        <a
            href={data.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${data.title} — SHOP`}
            className="block transition-opacity duration-500 hover:opacity-80"
        >
            {frame}
        </a>
    )
}

const PhilosophyItem = ({ data }: { data: PhilosophyData }) => {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: false, amount: 0.5 })

    return (
        <div ref={ref} className="min-h-[80vh] flex flex-col justify-center py-20 relative">
            <div className="max-w-4xl mx-auto px-6 w-full relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={isInView ? { opacity: 0.1, x: 0 } : { opacity: 0, x: -50 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="font-mono text-[9rem] md:text-[15rem] leading-none absolute -top-14 md:-top-20 left-0 xl:-left-20 font-bold text-[#FAC800] select-none pointer-events-none"
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
                    className="border-l-2 border-[#FAC800] pl-6 md:pl-10 ml-2 flex flex-col gap-8"
                >
                    <div className="w-full max-w-[16rem] md:w-64 shrink-0">
                        <PhilosophyImage data={data} />
                    </div>
                    <div className="flex-1">
                        <p className="font-mono text-[#FAC800] text-sm tracking-[0.2em] mb-6 uppercase opacity-70">
                            {data.subtitle}
                        </p>
                        <p className="text-[#FAC800] text-xl md:text-2xl font-serif leading-loose opacity-90 max-w-2xl">
                            {data.desc}
                        </p>
                        {data.href && (
                            <div className="max-w-2xl text-right">
                                <a
                                    href={data.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-8 font-mono text-[#FAC800] text-sm tracking-[0.2em] opacity-70 transition-opacity duration-500 hover:opacity-100"
                                >
                                    → SHOP
                                </a>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

const Philosophy = () => {
    const slides: PhilosophyData[] = [
        {
            no: "01",
            title: "Craft",
            subtitle: "Made by hand",
            desc: "877handは、バナナをモチーフにした作品を作るブランドです。バナナの独創的で美しい形を、日常に取り入れられるプロダクトに落とし込んでいます。ひとつひとつ、人の手で作っています。",
            image: "/philosophy/craft.jpg",
            imageAlt: "縫製で作られたバナナの皮の立体作品",
            href: SHOP_URL,
        },
        {
            no: "02",
            title: "Material",
            subtitle: "Banapee Skin",
            desc: "Banapee Skinは、廃棄されるバナナの皮から生まれる植物由来の素材です。ふだん捨てられてしまう皮が、新しいプロダクトに生まれ変わります。その面白さを、ぜひ覗いてみてください。",
            image: "/philosophy/material.jpg",
            imageAlt: "バナピースキンの質感",
            href: SHOP_URL,
        },
        {
            no: "03",
            title: "Community",
            subtitle: "Live like a banana",
            desc: "フィリピンのバナナと共に暮らす村。バナナは実るだけではなく、人をつなぐものでした。877handは、バナナのように生きる人の集まりです。",
            image: "/philosophy/community.jpg",
            imageAlt: "バナナの木の前で紙飛行機で遊ぶフィリピンの子どもたち",
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
