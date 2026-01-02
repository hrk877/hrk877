"use client"

import { useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowDown } from "lucide-react"
import { useRouter } from "next/navigation"

import BananaScene from "../3d/BananaScene"

const Hero = () => {
    const router = useRouter()
    const { scrollY } = useScroll()
    const y2 = useTransform(scrollY, [0, 500], [0, -50])
    const title = "877hand"

    // Sequence Logic: Indices 0, 1, 2 for '877'
    const [tapSequenceIndex, setTapSequenceIndex] = useState(0)
    const targetSequence = [0, 1, 2]

    const handleCharTap = (index: number) => {
        const expectedIndex = targetSequence[tapSequenceIndex]

        if (index === expectedIndex) {
            // Correct character tapped in sequence
            if (tapSequenceIndex === targetSequence.length - 1) {
                // Success: Navigate to Hand
                router.push("/finger")
                setTapSequenceIndex(0)
            } else {
                setTapSequenceIndex(prev => prev + 1)
            }
        } else {
            // Incorrect - Reset
            if (index === 0) {
                setTapSequenceIndex(1)
            } else {
                setTapSequenceIndex(0)
            }
        }
    }

    return (
        <section className="h-[100svh] relative flex flex-col items-center justify-center p-4 md:p-12 overflow-hidden">
            <BananaScene />
            {/* pointer-events-none to allow clicking through to 3D scene, but enable for children text */}
            <div className="flex flex-col items-center relative z-50 w-full pointer-events-none">
                <div className="flex justify-center w-full">
                    <div className="flex items-baseline relative whitespace-nowrap">
                        {title.split("").map((char, index) => (
                            <motion.span
                                key={index}
                                className="text-[27vw] md:text-[18vw] leading-[0.8] font-semibold tracking-tighter mix-blend-overlay text-black select-none cursor-default pointer-events-auto cursor-pointer"
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 + index * 0.1, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                                whileHover={{ y: -20, rotate: index % 2 === 0 ? 5 : -5, transition: { duration: 0.3 } }}
                                whileTap={{ y: -20, rotate: index % 2 === 0 ? 5 : -5, transition: { duration: 0.3 } }}
                                onPointerDown={(e) => {
                                    e.preventDefault()
                                    handleCharTap(index)
                                }}
                            >
                                {char}
                            </motion.span>
                        ))}
                    </div>
                </div>

                <motion.div
                    style={{ y: y2 }}
                    className="mt-10 md:mt-20 text-center relative z-20 px-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                >
                    <p className="text-3xl md:text-5xl lg:text-6xl font-serif font-light italic leading-tight tracking-tight max-w-[90vw] md:max-w-5xl mx-auto">
                        <span className="block">We Curve the World</span>
                        <span className="block mt-2 md:mt-3">with the Banana life</span>
                    </p>
                    <div className="mt-8 font-mono text-sm md:text-xs opacity-60 tracking-widest">EST. 2025 — TOKYO</div>
                </motion.div>
            </div>

            <motion.div
                className="absolute bottom-8 flex flex-col items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
            >
                <span className="font-mono text-sm md:text-xs tracking-widest opacity-50">SCROLL TO EXPLORE</span>
                <ArrowDown size={20} strokeWidth={1} className="animate-bounce opacity-50" />
            </motion.div>
        </section>
    )
}

export default Hero
