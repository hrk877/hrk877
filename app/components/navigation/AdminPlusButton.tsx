"use client"

import { motion } from "framer-motion"
import { Plus } from "lucide-react"

interface AdminPlusButtonProps {
    onClick: () => void
    isVisible?: boolean
}

export default function AdminPlusButton({ onClick, isVisible = true }: AdminPlusButtonProps) {
    if (!isVisible) return null

    return (
        <button
            onClick={onClick}
            className="absolute top-12 right-6 z-[101] p-4 -mr-4 -mt-4 focus:outline-none mix-blend-difference text-[#FAC800]"
            aria-label="Admin Action"
        >
            <Plus size={32} strokeWidth={1} />
        </button>
    )
}
