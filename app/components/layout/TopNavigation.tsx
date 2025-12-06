"use client"

const TopNavigation = ({ onNavigate }: { onNavigate: (page: string, section?: string | null) => void }) => {
    const navItems = [
        { name: "JOURNAL", page: "home", section: "blog" },
        { name: "MUSEUM", page: "museum", section: null },
        { name: "AI", page: "ai", section: null },
        { name: "LETTER", page: "letter", section: null },
    ]

    return (
        <nav className="absolute top-0 left-0 w-full z-[100] px-6 py-6 md:px-12 md:py-8 flex justify-center md:justify-end items-center">
            <div className="flex items-center gap-6 md:gap-12 font-mono text-xs tracking-[0.2em]">
                {navItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => onNavigate(item.page, item.section)}
                        className="relative group overflow-hidden py-1"
                    >
                        <span className="relative z-10 group-hover:text-black/60 transition-colors">{item.name}</span>
                        <span className="absolute bottom-0 left-0 w-full h-[1px] bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform origin-right group-hover:origin-left duration-300" />
                    </button>
                ))}
            </div>
        </nav>
    )
}

export default TopNavigation
