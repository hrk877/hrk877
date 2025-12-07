"use client"

import Link from "next/link"

const TopNavigation = () => {
    return (
        <nav className="absolute top-0 left-0 w-full z-[100] px-6 py-6 md:px-12 md:py-8 flex justify-center md:justify-end items-center">
            <div className="flex items-center gap-6 md:gap-12 font-mono text-xs tracking-[0.2em]">
                <button
                    onClick={() => {
                        const journalSection = document.getElementById("blog")
                        journalSection?.scrollIntoView({ behavior: "smooth" })
                    }}
                    className="relative group overflow-hidden py-1"
                >
                    <span className="relative z-10 group-hover:text-black/60 transition-colors">JOURNAL</span>
                    <span className="absolute bottom-0 left-0 w-full h-[1px] bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform origin-right group-hover:origin-left duration-300" />
                </button>
                <Link href="/museum" className="relative group overflow-hidden py-1">
                    <span className="relative z-10 group-hover:text-black/60 transition-colors">MUSEUM</span>
                    <span className="absolute bottom-0 left-0 w-full h-[1px] bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform origin-right group-hover:origin-left duration-300" />
                </Link>
                <Link href="/ai" className="relative group overflow-hidden py-1">
                    <span className="relative z-10 group-hover:text-black/60 transition-colors">AI</span>
                    <span className="absolute bottom-0 left-0 w-full h-[1px] bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform origin-right group-hover:origin-left duration-300" />
                </Link>
                <Link href="/letter" className="relative group overflow-hidden py-1">
                    <span className="relative z-10 group-hover:text-black/60 transition-colors">LETTER</span>
                    <span className="absolute bottom-0 left-0 w-full h-[1px] bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform origin-right group-hover:origin-left duration-300" />
                </Link>
            </div>
        </nav>
    )
}

export default TopNavigation
