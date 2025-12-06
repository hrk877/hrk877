"use client"

import { useRef } from "react"
import {
    motion,
    useScroll,
    useTransform,
    useSpring,
    useMotionValue,
    useVelocity,
    useAnimationFrame,
} from "framer-motion"

export const ParallaxText = ({ baseVelocity = 100, children }: { baseVelocity?: number; children: React.ReactNode }) => {
    const baseX = useMotionValue(0)
    const { scrollY } = useScroll()
    const scrollVelocity = useVelocity(scrollY)
    const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 })
    const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false })
    const directionFactor = useRef(1)

    const x = useTransform(baseX, (v) => {
        const range = 25
        const wrapped = ((v % range) + range) % range
        return `-${25 - wrapped}%`
    })

    useAnimationFrame((t, delta) => {
        let moveBy = directionFactor.current * baseVelocity * (delta / 1000)
        if (velocityFactor.get() < 0) directionFactor.current = -1
        else if (velocityFactor.get() > 0) directionFactor.current = 1
        moveBy += directionFactor.current * moveBy * velocityFactor.get()
        baseX.set(baseX.get() + moveBy)
    })

    return (
        <div className="overflow-hidden whitespace-nowrap flex flex-nowrap border-y border-black/5 py-4 md:py-6 bg-white/50 backdrop-blur-sm">
            <motion.div
                className="flex whitespace-nowrap text-5xl md:text-8xl font-bold uppercase tracking-tighter text-black/10"
                style={{ x }}
            >
                {[...Array(4)].map((_, i) => (
                    <span key={i} className="block mr-8 md:mr-12">
                        {children}{" "}
                    </span>
                ))}
            </motion.div>
        </div>
    )
}
