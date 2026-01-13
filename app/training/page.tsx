"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../components/providers/AuthProvider"
import { doc, collection, addDoc, setDoc, deleteDoc, Timestamp, onSnapshot, query, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import HamburgerMenu from "../components/navigation/HamburgerMenu"
import LoginModal from "../components/modals/LoginModal"
import AccessDeniedModal from "../components/modals/AccessDeniedModal"

interface Position {
    latitude: number
    longitude: number
    timestamp: number
}

interface TrainingRecord {
    id: string
    distance: number // km
    duration: number // seconds
    pace: number // seconds per km
    timestamp: Timestamp
}

interface ActiveSession {
    startTime: number // ms since epoch
    distance: number // km
    positions: Position[]
    isRunning: boolean
}

// Haversine formula to calculate distance between two GPS coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

// Format time as MM:SS or HH:MM:SS
function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Format pace as M:SS /km
function formatPace(distanceKm: number, seconds: number): string {
    if (distanceKm <= 0 || seconds <= 0) return "--:--"
    const paceSeconds = seconds / distanceKm
    const mins = Math.floor(paceSeconds / 60)
    const secs = Math.floor(paceSeconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function TrainingPage() {
    const { user, loading: authLoading, isAdmin, isWhitelisted } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
    const [isAccessDeniedOpen, setIsAccessDeniedOpen] = useState(false)

    const [isRunning, setIsRunning] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [distance, setDistance] = useState(0) // in km
    const [elapsedTime, setElapsedTime] = useState(0) // in seconds
    const [error, setError] = useState<string | null>(null)
    const [recentRecords, setRecentRecords] = useState<TrainingRecord[]>([])
    const [hasActiveSession, setHasActiveSession] = useState(false)

    const positionsRef = useRef<Position[]>([])
    const watchIdRef = useRef<number | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const startTimeRef = useRef<number>(0)
    const wakeLockRef = useRef<WakeLockSentinel | null>(null)
    const saveIntervalRef = useRef<NodeJS.Timeout | null>(null)

    const isLoggedIn = Boolean(user && !user.isAnonymous)

    // Wake Lock API - Prevent screen sleep
    const requestWakeLock = useCallback(async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
                console.log('Wake Lock activated')
            }
        } catch (err) {
            console.log('Wake Lock failed:', err)
        }
    }, [])

    const releaseWakeLock = useCallback(() => {
        if (wakeLockRef.current) {
            wakeLockRef.current.release()
            wakeLockRef.current = null
            console.log('Wake Lock released')
        }
    }, [])

    // Save active session to Firebase
    const saveActiveSession = useCallback(async () => {
        if (!user || user.isAnonymous) return

        const sessionRef = doc(db, "users", user.uid, "training_active", "current")
        await setDoc(sessionRef, {
            startTime: startTimeRef.current,
            distance: distance,
            positions: positionsRef.current.slice(-100), // Keep last 100 positions
            isRunning: isRunning,
            lastUpdate: Date.now()
        })
    }, [user, distance, isRunning])

    // Clear active session from Firebase
    const clearActiveSession = useCallback(async () => {
        if (!user || user.isAnonymous) return

        const sessionRef = doc(db, "users", user.uid, "training_active", "current")
        await deleteDoc(sessionRef).catch(() => { })
    }, [user])

    // Fetch recent records and check for active session
    useEffect(() => {
        if (authLoading) return

        if (!user || user.isAnonymous) {
            setLoading(false)
            return
        }

        // Check for active session
        const sessionRef = doc(db, "users", user.uid, "training_active", "current")
        const unsubscribeSession = onSnapshot(sessionRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data() as ActiveSession & { lastUpdate: number }
                // Only restore if session is less than 24 hours old
                const isRecent = Date.now() - data.lastUpdate < 24 * 60 * 60 * 1000
                if (isRecent && data.startTime) {
                    setHasActiveSession(true)
                    startTimeRef.current = data.startTime
                    setDistance(data.distance || 0)
                    positionsRef.current = data.positions || []
                    // Calculate elapsed time from start
                    const elapsed = Math.floor((Date.now() - data.startTime) / 1000)
                    setElapsedTime(elapsed)
                    setIsPaused(true) // Show resume option
                }
            }
        })

        // Fetch recent records
        const recordsRef = collection(db, "users", user.uid, "training_records")
        const q = query(recordsRef, orderBy("timestamp", "desc"), limit(5))

        const unsubscribeRecords = onSnapshot(q, (snap) => {
            const records: TrainingRecord[] = []
            snap.forEach(doc => {
                records.push({ id: doc.id, ...doc.data() } as TrainingRecord)
            })
            setRecentRecords(records)
            setLoading(false)
        })

        return () => {
            unsubscribeSession()
            unsubscribeRecords()
        }
    }, [user, authLoading])

    // Auto-save session every 10 seconds while running
    useEffect(() => {
        if (isRunning) {
            saveIntervalRef.current = setInterval(() => {
                saveActiveSession()
            }, 10000)
        }
        return () => {
            if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current)
            }
        }
    }, [isRunning, saveActiveSession])

    // Save record to Firebase
    const saveRecord = useCallback(async () => {
        if (!user || user.isAnonymous) return
        if (elapsedTime <= 0) return // Only require some time elapsed

        const recordsRef = collection(db, "users", user.uid, "training_records")
        await addDoc(recordsRef, {
            distance,
            duration: elapsedTime,
            pace: elapsedTime / distance,
            timestamp: Timestamp.now()
        })
    }, [user, distance, elapsedTime])

    // Start GPS tracking
    const startTracking = useCallback(() => {
        if (!isLoggedIn) {
            setIsLoginModalOpen(true)
            return
        }

        if (!isAdmin && !isWhitelisted) {
            setIsAccessDeniedOpen(true)
            return
        }

        if (!navigator.geolocation) {
            setError("位置情報がサポートされていません")
            return
        }

        setError(null)
        setIsRunning(true)
        setIsPaused(false)
        setHasActiveSession(false)

        // If resuming, keep the original start time
        if (!startTimeRef.current) {
            startTimeRef.current = Date.now()
        }

        // Request Wake Lock
        requestWakeLock()

        // Start timer
        timerRef.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }, 1000)

        // Start GPS watching
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
                    const dist = calculateDistance(
                        lastPos.latitude, lastPos.longitude,
                        newPos.latitude, newPos.longitude
                    )
                    // Only add if moved more than 5 meters (filter GPS noise)
                    if (dist > 0.005) {
                        positionsRef.current.push(newPos)
                        setDistance(prev => prev + dist)
                    }
                } else {
                    positionsRef.current.push(newPos)
                }
            },
            (err) => {
                setError(`GPS Error: ${err.message}`)
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        )

        // Save session immediately
        saveActiveSession()
    }, [isLoggedIn, isAdmin, isWhitelisted, requestWakeLock, saveActiveSession])

    // Stop/Pause tracking
    const stopTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
        }
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
        setIsRunning(false)
        setIsPaused(true)
        releaseWakeLock()
        saveActiveSession()
    }, [releaseWakeLock, saveActiveSession])

    // Finish and save
    const finishAndSave = useCallback(async () => {
        stopTracking()
        await saveRecord()
        await clearActiveSession()
        // Reset
        setDistance(0)
        setElapsedTime(0)
        setIsPaused(false)
        setHasActiveSession(false)
        positionsRef.current = []
        startTimeRef.current = 0
    }, [stopTracking, saveRecord, clearActiveSession])

    // Cleanup on unmount (but save session first)
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
            }
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
            if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current)
            }
            releaseWakeLock()
        }
    }, [releaseWakeLock])

    // Re-request wake lock when page becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isRunning) {
                requestWakeLock()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [isRunning, requestWakeLock])

    if (authLoading || (loading && isLoggedIn)) {
        return (
            <main className="min-h-screen bg-[#FAC800] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border border-black/10 animate-spin"></div>
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

    return (
        <div className="fixed inset-0 overflow-hidden bg-[#FAC800] text-black">
            <HamburgerMenu color="black" />

            <div className="h-full flex flex-col items-center justify-center px-6">
                {/* Title */}
                {!isRunning && !isPaused && (
                    <h1 className="text-3xl md:text-5xl font-serif tracking-[0.2em] mb-16">
                        TRAINING
                    </h1>
                )}

                {/* Running indicator */}
                {isRunning && (
                    <div className="absolute top-12 right-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs tracking-widest opacity-60">RECORDING</span>
                    </div>
                )}

                {/* Stats Display */}
                <div className="flex flex-col items-center gap-8 mb-12">
                    {/* Distance */}
                    <div className="text-center">
                        <div className="text-6xl md:text-8xl font-light font-mono tracking-tight">
                            {distance.toFixed(2)}
                        </div>
                        <div className="text-sm tracking-[0.3em] opacity-60 mt-2">KM</div>
                    </div>

                    {/* Time & Pace */}
                    <div className="flex gap-12 md:gap-16">
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-light font-mono">
                                {formatTime(elapsedTime)}
                            </div>
                            <div className="text-xs tracking-[0.3em] opacity-60 mt-1">TIME</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-light font-mono">
                                {formatPace(distance, elapsedTime)}
                            </div>
                            <div className="text-xs tracking-[0.3em] opacity-60 mt-1">/KM</div>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="text-red-600 text-sm mb-6 text-center">
                        {error}
                    </div>
                )}

                {/* Controls */}
                <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-6">
                        {!isRunning && !isPaused && (
                            <button
                                onClick={startTracking}
                                className="px-10 py-4 bg-black text-[#FAC800] font-mono text-lg tracking-widest hover:bg-black/80 transition-colors"
                            >
                                START
                            </button>
                        )}

                        {isRunning && (
                            <button
                                onClick={stopTracking}
                                className="px-10 py-4 border-2 border-black text-black font-mono text-lg tracking-widest hover:bg-black hover:text-[#FAC800] transition-colors"
                            >
                                STOP
                            </button>
                        )}

                        {isPaused && (
                            <>
                                <button
                                    onClick={startTracking}
                                    className="px-8 py-4 bg-black text-[#FAC800] font-mono text-lg tracking-widest hover:bg-black/80 transition-colors"
                                >
                                    RESUME
                                </button>
                                <button
                                    onClick={finishAndSave}
                                    className="px-8 py-4 border-2 border-black text-black font-mono text-lg tracking-widest hover:bg-black hover:text-[#FAC800] transition-colors"
                                >
                                    SAVE
                                </button>
                            </>
                        )}
                    </div>

                </div>

                {/* Recent Records */}
                {!isRunning && !isPaused && recentRecords.length > 0 && (
                    <div className="mt-16 w-full max-w-md">
                        <div className="text-xs tracking-[0.3em] opacity-60 mb-4 text-center">RECENT</div>
                        <div className="space-y-2">
                            {recentRecords.map((record) => (
                                <div key={record.id} className="flex justify-between items-center py-2 border-b border-black/10">
                                    <span className="text-xs opacity-60">
                                        {record.timestamp.toDate().toLocaleDateString()}
                                    </span>
                                    <span className="font-mono">
                                        {record.distance.toFixed(2)} km
                                    </span>
                                    <span className="font-mono text-sm opacity-60">
                                        {formatTime(record.duration)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
            <AccessDeniedModal isOpen={isAccessDeniedOpen} onClose={() => setIsAccessDeniedOpen(false)} />
        </div>
    )
}
