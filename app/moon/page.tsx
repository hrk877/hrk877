"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import SunCalc from "suncalc"

export default function MoonPage() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const [permissionGranted, setPermissionGranted] = useState(false)
    const [moonData, setMoonData] = useState<any>(null)
    const [deviceOrientation, setDeviceOrientation] = useState<{ alpha: number, beta: number, gamma: number } | null>(null)
    const [heading, setHeading] = useState<number>(0)
    const [isFound, setIsFound] = useState(false)

    // 1. Initialize Moon Data
    useEffect(() => {
        const updateMoon = () => {
            const now = new Date()
            // Default to Tokyo if no GPS yet
            const lat = 35.6762
            const lon = 139.6503

            // Should get real GPS here if possible, but let's start with approximation or ask browser
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const phase = SunCalc.getMoonIllumination(now)
                    const position = SunCalc.getMoonPosition(now, pos.coords.latitude, pos.coords.longitude)
                    setMoonData({ phase, position })
                },
                () => {
                    // Fallback
                    const phase = SunCalc.getMoonIllumination(now)
                    const position = SunCalc.getMoonPosition(now, lat, lon)
                    setMoonData({ phase, position })
                }
            )
        }

        updateMoon()
        const timer = setInterval(updateMoon, 60000) // Update every minute
        return () => clearInterval(timer)
    }, [])

    // 2. Camera Access
    useEffect(() => {
        if (permissionGranted && !cameraStream) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
                .then(stream => {
                    setCameraStream(stream)
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream
                    }
                })
                .catch(err => console.error("Camera Error:", err))
        }
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop())
            }
        }
    }, [permissionGranted, cameraStream])

    // 3. Device Orientation (Compass)
    const requestAccess = async () => {
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
            try {
                const permissionState = await (DeviceMotionEvent as any).requestPermission()
                if (permissionState === 'granted') {
                    setPermissionGranted(true)
                    startOrientationListener()
                } else {
                    if (permissionState === 'granted') {
                        setPermissionGranted(true)
                        startOrientationListener()
                    } else {
                        alert("Permission denied. NOTE: iOS requires HTTPS for sensors. If you are on localhost (HTTP), sensors may be blocked.")
                    }
                }
            } catch (error) {
                console.error(error)
            }
        } else {
            // Android / Non-iOS 13+
            setPermissionGranted(true)
            startOrientationListener()
        }
    }

    // iOS 13+ and Android have different handle ways, simplified here
    const startOrientationListener = () => {
        window.addEventListener("deviceorientation", (event) => {
            let alpha = event.alpha // Compass direction (0-360) usually
            // Webkit (iOS) specific
            if ((event as any).webkitCompassHeading) {
                alpha = (event as any).webkitCompassHeading
            }

            if (alpha !== null) {
                // Smoothing could be applied here
                setHeading(alpha)
            }
            if (event.beta !== null && event.gamma !== null && event.alpha !== null) {
                setDeviceOrientation({ alpha: alpha || 0, beta: event.beta, gamma: event.gamma })
            }
        }, true)
    }

    // 4. Calculate Angle to Moon
    // Heading is where device is looking (0-360, N=0)
    // Moon Azimuth is radians from South (SunCalc specific), need to convert to 0-360 Compass

    // SunCalc: azimuth: 0 is South, Math.PI * 3/4 is Northwest.
    // Standard Compass: 0 is North, 90 East, 180 South, 270 West.

    const getMoonCompassBearing = () => {
        if (!moonData) return 0
        // SunCalc azimuth is radians, 0 = South, increasing westward?
        // Let's verify SunCalc docs or adjust.
        // Actually SunCalc: azimuth is in radians. 0 is south, increasing westward???? 
        // Typically Azimuth: 0 = North in navigation. 
        // SunCalc: "azimuth in radians (direction along the horizon, measured from south to west)"
        // So South = 0, West = PI/2 (90), North = PI (180), East = 3PI/2 (270)

        const az = moonData.position.azimuth // radians
        const azDeg = (az * 180) / Math.PI // degrees from south westwards

        // Convert to Compass (0=North, 90=East)
        // South (180 from North) is 0 in SunCalc.
        // So Compass = (180 + azDeg) % 360
        let bearing = (180 + azDeg) % 360
        return bearing
    }

    const moonBearing = getMoonCompassBearing()

    // Difference between where we look and where moon is
    // If heading is 0 (North) and Moon is 90 (East), diff is -90.
    let diff = moonBearing - heading
    // Normalize to -180 to 180
    while (diff < -180) diff += 360
    while (diff > 180) diff -= 360

    // Altitude check (simplified)
    const moonAlt = moonData ? (moonData.position.altitude * 180 / Math.PI) : 0
    // We could use device pitch (beta) to guide Up/Down too.

    useEffect(() => {
        // Simple "Found" logic
        if (Math.abs(diff) < 10) { // Within 10 degrees horizontal
            setIsFound(true)
        } else {
            setIsFound(false)
        }
    }, [diff])

    const [isARMode, setIsARMode] = useState(false)

    // AR Start Handler
    const handleStartAR = () => {
        setIsARMode(true)
        requestAccess() // Trigger permissions
    }

    return (
        <main className="relative w-full h-[100dvh] bg-black overflow-hidden flex flex-col items-center justify-center text-[#FAC800] font-mono">

            {/* 1. INITIAL VIEW (Static Moon) */}
            <AnimatePresence>
                {!isARMode && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 2, filter: "blur(10px)" }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black"
                    >
                        {/* Header */}
                        <div className="absolute top-6 left-6">
                            <Link href="/" className="text-2xl font-serif tracking-[0.2em] hover:opacity-50 transition-opacity">
                                BACK
                            </Link>
                        </div>

                        {/* Big Moon Visual */}
                        <div className="flex-1 flex flex-col items-center justify-center gap-8">
                            <div className="w-64 h-64 md:w-96 md:h-96 relative">
                                {moonData && <MoonVisual phase={moonData.phase.phase} />}
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-4xl md:text-6xl font-serif font-light">
                                    {moonData ? (moonData.phase.phase * 100 < 50 ? (moonData.phase.phase * 2 * 100).toFixed(0) : ((1 - moonData.phase.phase) * 2 * 100).toFixed(0)) + "%" : "--"}
                                </span>
                                <span className="text-sm tracking-[0.3em] opacity-70">
                                    {moonData ? getPhaseName(moonData.phase.phase) : "CALCULATING"}
                                </span>
                            </div>
                        </div>

                        {/* Start Button */}
                        <div className="pb-20">
                            <button
                                onClick={handleStartAR}
                                className="group relative px-8 py-4 bg-transparent overflow-hidden"
                            >
                                <span className="relative z-10 text-xl tracking-[0.2em] group-hover:text-black transition-colors duration-500">
                                    FIND THE MOON
                                </span>
                                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-[#FAC800] group-hover:h-full transition-all duration-500 ease-in-out" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. AR VIEW (Camera & Overlay) */}
            <motion.div
                animate={{ opacity: isARMode ? 1 : 0 }}
                className="absolute inset-0 w-full h-full"
            >
                {/* Camera Background */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover opacity-50 z-0 pointer-events-none"
                />

                {/* UI Layer */}
                <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 md:p-12 pb-20 pointer-events-none">

                    {/* Header (Top) */}
                    <div className="w-full flex justify-between items-start pointer-events-auto">
                        <button onClick={() => setIsARMode(false)} className="text-2xl font-serif tracking-[0.2em] mix-blend-difference hover:opacity-50 transition-opacity">
                            CLOSE
                        </button>
                        <div className="flex flex-col items-end">
                            <span className="text-xs opacity-50 tracking-widest">PHASE</span>
                            <span className="text-xl font-serif">
                                {moonData ? (moonData.phase.phase * 100).toFixed(0) + "%" : "--"}
                            </span>
                            <span className="text-[10px] opacity-70 tracking-widest mt-1">
                                {moonData ? getPhaseName(moonData.phase.phase) : "LOADING"}
                            </span>
                        </div>
                    </div>

                    {/* Central Guide (Middle) */}
                    <div className="flex-1 flex flex-col items-center justify-center pointer-events-auto">
                        {/* Only show guide if AR Mode is active (and permission arguably granted, though flow handles that) */}
                        {isARMode && (
                            <div className="flex flex-col items-center justify-center gap-6">
                                {/* Arrow */}
                                <motion.div
                                    animate={{ rotate: diff }}
                                    transition={{ type: "spring", stiffness: 50 }}
                                    className="w-48 h-48 md:w-64 md:h-64 border border-[#FAC800]/30 rounded-full flex items-center justify-center relative backdrop-blur-[2px]"
                                >
                                    {/* Central Reticle */}
                                    <div className="w-2 h-2 bg-[#FAC800] rounded-full" />

                                    {/* Indicator Arrow */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2">
                                        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[16px] border-b-[#FAC800]" />
                                    </div>

                                    {/* Moon Visual */}
                                    {isFound && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="absolute inset-0 flex items-center justify-center bg-[#FAC800]/10 rounded-full animate-pulse"
                                        >
                                            <div className="text-xs text-[#FAC800] mt-24 font-bold tracking-widest">TARGET LOCKED</div>
                                        </motion.div>
                                    )}
                                </motion.div>

                                <div className="flex flex-col items-center gap-1">
                                    <div className="text-3xl font-serif font-light">
                                        {isFound ? "LUNA FOUND" : "SEARCHING"}
                                    </div>
                                    <div className="text-xs opacity-50 tracking-widest">
                                        AZ: {moonBearing.toFixed(0)}° / EL: {moonAlt.toFixed(0)}°
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer (Bottom) */}
                    <div className="w-full text-center">
                        <div className="text-[10px] tracking-[0.5em] opacity-30 animate-pulse">
                            HRK.877 ORBITAL TRACKER
                        </div>
                    </div>
                </div>

                {/* Stylized Overlay */}
                <div className="absolute inset-0 border-[10px] border-[#FAC800]/5 pointer-events-none" />
            </motion.div>
        </main>
    )
}

function getPhaseName(phase: number) {
    if (phase === 0) return "NEW MOON"
    if (phase < 0.25) return "WAXING CRESCENT"
    if (phase === 0.25) return "FIRST QUARTER"
    if (phase < 0.5) return "WAXING GIBBOUS"
    if (phase === 0.5) return "FULL MOON"
    if (phase < 0.75) return "WANING GIBBOUS"
    if (phase === 0.75) return "LAST QUARTER"
    return "WANING CRESCENT"
}

// Simple SVG Moon Visualizer
function MoonVisual({ phase }: { phase: number }) {
    return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_rgba(250,200,0,0.3)]">
            {/* Dark background orb */}
            <circle cx="50" cy="50" r="48" fill="#111" stroke="#FAC800" strokeWidth="0.5" strokeOpacity="0.3" />
            <path d={calculateMoonPath(phase)} fill="#FAC800" />
        </svg>
    )
}

function calculateMoonPath(phase: number) {
    const r = 48
    const top = `50,${50 - r}`
    const bottom = `50,${50 + r}`

    if (phase <= 0.5) {
        const p = phase * 2
        const rx = 48 * Math.abs(1 - 2 * p)
        const sweep = p > 0.5 ? 1 : 0
        return `M ${top} A ${r} ${r} 0 0 1 ${bottom} A ${rx} ${r} 0 0 ${sweep} ${top}`
    } else {
        const p = (phase - 0.5) * 2
        const rx = 48 * Math.abs(1 - 2 * p)
        const sweep = p < 0.5 ? 0 : 1
        return `M ${top} A ${r} ${r} 0 0 0 ${bottom} A ${rx} ${r} 0 0 ${sweep} ${top}`
    }
}
