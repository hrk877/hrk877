"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Camera } from "lucide-react"
import SunCalc from "suncalc"
import HamburgerMenu from "../components/navigation/HamburgerMenu"

export default function MoonPage() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const [permissionGranted, setPermissionGranted] = useState(false)
    const [moonData, setMoonData] = useState<any>(null)
    const [heading, setHeading] = useState<number>(0)
    const [devicePitch, setDevicePitch] = useState<number>(0)

    // 0. Safari Black Theme Color Hack
    useEffect(() => {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]')
        const originalColor = metaThemeColor?.getAttribute("content")
        metaThemeColor?.setAttribute("content", "#000000")
        return () => {
            if (originalColor) metaThemeColor?.setAttribute("content", originalColor)
        }
    }, [])

    // 1. Initialize Moon Data
    useEffect(() => {
        const updateMoon = () => {
            const now = new Date()
            const lat = 35.6762
            const lon = 139.6503

            const handlePosition = (latitude: number, longitude: number) => {
                const phase = SunCalc.getMoonIllumination(now)
                const position = SunCalc.getMoonPosition(now, latitude, longitude)

                // Calculate Moon Age (Approximate synodic month 29.53 days)
                // SunCalc phase is 0.0 to 1.0. 
                // However, SunCalc doesn't give direct age in days easily without reference new moon.
                // Simple approx: phase * 29.53 is NOT correct because phase 0->1 is New->Full->New?
                // Actually SunCalc: 
                // phase: 0 (new moon), 0.25 (first quarter), 0.5 (full moon), 0.75 (last quarter)
                // Age = phase * 29.53 is roughly correct if 0 is New Moon.
                const age = phase.phase * 29.53

                // Calculate days until next Banana Moon (Age 5 or 25)
                const targetAges = [5, 25]
                let daysUntil = 999
                let nextTarget = 0

                // Simple search for next target
                // If current age is 3, next 5 is in 2 days.
                // If current age is 6, next 5 is in ~29 days (next cycle), next 25 is in 19 days.

                // Find nearest future target in current cycle
                for (let t of targetAges) {
                    if (age < t) {
                        const d = t - age
                        if (d < daysUntil) { daysUntil = d; nextTarget = t; }
                    }
                }
                // If no future target in current cycle (e.g. age 26), wrap around
                if (daysUntil === 999) {
                    // Next is 5 (next month)
                    daysUntil = (29.53 - age) + 5
                    nextTarget = 5
                }

                setMoonData({ phase, position, age, daysUntil: Math.ceil(daysUntil), nextTarget })
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => handlePosition(pos.coords.latitude, pos.coords.longitude),
                () => handlePosition(lat, lon)
            )
        }

        updateMoon()
        const timer = setInterval(updateMoon, 60000)
        return () => clearInterval(timer)
    }, [])

    // 2. Camera Access
    useEffect(() => {
        if (permissionGranted && !cameraStream) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
                .then(stream => {
                    setCameraStream(stream)
                    if (videoRef.current) {
                        videoRef.current.setAttribute("autoplay", "")
                        videoRef.current.setAttribute("muted", "")
                        videoRef.current.setAttribute("playsinline", "")
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

    // 3. Device Orientation (Compass & Pitch)
    const requestAccess = async () => {
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
            try {
                const permissionState = await (DeviceMotionEvent as any).requestPermission()
                if (permissionState === 'granted') {
                    setPermissionGranted(true)
                    startOrientationListener()
                } else {
                    alert("Permission denied. NOTE: iOS requires HTTPS for sensors.")
                }
            } catch (error) {
                console.error(error)
            }
        } else {
            setPermissionGranted(true)
            startOrientationListener()
        }
    }

    const startOrientationListener = () => {
        window.addEventListener("deviceorientation", (event) => {
            let alpha = event.alpha // Compass direction (0-360) 
            if ((event as any).webkitCompassHeading) {
                alpha = (event as any).webkitCompassHeading
            }

            if (alpha !== null) setHeading(alpha)
            if (event.beta !== null) setDevicePitch(event.beta) // -180 to 180 (front/back tilt)
        }, true)
    }

    // 4. AR Projection Logic

    // Moon Position (Azimuth to Compass Bearing)
    const getMoonCompassBearing = () => {
        if (!moonData) return 0
        const az = moonData.position.azimuth
        const azDeg = (az * 180) / Math.PI
        // South (180 from North) is 0 in SunCalc. Compass = (180 + azDeg) % 360
        let bearing = (180 + azDeg) % 360
        return bearing
    }

    const moonBearing = getMoonCompassBearing()
    const moonAlt = moonData ? (moonData.position.altitude * 180 / Math.PI) : 0

    // Deltas
    let azDiff = moonBearing - heading
    while (azDiff < -180) azDiff += 360
    while (azDiff > 180) azDiff -= 360

    // Pitch Diff (User looks up/down)
    // Device Pitch (beta): 90 is upright, 0 is flat on table.
    // When holding phone upright to look at horizon, beta is ~90.
    // If Moon is at 45 deg elevation, we need to tilt back.
    // Camera vertical field of view is approx 60 degrees.
    // Let's approximate simplified interaction:
    // Just 2D projection on screen center relative.

    // Correction for holding device primarily upright
    // Beta 90 = Horizon (Aspect 0)
    const pitchDiff = moonAlt - (devicePitch - 90)

    // Simple "Is Found" logic based on center proximity
    const isFound = Math.abs(azDiff) < 10 && Math.abs(pitchDiff) < 15 // Rough field of view window

    const [isARMode, setIsARMode] = useState(false)

    const handleStartAR = () => {
        setIsARMode(true)
        requestAccess()
    }

    // AR Element Position (Pixels relative to center)
    // FOV approx 60?
    // 1 degree approx X pixels
    // Let's rely on CSS translates 
    // If azDiff is +10 degrees (Right), we move object +X px? No, if target is right, we move object Left?
    // No, if target is at 100, and we look at 90, target is at +10 relative to center.
    // Screen width is e.g. 60 deg ?
    const fov = 60
    const xOffset = (azDiff / (fov / 2)) * 50 // % of screen half width
    const yOffset = -(pitchDiff / (fov / 2)) * 50 // % of screen half height (inverted because up is negative Y in CSS usually, but translate works differently)

    return (
        <main className="relative w-full h-[100dvh] bg-black overflow-hidden flex flex-col items-center justify-center text-[#FAC800] font-mono select-none">

            <div className="absolute top-0 left-0 z-[1000]">
                <HamburgerMenu />
            </div>

            {/* 1. INITIAL VIEW */}
            <AnimatePresence>
                {!isARMode && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.2, filter: "blur(20px)" }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 z-20 flex flex-col md:flex-row items-center justify-center bg-black p-6 md:p-24"
                    >
                        {/* Top Right Camera Button (New AR Trigger) */}
                        <div className="absolute top-12 right-6 z-50 mix-blend-difference">
                            <button
                                onClick={handleStartAR}
                                className="p-4 -mr-4 -mt-6.5 text-[#FAC800] hover:text-white transition-colors duration-300"
                            >
                                <Camera size={32} strokeWidth={1} />
                            </button>
                        </div>

                        <div className="flex-1 w-full h-full flex flex-col md:flex-row items-center justify-center relative z-20 gap-4 md:gap-16">

                            {/* Desktop: Left Content (Text) - Explicit Height Match */}
                            <div className="flex flex-col items-center md:items-end md:justify-between order-2 md:order-1 -mt-25 md:mt-0 md:h-[35vw] md:max-h-[600px] py-4 md:py-0 md:translate-x-28">
                                <div className="flex flex-col items-center md:items-end gap-1 md:gap-4">
                                    <span className="text-xl md:text-3xl tracking-[0.2em] font-serif font-light text-[#FAC800] uppercase mb-2 md:mb-0 opacity-80">
                                        UNTIL
                                    </span>
                                    <h1 className="text-5xl md:text-7xl lg:text-[5rem] xl:text-[7rem] font-serif tracking-[0.02em] text-[#FAC800] uppercase opacity-90 text-center md:text-right leading-[0.9]">
                                        BANANA<br />MOON
                                    </h1>
                                </div>

                                <div className="flex flex-col items-center md:items-end leading-none mt-3 md:mt-0 mb-10 md:mb-0">
                                    {moonData && (Math.abs(Math.round(moonData.age) - 5) < 1 || Math.abs(Math.round(moonData.age) - 25) < 1) ? (
                                        <span className="text-5xl md:text-8xl lg:text-[8rem] font-serif font-bold tracking-[0.05em] text-[#FAC800] animate-pulse">
                                            TODAY
                                        </span>
                                    ) : (
                                        <div className="flex items-baseline gap-4">
                                            <span className="text-7xl md:text-[8rem] lg:text-[10rem] font-serif font-light tracking-[0.02em] text-[#FAC800] leading-none">
                                                {moonData ? moonData.daysUntil : "-"}
                                            </span>
                                            <span className="text-xl md:text-3xl opacity-80 tracking-[0.2em] font-serif font-light">DAYS</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Desktop: Right Content (Moon Visual) */}
                            <div className="flex-1 w-full flex items-center justify-center md:justify-start relative order-1 md:order-2 md:pl-32">
                                <div className="relative w-[65vw] h-[65vw] md:w-[35vw] md:h-[35vw] max-w-[400px] max-h-[400px] md:max-w-[600px] md:max-h-[600px] transition-transform duration-[2s] hover:scale-105 mt-0 md:mt-0 mb-0 md:mb-0">
                                    <div className="absolute inset-0 rounded-full blur-[80px] bg-[#FAC800]/10 scale-125 animate-pulse-slow pointer-events-none"></div>
                                    {moonData ? (
                                        <MoonVisual phase={moonData.phase.phase} />
                                    ) : (
                                        <div className="w-full h-full rounded-full border border-[#FAC800]/20 animate-spin-slow"></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. AR VIEW */}
            <motion.div
                animate={{ opacity: isARMode ? 1 : 0 }}
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: isARMode ? "auto" : "none" }}
            >
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover opacity-50 z-0 pointer-events-none"
                />

                {/* Floating AR Layer */}
                {isARMode && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none perspective-[1000px]">
                        {/* The Floating Banana */}
                        <div
                            className="absolute top-1/2 left-1/2 w-48 h-48 -ml-24 -mt-24 flex items-center justify-center transition-transform duration-100 ease-out will-change-transform"
                            style={{
                                transform: `translate(${xOffset}vw, ${-yOffset}vh) scale(${isFound ? 1.5 : 1})`
                            }}
                        >
                            <TargetVisual isFound={isFound} />

                            {isFound && (
                                <div className="absolute top-full mt-4 flex flex-col items-center">
                                    <div className="text-[#FAC800] font-serif tracking-[0.2em] text-lg animate-pulse whitespace-nowrap">
                                        MOON FOUND
                                    </div>
                                </div>
                            )}


                        </div>
                    </div>
                )}

                {/* HUD Layer */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {/* Top Right Close Button (Matches Hamburger Position) */}
                    <div className="absolute top-11 right-6 mix-blend-difference pointer-events-auto">
                        <button
                            onClick={() => setIsARMode(false)}
                            className="p-4 -mr-4 -mt-4 text-xs font-mono tracking-[0.2em] text-[#FAC800] hover:text-white transition-colors duration-300"
                        >
                            CLOSE VIEW
                        </button>
                    </div>

                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-12 pb-20">
                        <div className="flex-1 flex flex-col items-center justify-center">
                            {isFound && (
                                <div className="text-center animate-pulse">
                                    <div className="text-4xl font-serif font-light mb-2">MOON FOUND</div>
                                    <div className="text-xs tracking-[0.5em] opacity-80">ALIGNMENT LOCKED</div>
                                </div>
                            )}
                        </div>

                        <div className="w-full text-center">
                            <div className="text-[10px] tracking-[0.5em] opacity-30">
                                AZ: {moonBearing.toFixed(0)}° EL: {moonAlt.toFixed(0)}°
                            </div>
                        </div>
                    </div>
                </div>
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

function MoonVisual({ phase }: { phase: number }) {
    return (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_50px_rgba(250,200,0,0.4)]">
            <defs>
                <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="80%" stopColor="#FAC800" stopOpacity="1" />
                    <stop offset="100%" stopColor="#FAC800" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="#1a1a1a" stroke="#FAC800" strokeWidth="0.2" strokeOpacity="0.5" />
            <path d={calculateMoonPath(phase)} fill="#FAC800" />
            <circle cx="50" cy="50" r="48" fill="url(#sphereShading)" opacity="0.3" pointerEvents="none" />
        </svg>
    )
}

function TargetVisual({ isFound }: { isFound: boolean }) {
    return (
        <div className="w-full h-full relative flex items-center justify-center pointer-events-none">
            {/* Outer Circle (Border) */}
            <div
                className={`
                    rounded-full border border-[#FAC800] transition-colors duration-300
                    ${isFound ? "w-[90%] h-[90%] border-2" : "w-[90%] h-[90%] border opacity-60"}
                `}
            />

            {/* Center Dot */}
            <div
                className={`
                    absolute rounded-full bg-[#FAC800]
                    ${isFound ? "w-2 h-2" : "w-1 h-1 opacity-60"}
                `}
            />
        </div>
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
