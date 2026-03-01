"use client"

interface AdminPlusButtonProps {
    onClick: () => void
    isVisible?: boolean
    className?: string
}

export default function AdminPlusButton({
    onClick,
    isVisible = true,
    className = "top-9.5 right-6"
}: AdminPlusButtonProps) {
    if (!isVisible) return null

    return (
        <button
            onClick={onClick}
            className={`absolute z-[101] p-4 -mr-4 -mt-4 focus:outline-none mix-blend-difference text-[#FAC800] ${className}`}
            aria-label="Admin Action"
        >
            <div className="relative w-8 h-8 flex items-center justify-center">
                {/* Horizontal line */}
                <div className="absolute w-full h-[1px] bg-current" />
                {/* Vertical line */}
                <div className="absolute h-full w-[1px] bg-current" />
            </div>
        </button>
    )
}
