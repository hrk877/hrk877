"use client"

import { motion } from "framer-motion"
import { Bell, BellOff } from "lucide-react"

interface NotificationToggleProps {
    enabled: boolean
    onChange: (enabled: boolean) => void
    label?: string
}

export const NotificationToggle = ({ enabled, onChange, label = "NOTIFY COMMUNITY" }: NotificationToggleProps) => {
    return (
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => onChange(!enabled)}>
            <div className="flex flex-col items-end">
                <span className="font-mono text-[10px] tracking-[0.2em] text-black/40 group-hover:text-black/60 transition-colors">
                    {label}
                </span>
                <span className="font-mono text-[8px] tracking-widest opacity-20">
                    {enabled ? "ON" : "OFF"}
                </span>
            </div>

            <div className={`relative w-12 h-6 rounded-full transition-colors duration-500 flex items-center px-1 ${enabled ? 'bg-black' : 'bg-black/10'}`}>
                <motion.div
                    animate={{ x: enabled ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${enabled ? 'bg-[#FAC800]' : 'bg-white'}`}
                >
                    {enabled ? (
                        <Bell size={8} className="text-black" />
                    ) : (
                        <BellOff size={8} className="text-black/40" />
                    )}
                </motion.div>
            </div>
        </div>
    )
}
