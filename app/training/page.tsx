"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "../components/providers/AuthProvider"
import { collection, addDoc, Timestamp, onSnapshot, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import HamburgerMenu from "../components/navigation/HamburgerMenu"
import LoginModal from "../components/modals/LoginModal"
import AccessDeniedModal from "../components/modals/AccessDeniedModal"
import { X, History } from "lucide-react"

interface Position {
    latitude: number
    longitude: number
    timestamp: number
}

interface RunningRecord {
    id: string
    distance: number
    duration: number
    pace: number
    timestamp: Timestamp
}

// Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatPace(distanceKm: number, seconds: number): string {
    if (distanceKm <= 0 || seconds <= 0) return "--:--"
    const paceSeconds = seconds / distanceKm
    return `${Math.floor(paceSeconds / 60)}:${Math.floor(paceSeconds % 60).toString().padStart(2, '0')}`
}

function formatDate(timestamp: Timestamp): string {
    const date = timestamp.toDate()
    return `${date.getMonth() + 1}/${date.getDate()}`
}

export default function RunningPage() {
    const { user, loading: authLoading, isAdmin, isWhitelisted } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
    const [isAccessDeniedOpen, setIsAccessDeniedOpen] = useState(false)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)

    const [isRunning, setIsRunning] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [distance, setDistance] = useState(0)
    const [elapsedTime, setElapsedTime] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [allRecords, setAllRecords] = useState<RunningRecord[]>([])

    const positionsRef = useRef<Position[]>([])
    const watchIdRef = useRef<number | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const startTimeRef = useRef<number>(0)
    const pausedTimeRef = useRef<number>(0)
    const wakeLockRef = useRef<WakeLockSentinel | null>(null)

    const isLoggedIn = Boolean(user && !user.isAnonymous)

    // Wake Lock
    const requestWakeLock = useCallback(async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
            }
        } catch (err) { }
    }, [])

    const releaseWakeLock = useCallback(() => {
        wakeLockRef.current?.release()
        wakeLockRef.current = null
    }, [])

    // Fetch all records
    useEffect(() => {
        if (authLoading || !user || user.isAnonymous) {
            setLoading(false)
            return
        }

        const recordsRef = collection(db, "users", user.uid, "training_records")
        const q = query(recordsRef, orderBy("timestamp", "desc"))

        const unsubscribe = onSnapshot(q, (snap) => {
            const records: RunningRecord[] = []
            snap.forEach(doc => records.push({ id: doc.id, ...doc.data() } as RunningRecord))
            setAllRecords(records)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [user, authLoading])

    const saveRecord = useCallback(async () => {
        if (!user || user.isAnonymous || distance <= 0) return
        const recordsRef = collection(db, "users", user.uid, "training_records")
        await addDoc(recordsRef, {
            distance,
            duration: elapsedTime,
            pace: elapsedTime / distance,
            timestamp: Timestamp.now()
        })
    }, [user, distance, elapsedTime])

    const startTracking = useCallback(() => {
        if (!isLoggedIn) { setIsLoginModalOpen(true); return }
        if (!isAdmin && !isWhitelisted) { setIsAccessDeniedOpen(true); return }
        if (!navigator.geolocation) { setError("GPS not supported"); return }

        setError(null)
        setIsRunning(true)
        setIsPaused(false)
        startTimeRef.current = Date.now() - pausedTimeRef.current

        requestWakeLock()

        timerRef.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }, 1000)

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const newPos: Position = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    timestamp: position.timestamp
                }
                const positions = positionsRef.current
                if (positions.length > 0) {
                    const lastPos = positions[positions.length - 1]
                    const dist = calculateDistance(lastPos.latitude, lastPos.longitude, newPos.latitude, newPos.longitude)
                    if (dist > 0.005) {
                        positionsRef.current.push(newPos)
                        setDistance(prev => prev + dist)
                    }
                } else {
                    positionsRef.current.push(newPos)
                }
            },
            (err) => setError(`GPS: ${err.message}`),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
    }, [isLoggedIn, isAdmin, isWhitelisted, requestWakeLock])

    const stopTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
        }
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
        pausedTimeRef.current = Date.now() - startTimeRef.current
        setIsRunning(false)
        setIsPaused(true)
        releaseWakeLock()
    }, [releaseWakeLock])

    const finishAndSave = useCallback(async () => {
        stopTracking()
        await saveRecord()
        setDistance(0)
        setElapsedTime(0)
        setIsPaused(false)
        positionsRef.current = []
        pausedTimeRef.current = 0
    }, [stopTracking, saveRecord])

    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
            if (timerRef.current) clearInterval(timerRef.current)
            releaseWakeLock()
        }
    }, [releaseWakeLock])

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isRunning) requestWakeLock()
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [isRunning, requestWakeLock])

    if (authLoading || (loading && isLoggedIn)) {
        return (
            <main className="min-h-screen bg-[#FAC800] flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-black/20 border-t-black animate-spin"></div>
            </main>
        )
    }

    if (!isAdmin && !isWhitelisted) {
        return (
            <main className="h-dvh bg-[#FAC800] flex items-center justify-center">
                <AccessDeniedModal isOpen={true} onClose={() => router.push('/')} />
            </main>
        )
    }

    // Calculate totals
    const totalDistance = allRecords.reduce((sum, r) => sum + r.distance, 0)
    const totalRuns = allRecords.length

    return (
        <div className="fixed inset-0 overflow-hidden bg-[#FAC800] text-black">
            <HamburgerMenu color="black" />

            {/* History Button */}
            {!isRunning && !isPaused && allRecords.length > 0 && (
                <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="absolute top-8.5 right-6 p-2 text-black/60 hover:text-black transition-colors z-50"
                >
                    <History size={24} strokeWidth={1.5} />
                </button>
            )}

            <div className="h-full flex flex-col items-center justify-center px-6">
                {/* Header */}
                {!isRunning && !isPaused && (
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-6xl font-serif tracking-[0.15em] mb-4">
                            RUNNING
                        </h1>
                        {totalRuns > 0 && (
                            <p className="text-sm tracking-[0.2em] opacity-50">
                                {totalDistance.toFixed(1)} KM TOTAL • {totalRuns} RUNS
                            </p>
                        )}
                    </div>
                )}

                {/* Running indicator */}
                {isRunning && (
                    <div className="absolute top-14 left-1/2 -translate-x-1/2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-xs tracking-[0.3em] font-mono opacity-60">REC</span>
                    </div>
                )}

                {/* Main Stats */}
                <div className="flex flex-col items-center mb-12">
                    {/* Distance - Large */}
                    <div className="text-center mb-6">
                        <div className="text-[4rem] md:text-[6rem] font-extralight font-mono leading-none tracking-tighter">
                            {distance.toFixed(2)}
                        </div>
                        <div className="text-xs tracking-[0.4em] opacity-40 mt-1">KILOMETERS</div>
                    </div>

                    {/* Time & Pace */}
                    <div className="flex gap-16 md:gap-24">
                        <div className="text-center">
                            <div className="text-2xl md:text-3xl font-extralight font-mono tracking-tight">
                                {formatTime(elapsedTime)}
                            </div>
                            <div className="text-[10px] tracking-[0.4em] opacity-40 mt-1">TIME</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl md:text-3xl font-extralight font-mono tracking-tight">
                                {formatPace(distance, elapsedTime)}
                            </div>
                            <div className="text-[10px] tracking-[0.4em] opacity-40 mt-1">MIN/KM</div>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="text-red-600 text-xs mb-6 text-center tracking-wider">
                        {error}
                    </div>
                )}

                {/* Controls */}
                <div className="flex gap-4">
                    {!isRunning && !isPaused && (
                        <button
                            onClick={startTracking}
                            className="w-20 h-20 rounded-full bg-black text-[#FAC800] font-mono text-sm tracking-widest flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                        >
                            GO
                        </button>
                    )}

                    {isRunning && (
                        <button
                            onClick={stopTracking}
                            className="w-20 h-20 rounded-full border-2 border-black text-black font-mono text-sm tracking-widest flex items-center justify-center hover:bg-black hover:text-[#FAC800] transition-all"
                        >
                            STOP
                        </button>
                    )}

                    {isPaused && (
                        <>
                            <button
                                onClick={startTracking}
                                className="w-16 h-16 rounded-full bg-black text-[#FAC800] font-mono text-xs tracking-wider flex items-center justify-center hover:scale-105 transition-transform"
                            >
                                GO
                            </button>
                            <button
                                onClick={finishAndSave}
                                className="w-16 h-16 rounded-full border-2 border-black text-black font-mono text-xs tracking-wider flex items-center justify-center hover:bg-black hover:text-[#FAC800] transition-all"
                            >
                                SAVE
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* History Modal */}
            <AnimatePresence>
                {isHistoryOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
                        onClick={() => setIsHistoryOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#FAC800] w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-black/10">
                                <h2 className="text-xl font-serif tracking-[0.15em]">HISTORY</h2>
                                <button
                                    onClick={() => setIsHistoryOpen(false)}
                                    className="text-black/50 hover:text-black transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Stats Summary */}
                            <div className="flex justify-around py-4 border-b border-black/10 bg-black/5">
                                <div className="text-center">
                                    <div className="text-2xl font-mono font-light">{totalDistance.toFixed(1)}</div>
                                    <div className="text-[10px] tracking-[0.3em] opacity-50">TOTAL KM</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-mono font-light">{totalRuns}</div>
                                    <div className="text-[10px] tracking-[0.3em] opacity-50">RUNS</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-mono font-light">
                                        {totalRuns > 0 ? (totalDistance / totalRuns).toFixed(1) : '0'}
                                    </div>
                                    <div className="text-[10px] tracking-[0.3em] opacity-50">AVG KM</div>
                                </div>
                            </div>

                            {/* Records List */}
                            <div className="flex-1 overflow-y-auto">
                                {allRecords.map((record, index) => (
                                    <div
                                        key={record.id}
                                        className="flex items-center justify-between px-6 py-4 border-b border-black/5 hover:bg-black/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-mono opacity-30 w-6">{index + 1}</span>
                                            <div>
                                                <div className="font-mono text-lg">{record.distance.toFixed(2)} km</div>
                                                <div className="text-xs opacity-50">{formatDate(record.timestamp)}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-sm">{formatTime(record.duration)}</div>
                                            <div className="text-xs opacity-50">{formatPace(record.distance, record.duration)} /km</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
            <AccessDeniedModal isOpen={isAccessDeniedOpen} onClose={() => setIsAccessDeniedOpen(false)} />
        </div>
    )
}
