"use client"

import { motion } from "framer-motion"

export default function Loading() {
    return (
        <div className="min-h-screen bg-[#FAC800] text-black p-4 md:p-6 pt-24 md:pt-32 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center space-y-8 max-w-7xl mx-auto w-full">
                <header className="w-full flex flex-col md:flex-row justify-between items-start mb-12 border-b border-black pb-6 animate-pulse">
                    <h1 className="text-7xl md:text-9xl font-serif font-thin leading-none tracking-tighter">STATS</h1>
                    <div className="text-left mt-6 md:mt-0">
                        <p className="font-mono text-xs opacity-40 tracking-widest uppercase">
                            LOADING ANALYTICS
                            <span className="inline-flex ml-1">
                                <span className="animate-bounce">.</span>
                                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                            </span>
                        </p>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full opacity-20">
                    <div className="aspect-square border border-black/10 bg-black/5 flex flex-col justify-center items-center p-12">
                        <div className="w-24 h-1 bg-black/20 animate-pulse" />
                    </div>
                    <div className="aspect-square border border-black/10 bg-black/5 flex flex-col justify-center items-center p-12">
                        <div className="w-24 h-1 bg-black/20 animate-pulse" />
                    </div>
                </div>

                <div className="w-full mt-24 text-center opacity-30">
                    <p className="font-serif text-2xl md:text-xl italic">&quot;Counting the bananas...&quot;</p>
                </div>
            </div>
        </div>
    )
}
