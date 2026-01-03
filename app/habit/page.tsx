"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "../components/providers/AuthProvider"
import { doc, getDoc, setDoc, updateDoc, Timestamp, onSnapshot, collection } from "firebase/firestore"
import { db } from "@/lib/firebase"
import HamburgerMenu from "../components/navigation/HamburgerMenu"
import LoginModal from "../components/modals/LoginModal"
import AccessDeniedModal from "../components/modals/AccessDeniedModal"
import { Plus, X } from "lucide-react"

// ==========================================
// CONFIGURATION: PIXEL ART DATA
// ==========================================

type PixelType = 'border' | 'stem' | 'tip' | 'body'
type PixelShade = 'light' | 'medium' | 'dark'

interface PixelData {
    x: number
    y: number
    type: PixelType
    shade?: PixelShade
}

// Provided by User
const BANANA_PIXELS: PixelData[] = [
    // Upper Stem (Black/Border)
    { x: 6, y: 0, type: 'border' },
    { x: 7, y: 0, type: 'border' },

    { x: 5, y: 1, type: 'border' },
    { x: 6, y: 1, type: 'border' },
    { x: 7, y: 1, type: 'border' },

    { x: 4, y: 2, type: 'stem' },
    { x: 5, y: 2, type: 'stem' },
    { x: 6, y: 2, type: 'border' },

    // Upper Body
    { x: 3, y: 3, type: 'border' },
    { x: 4, y: 3, type: 'body', shade: 'light' },
    { x: 5, y: 3, type: 'body', shade: 'light' },
    { x: 6, y: 3, type: 'body', shade: 'medium' },
    { x: 7, y: 3, type: 'border' },

    { x: 2, y: 4, type: 'border' },
    { x: 3, y: 4, type: 'body', shade: 'light' },
    { x: 4, y: 4, type: 'body', shade: 'light' },
    { x: 5, y: 4, type: 'body', shade: 'medium' },
    { x: 6, y: 4, type: 'body', shade: 'dark' },
    { x: 7, y: 4, type: 'border' },

    { x: 1, y: 5, type: 'border' },
    { x: 2, y: 5, type: 'body', shade: 'light' },
    { x: 3, y: 5, type: 'body', shade: 'light' },
    { x: 4, y: 5, type: 'body', shade: 'medium' },
    { x: 5, y: 5, type: 'body', shade: 'dark' },
    { x: 6, y: 5, type: 'border' },

    { x: 1, y: 6, type: 'border' },
    { x: 2, y: 6, type: 'body', shade: 'light' },
    { x: 3, y: 6, type: 'body', shade: 'medium' },
    { x: 4, y: 6, type: 'body', shade: 'medium' },
    { x: 5, y: 6, type: 'body', shade: 'dark' },
    { x: 6, y: 6, type: 'border' },

    // Middle Body
    { x: 1, y: 7, type: 'border' },
    { x: 2, y: 7, type: 'body', shade: 'light' },
    { x: 3, y: 7, type: 'body', shade: 'medium' },
    { x: 4, y: 7, type: 'body', shade: 'dark' },
    { x: 5, y: 7, type: 'border' },

    { x: 1, y: 8, type: 'border' },
    { x: 2, y: 8, type: 'body', shade: 'light' },
    { x: 3, y: 8, type: 'body', shade: 'medium' },
    { x: 4, y: 8, type: 'body', shade: 'dark' },
    { x: 5, y: 8, type: 'border' },

    { x: 1, y: 9, type: 'border' },
    { x: 2, y: 9, type: 'body', shade: 'light' },
    { x: 3, y: 9, type: 'body', shade: 'medium' },
    { x: 4, y: 9, type: 'body', shade: 'dark' },
    { x: 5, y: 9, type: 'border' },

    { x: 1, y: 10, type: 'border' },
    { x: 2, y: 10, type: 'body', shade: 'light' },
    { x: 3, y: 10, type: 'body', shade: 'medium' },
    { x: 4, y: 10, type: 'body', shade: 'dark' },
    { x: 5, y: 10, type: 'border' },

    { x: 1, y: 11, type: 'border' },
    { x: 2, y: 11, type: 'body', shade: 'light' },
    { x: 3, y: 11, type: 'body', shade: 'medium' },
    { x: 4, y: 11, type: 'body', shade: 'dark' },
    { x: 5, y: 11, type: 'border' },

    { x: 1, y: 12, type: 'border' },
    { x: 2, y: 12, type: 'body', shade: 'light' },
    { x: 3, y: 12, type: 'body', shade: 'light' },
    { x: 4, y: 12, type: 'body', shade: 'medium' },
    { x: 5, y: 12, type: 'body', shade: 'dark' },
    { x: 6, y: 12, type: 'border' },

    { x: 2, y: 13, type: 'border' },
    { x: 3, y: 13, type: 'body', shade: 'light' },
    { x: 4, y: 13, type: 'body', shade: 'medium' },
    { x: 5, y: 13, type: 'body', shade: 'dark' },
    { x: 6, y: 13, type: 'border' },

    { x: 2, y: 14, type: 'border' },
    { x: 3, y: 14, type: 'body', shade: 'light' },
    { x: 4, y: 14, type: 'body', shade: 'medium' },
    { x: 5, y: 14, type: 'body', shade: 'dark' },
    { x: 6, y: 14, type: 'border' },

    { x: 3, y: 15, type: 'border' },
    { x: 4, y: 15, type: 'body', shade: 'light' },
    { x: 5, y: 15, type: 'body', shade: 'medium' },
    { x: 6, y: 15, type: 'body', shade: 'dark' },
    { x: 7, y: 15, type: 'border' },

    { x: 3, y: 16, type: 'border' },
    { x: 4, y: 16, type: 'body', shade: 'light' },
    { x: 5, y: 16, type: 'body', shade: 'medium' },
    { x: 6, y: 16, type: 'body', shade: 'dark' },
    { x: 7, y: 16, type: 'border' },

    { x: 4, y: 17, type: 'border' },
    { x: 5, y: 17, type: 'body', shade: 'light' },
    { x: 6, y: 17, type: 'body', shade: 'medium' },
    { x: 7, y: 17, type: 'border' },

    // Tip (Green/Stem) - Currently set to body by user request
    { x: 5, y: 18, type: 'border' },
    { x: 6, y: 18, type: 'body', shade: 'medium' },
    { x: 7, y: 18, type: 'body', shade: 'dark' },
    { x: 8, y: 18, type: 'border' },

    { x: 6, y: 19, type: 'border' },
    { x: 7, y: 19, type: 'border' },
    { x: 8, y: 19, type: 'border' },
]

// ==========================================
// HELPERS
// ==========================================

// Calculate total body pixels for progress tracking
const BODY_PIXELS = BANANA_PIXELS.filter(p => p.type === 'body')
const TOTAL_DOTS = BODY_PIXELS.length // Automatically count body pixels

// Assign index to body pixels for tracking order
const TRACKABLE_PIXELS = BANANA_PIXELS.map((p, originalIndex) => ({ ...p, originalIndex }))
    .filter(p => p.type === 'body')
// Map original index to progress index (0 to TOTAL_DOTS-1)
const PIXEL_INDEX_MAP = new Map<number, number>()
TRACKABLE_PIXELS.forEach((p, i) => PIXEL_INDEX_MAP.set(p.originalIndex, i))

// NEW INTERFACE
interface HabitLog {
    id: string
    text: string
    timestamp: Timestamp
    cycle: number
    count: number
}

export default function HabitPage() {
    const { user, loading: authLoading, isAdmin, isWhitelisted } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
    const [isAccessDeniedOpen, setIsAccessDeniedOpen] = useState(false)
    const [habitState, setHabitState] = useState({
        count: 0,
        cycle: 0,
        lastPressed: null as Timestamp | null
    })
    const [justPressed, setJustPressed] = useState(false)

    // Modals
    const [entryText, setEntryText] = useState("")
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)

    // Logs Data
    const [logs, setLogs] = useState<Record<string, HabitLog>>({})
    const [selectedLog, setSelectedLog] = useState<HabitLog | null>(null)

    // 1. Fetch Data
    useEffect(() => {
        if (authLoading) return

        if (!user || user.isAnonymous) {
            setLoading(false)
            return
        }

        // Main State Listener
        const docRef = doc(db, "users", user.uid, "habit_tracker", "877")
        const unsubscribeDoc = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                setHabitState(snap.data() as any)
            } else {
                setDoc(docRef, { count: 0, cycle: 0, lastPressed: null })
            }
            setLoading(false)
        })

        // Logs Listener
        const logsRef = collection(db, "users", user.uid, "habit_tracker", "877", "logs")
        const unsubscribeLogs = onSnapshot(logsRef, (snap) => {
            const newLogs: Record<string, HabitLog> = {}
            snap.forEach(doc => {
                const data = doc.data()
                newLogs[doc.id] = { id: doc.id, ...data } as HabitLog
            })
            setLogs(newLogs)
        })

        return () => {
            unsubscribeDoc()
            unsubscribeLogs()
        }
    }, [user, authLoading])

    // Logic
    const isToday = (ts: Timestamp | null) => {
        if (!ts) return false
        const date = ts.toDate()
        const now = new Date()
        return date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
    }
    const hasPressedToday = isToday(habitState.lastPressed)

    const isLoggedIn = Boolean(user && !user.isAnonymous)

    const handlePress = async () => {
        if (!isLoggedIn) {
            setIsLoginModalOpen(true)
            return
        }

        if (!isAdmin && !isWhitelisted) {
            setIsAccessDeniedOpen(true)
            return
        }
        if (hasPressedToday) return

        setIsEntryModalOpen(false)
        setJustPressed(true)
        setTimeout(() => setJustPressed(false), 2000)

        const docRef = doc(db, "users", user!.uid, "habit_tracker", "877")
        const logsCollectionRef = collection(docRef, "logs")

        let newCount = habitState.count + 1
        let newCycle = habitState.cycle
        const MAX_COUNT = TOTAL_DOTS * 2

        if (habitState.count >= MAX_COUNT) {
            newCount = 1
            newCycle += 1
        }

        const batchUpdate = {
            count: newCount,
            cycle: newCycle,
            lastPressed: Timestamp.now(),
            lastMemo: entryText
        }

        await updateDoc(docRef, batchUpdate)

        // Save Log
        const logId = `${newCycle}_${newCount}`
        await setDoc(doc(logsCollectionRef, logId), {
            text: entryText,
            timestamp: Timestamp.now(),
            cycle: newCycle,
            count: newCount
        })

        setEntryText("")
    }

    // Create a deterministic shuffle for the "sugar spots" phase
    const SHUFFLED_INDICES = Array.from({ length: TOTAL_DOTS }, (_, i) => i)
        .map(value => ({ value, sort: (Math.sin(value * 123.45) * 10000) % 1 }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)

    const SHUFFLED_PIXEL_INDEX_MAP = new Map<number, number>()
    TRACKABLE_PIXELS.forEach((p, i) => SHUFFLED_PIXEL_INDEX_MAP.set(p.originalIndex, SHUFFLED_INDICES[i]))

    // Color Logic & Click Logic
    const MAX_COUNT = TOTAL_DOTS * 2

    const handlePixelClick = (i: number, type: PixelType) => {
        if (type !== 'body' || !isLoggedIn) return

        if (!isAdmin && !isWhitelisted) {
            setIsAccessDeniedOpen(true)
            return
        }

        const { count, cycle } = habitState
        const isPhaseTwo = count > TOTAL_DOTS

        let bodyIndex: number | undefined
        let targetLogId: string | null = null

        if (!isPhaseTwo) {
            // Phase 1 (Green -> Yellow)
            bodyIndex = PIXEL_INDEX_MAP.get(i)
            if (bodyIndex !== undefined && bodyIndex < count) {
                targetLogId = `${cycle}_${bodyIndex + 1}`
            }
        } else {
            // Phase 2 (Yellow -> Brown)
            const phaseTwoCount = count - TOTAL_DOTS
            const shuffledIndex = SHUFFLED_PIXEL_INDEX_MAP.get(i)

            if (shuffledIndex !== undefined && shuffledIndex < phaseTwoCount) {
                // It is Brown
                targetLogId = `${cycle}_${TOTAL_DOTS + shuffledIndex + 1}`
            } else {
                // It is Yellow (Phase 1 finished)
                bodyIndex = PIXEL_INDEX_MAP.get(i)
                if (bodyIndex !== undefined) {
                    targetLogId = `${cycle}_${bodyIndex + 1}`
                }
            }
        }

        if (targetLogId && logs[targetLogId]) {
            setSelectedLog(logs[targetLogId])
        }
    }

    const getPixelColor = (pixel: PixelData, index: number) => {
        // Fixed Colors
        if (pixel.type === 'border') return '#000000'
        if (pixel.type === 'stem') return '#1c1917'
        if (pixel.type === 'tip') return '#16a34a'

        // Body (Variable)
        if (pixel.type === 'body') {
            const { count } = habitState

            const isPhaseTwo = count > TOTAL_DOTS

            if (!isPhaseTwo) {
                // PHASE 1: FILLING YELLOW
                const bodyIndex = PIXEL_INDEX_MAP.get(index)
                if (bodyIndex === undefined) return '#333'

                const isActive = isLoggedIn && bodyIndex < count
                const state = isActive ? 'yellow' : 'green'
                return getShadedColor(state, pixel.shade)

            } else {
                // PHASE 2: SPOTTING BROWN
                const bodyIndex = SHUFFLED_PIXEL_INDEX_MAP.get(index)
                if (bodyIndex === undefined) return '#333'

                const phaseTwoCount = count - TOTAL_DOTS

                const isActive = isLoggedIn && bodyIndex < phaseTwoCount
                const state = isActive ? 'brown' : 'yellow'
                return getShadedColor(state, pixel.shade)
            }
        }
        return '#333'
    }

    const getShadedColor = (colorState: string, shade: PixelShade = 'medium') => {
        switch (colorState) {
            case 'green':
                if (shade === 'light') return '#34d399' // emerald-400
                if (shade === 'medium') return '#22c55e' // green-500
                return '#16a34a' // green-600 (dark)
            case 'yellow':
                if (shade === 'light') return '#ffeb3b' // Vivid Yellow
                if (shade === 'medium') return '#ffd700' // Gold
                return '#fbc02d' // Darker Gold/Amber
            case 'brown':
                if (shade === 'light') return '#b45309' // amber-700
                if (shade === 'medium') return '#92400e' // amber-800
                return '#78350f' // amber-900 (Darker brown)
            default:
                return '#666'
        }
    }

    if (authLoading || (loading && isLoggedIn)) {
        return (
            <main className="min-h-screen bg-[#FAC800] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border border-black/10 animate-spin-slow"></div>
            </main>
        )
    }

    // PAGE GUARD: ACCESS DENIED IF NOT ADMIN/WHITELISTED
    if (!isAdmin && !isWhitelisted) {
        return (
            <main className="h-dvh bg-[#FAC800] flex items-center justify-center">
                <AccessDeniedModal isOpen={true} onClose={() => router.push('/')} />
            </main>
        )
    }

    // Scale multiplier for pixels
    const PIXEL_SIZE = 26
    const GRID_WIDTH = 10 * PIXEL_SIZE
    const GRID_HEIGHT = 20 * PIXEL_SIZE

    return (
        <main className="h-dvh bg-[#FAC800] text-[#1a1a1a] font-mono flex flex-col items-center relative overflow-hidden">

            {/* Background / Menu */}
            <div className="absolute top-0 left-0 z-50">
                <HamburgerMenu color="black" />
            </div>

            {/* Top Right Action Button */}
            {!hasPressedToday && (
                <button
                    onClick={() => {
                        if (!isLoggedIn) {
                            setIsLoginModalOpen(true)
                            return
                        }
                        if (!isAdmin && !isWhitelisted) {
                            setIsAccessDeniedOpen(true)
                            return
                        }
                        setIsEntryModalOpen(true)
                    }}
                    className="absolute top-9 right-6 z-50 p-4 -mr-4 -mt-4 text-black hover:scale-110 transition-transform"
                >
                    <Plus size={32} strokeWidth={0.75} />
                </button>
            )}

            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl px-4 py-8 z-10">

                {/* Header */}
                <header className="mb-4 mt-2 text-center shrink-0">
                    <h1 className="text-2xl md:text-3xl font-serif tracking-[0.2em] text-black mb-2 leading-tight md:leading-normal">
                        HABIT<br className="block md:hidden" /> TRACKER
                    </h1>
                    <div className="flex items-center justify-center gap-4 text-xs md:text-xs tracking-[0.3em] opacity-60">
                        {isLoggedIn ? (
                            <>
                                <span>DAY {habitState.cycle * TOTAL_DOTS + habitState.count}</span>
                                <span>/</span>
                                <span>CYCLE {habitState.cycle + 1}</span>
                            </>
                        ) : (
                            <span>LOGIN REQUIRED</span>
                        )}
                    </div>
                </header>

                {/* Banana Visualization */}
                <div className="relative flex-1 flex items-center justify-center w-full">
                    <div
                        className="relative transition-transform duration-500"
                        style={{ width: GRID_WIDTH, height: GRID_HEIGHT }}
                    >
                        {BANANA_PIXELS.map((pixel, i) => {
                            const color = getPixelColor(pixel, i)
                            return (
                                <motion.div
                                    key={i}
                                    onClick={() => handlePixelClick(i, pixel.type)}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1, backgroundColor: color }}
                                    transition={{ duration: 0.2, delay: i * 0.005 }}
                                    className={`absolute rounded-[1px] border border-black/5 ${pixel.type === 'body' && isLoggedIn ? 'cursor-pointer hover:border-black/30' : ''
                                        }`}
                                    style={{
                                        width: PIXEL_SIZE,
                                        height: PIXEL_SIZE,
                                        left: pixel.x * PIXEL_SIZE,
                                        top: pixel.y * PIXEL_SIZE,
                                        boxShadow: pixel.type === 'body' && isLoggedIn && PIXEL_INDEX_MAP.get(i)! < habitState.count
                                            ? `0 0 10px ${color}`
                                            : 'none'
                                    }}
                                />
                            )
                        })}
                    </div>

                    {justPressed && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-black font-serif text-3xl tracking-[0.2em] bg-[#FAC800]/90 px-6 py-4 border border-black"
                            >
                                DELICIOUS!
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>

            {/* Entry Modal */}
            <AnimatePresence>
                {isEntryModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-md p-8 border border-black relative"
                        >
                            <button
                                onClick={() => setIsEntryModalOpen(false)}
                                className="absolute top-4 right-4 text-black/50 hover:text-black transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <h2 className="font-serif text-xl tracking-[0.2em] mb-8 text-center">WHAT DID YOU DO?</h2>

                            <textarea
                                value={entryText}
                                onChange={(e) => setEntryText(e.target.value)}
                                placeholder="I ate a banana..."
                                className="w-full h-32 bg-transparent border border-black p-4 font-serif text-lg md:text-xl text-black focus:outline-none focus:bg-black/5 mb-8 resize-none placeholder:text-black/30 leading-relaxed"
                                autoFocus
                            />

                            <button
                                onClick={handlePress}
                                disabled={!entryText.trim()}
                                className="w-full py-4 bg-black text-[#FAC800] font-serif tracking-[0.2em] hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                RIPEN
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View Log Modal */}
            <AnimatePresence>
                {selectedLog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedLog(null)}
                        className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-pointer"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white w-full max-w-md p-8 border border-black relative"
                        >
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="absolute top-4 right-4 text-black/50 hover:text-black transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <div className="text-center font-serif tracking-[0.2em] mb-6 opacity-50 text-sm">
                                DAY {selectedLog.cycle * TOTAL_DOTS + selectedLog.count}
                            </div>

                            <div className="font-serif text-lg md:text-xl text-center leading-relaxed text-black">
                                {selectedLog.text}
                            </div>

                            <div className="text-center mt-6 opacity-30 text-xs font-mono tracking-widest">
                                {selectedLog.timestamp.toDate().toLocaleDateString()}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
            <AccessDeniedModal isOpen={isAccessDeniedOpen} onClose={() => setIsAccessDeniedOpen(false)} />
        </main>
    )
}
