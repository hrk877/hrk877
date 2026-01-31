"use client"

import { useRef, useState, useCallback, useEffect, useMemo } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { FilesetResolver, HandLandmarker, HandLandmarkerResult, NormalizedLandmark, FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision"
import { SwitchCamera, Grid3x3 } from "lucide-react"
import HamburgerMenu from "../components/navigation/HamburgerMenu"

// Constants
const PARTICLE_COUNT = 200
const TEXT_FORMATION_SPEED = 0.12
const SPHERE_COLLECT_SPEED = 0.35
const DISPERSE_STRENGTH = 0.12
const FRICTION = 0.92
const SPHERE_RADIUS = 0.4

// Font
const FONT: { [key: string]: string[] } = {
    'A': [' ## ', '#  #', '####', '#  #', '#  #'],
    'B': ['### ', '#  #', '### ', '#  #', '### '],
    'C': [' ###', '#   ', '#   ', '#   ', ' ###'],
    'D': ['### ', '#  #', '#  #', '#  #', '### '],
    'E': ['####', '#   ', '### ', '#   ', '####'],
    'H': ['#  #', '#  #', '####', '#  #', '#  #'],
    'I': ['###', ' # ', ' # ', ' # ', '###'],
    'L': ['#   ', '#   ', '#   ', '#   ', '####'],
    'N': ['#  #', '## #', '# ##', '#  #', '#  #'],
    'O': [' ## ', '#  #', '#  #', '#  #', ' ## '],
    'P': ['### ', '#  #', '### ', '#   ', '#   '],
    'S': [' ###', '#   ', ' ## ', '   #', '### '],
    'V': ['#  #', '#  #', '#  #', ' ## ', ' #  '],
    'Y': ['#  #', ' ## ', ' #  ', ' #  ', ' #  '],
    ' ': ['   ', '   ', '   ', '   ', '   '],
}

function generateTextPattern(text: string): Float32Array {
    const points: number[] = []
    // Smaller size for mobile
    const baseCharWidth = 0.25
    const spacing = 0.04
    const rowHeight = 0.08

    // Calculate actual total width based on each character's real width
    let totalWidth = 0
    const charWidths: number[] = []
    for (let i = 0; i < text.length; i++) {
        const char = text[i].toUpperCase()
        const pattern = FONT[char] || FONT[' ']
        const colCount = pattern[0]?.length || 4
        // Scale character width based on its column count relative to standard (4 columns)
        const charWidth = baseCharWidth * (colCount / 4)
        charWidths.push(charWidth)
        totalWidth += charWidth + (i < text.length - 1 ? spacing : 0)
    }
    const startX = -totalWidth / 2

    let currentX = startX
    for (let i = 0; i < text.length; i++) {
        const char = text[i].toUpperCase()
        const pattern = FONT[char] || FONT[' ']
        const charWidth = charWidths[i]
        const colCount = pattern[0]?.length || 4

        for (let row = 0; row < pattern.length; row++) {
            for (let col = 0; col < pattern[row].length; col++) {
                if (pattern[row][col] === '#') {
                    points.push(
                        currentX + (col / colCount) * charWidth + (Math.random() - 0.5) * 0.02,
                        (2 - row) * rowHeight + (Math.random() - 0.5) * 0.02,
                        (Math.random() - 0.5) * 0.02
                    )
                }
            }
        }
        currentX += charWidth + spacing
    }
    return new Float32Array(points)
}

const TEXTS: { [key: string]: Float32Array } = {
    'HAPPY': generateTextPattern('HAPPY'),
    'LOVE': generateTextPattern('LOVE'),
    'COOL': generateTextPattern('COOL'),
    'HELLO': generateTextPattern('HELLO'),
    'SLEEP': generateTextPattern('SLEEP'),
    'BANANA': generateTextPattern('BANANA'),
}

type GestureType = 'none' | 'peace' | 'point' | 'rock' | 'heart' | 'openHand' | 'fist' | 'sleep' | 'banana'

// Detect gesture
function detectSingleHandGesture(landmarks: NormalizedLandmark[]): {
    isOpenHand: boolean
    isPeace: boolean
    isPoint: boolean
    isRock: boolean
    isFist: boolean
} {
    if (landmarks.length < 21) {
        return { isOpenHand: false, isPeace: false, isPoint: false, isRock: false, isFist: false }
    }

    const thumbTip = landmarks[4]
    const thumbMcp = landmarks[2]
    const indexTip = landmarks[8]
    const middleTip = landmarks[12]
    const ringTip = landmarks[16]
    const pinkyTip = landmarks[20]
    const indexMcp = landmarks[5]
    const middleMcp = landmarks[9]
    const ringMcp = landmarks[13]
    const pinkyMcp = landmarks[17]

    const indexUp = indexTip.y < indexMcp.y - 0.04
    const middleUp = middleTip.y < middleMcp.y - 0.04
    const ringUp = ringTip.y < ringMcp.y - 0.04
    const pinkyUp = pinkyTip.y < pinkyMcp.y - 0.04

    const isOpenHand = indexUp && middleUp && ringUp && pinkyUp
    const isPeace = indexUp && middleUp && !ringUp && !pinkyUp
    const isPoint = indexUp && !middleUp && !ringUp && !pinkyUp
    const isRock = indexUp && !middleUp && !ringUp && pinkyUp
    const isFist = !indexUp && !middleUp && !ringUp && !pinkyUp

    return { isOpenHand, isPeace, isPoint, isRock, isFist }
}

// Heart detection
function detectHeart(hand1: NormalizedLandmark[], hand2: NormalizedLandmark[]): boolean {
    if (hand1.length < 21 || hand2.length < 21) return false
    const thumb1 = hand1[4], index1 = hand1[8]
    const thumb2 = hand2[4], index2 = hand2[8]

    const thumbDist = Math.sqrt(Math.pow(thumb1.x - thumb2.x, 2) + Math.pow(thumb1.y - thumb2.y, 2))
    const indexDist = Math.sqrt(Math.pow(index1.x - index2.x, 2) + Math.pow(index1.y - index2.y, 2))
    const thumbsBelowIndex = (thumb1.y + thumb2.y) / 2 > (index1.y + index2.y) / 2

    return thumbDist < 0.15 && indexDist < 0.2 && thumbsBelowIndex
}

// Sphere offset
function getSphereOffset(index: number, total: number): { x: number; y: number; z: number } {
    const phi = Math.acos(-1 + (2 * index) / total)
    const theta = Math.sqrt(total * Math.PI) * phi
    return {
        x: Math.cos(theta) * Math.sin(phi) * SPHERE_RADIUS,
        y: Math.sin(theta) * Math.sin(phi) * SPHERE_RADIUS,
        z: Math.cos(phi) * SPHERE_RADIUS * 0.3
    }
}

// Particle System
function ParticleSystem({
    gesture,
    fingerTip,
    isDispersing,
    disperseCenter
}: {
    gesture: GestureType
    fingerTip: { x: number; y: number } | null
    isDispersing: boolean
    disperseCenter: { x: number; y: number } | null
}) {
    const pointsRef = useRef<THREE.Points>(null)
    const velocitiesRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3))
    const { viewport } = useThree()

    const circleTexture = useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 32
        canvas.height = 32
        const ctx = canvas.getContext('2d')!
        const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
        g.addColorStop(0, 'rgba(255,255,255,1)')
        g.addColorStop(0.6, 'rgba(255,255,255,0.8)')
        g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(16, 16, 16, 0, Math.PI * 2)
        ctx.fill()
        return new THREE.CanvasTexture(canvas)
    }, [])

    const positions = useMemo(() => {
        const pos = new Float32Array(PARTICLE_COUNT * 3)
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2
            const r = Math.random() * 2.5
            pos[i * 3] = Math.cos(angle) * r
            pos[i * 3 + 1] = Math.sin(angle) * r
            pos[i * 3 + 2] = (Math.random() - 0.5) * 0.2
        }
        return pos
    }, [])

    const getTextKey = (g: GestureType): string | null => {
        switch (g) {
            case 'peace': return 'HAPPY'
            case 'heart': return 'LOVE'
            case 'rock': return 'COOL'
            case 'openHand': return 'HELLO'
            case 'sleep': return 'SLEEP'
            case 'banana': return 'BANANA'
            default: return null
        }
    }

    useFrame((state) => {
        if (!pointsRef.current) return

        const pos = pointsRef.current.geometry.attributes.position.array as Float32Array
        const vel = velocitiesRef.current
        const t = state.clock.elapsedTime

        const textKey = getTextKey(gesture)
        const textPattern = textKey ? TEXTS[textKey] : null

        const fx = fingerTip ? (fingerTip.x - 0.5) * viewport.width * -1 : 0
        const fy = fingerTip ? (0.5 - fingerTip.y) * viewport.height : 0

        const dx_center = disperseCenter ? (disperseCenter.x - 0.5) * viewport.width * -1 : 0
        const dy_center = disperseCenter ? (0.5 - disperseCenter.y) * viewport.height : 0

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const idx = i * 3

            if (isDispersing && disperseCenter) {
                const angle = (i / PARTICLE_COUNT) * Math.PI * 2
                const dx = Math.cos(angle)
                const dy = Math.sin(angle)
                vel[idx] += dx * DISPERSE_STRENGTH
                vel[idx + 1] += dy * DISPERSE_STRENGTH
            } else if (gesture === 'point' && fingerTip) {
                // Collect all particles to fingertip (shrink to point)
                pos[idx] += (fx - pos[idx]) * SPHERE_COLLECT_SPEED
                pos[idx + 1] += (fy - pos[idx + 1]) * SPHERE_COLLECT_SPEED
                pos[idx + 2] += (0 - pos[idx + 2]) * SPHERE_COLLECT_SPEED
            } else if (textPattern) {
                const ti = (i * 3) % textPattern.length
                const tx = textPattern[ti] || 0
                const ty = textPattern[ti + 1] || 0
                const tz = textPattern[ti + 2] || 0
                pos[idx] += (tx - pos[idx]) * TEXT_FORMATION_SPEED
                pos[idx + 1] += (ty - pos[idx + 1]) * TEXT_FORMATION_SPEED
                pos[idx + 2] += (tz - pos[idx + 2]) * TEXT_FORMATION_SPEED
            } else {
                pos[idx] += Math.sin(t * 0.3 + i) * 0.001
                pos[idx + 1] += Math.cos(t * 0.2 + i * 0.5) * 0.001
            }

            pos[idx] += vel[idx]
            pos[idx + 1] += vel[idx + 1]
            pos[idx + 2] += vel[idx + 2]

            vel[idx] *= FRICTION
            vel[idx + 1] *= FRICTION
            vel[idx + 2] *= FRICTION

            if (Math.abs(pos[idx]) > 5) pos[idx] *= 0.97
            if (Math.abs(pos[idx + 1]) > 4) pos[idx + 1] *= 0.97
        }

        pointsRef.current.geometry.attributes.position.needsUpdate = true
    })

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <pointsMaterial
                size={0.12}
                color="#FAC800"
                map={circleTexture}
                transparent
                opacity={0.95}
                sizeAttenuation
                depthWrite={false}
            />
        </points>
    )
}

export default function ParticlesPage() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const handLandmarkerRef = useRef<HandLandmarker | null>(null)
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null)
    const [isTracking, setIsTracking] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [allLandmarks, setAllLandmarks] = useState<NormalizedLandmark[][]>([])
    const [eyesClosed, setEyesClosed] = useState(false)
    const animationFrameRef = useRef<number | null>(null)
    const frameCountRef = useRef(0)

    const [gesture, setGesture] = useState<GestureType>('none')
    const [fingerTip, setFingerTip] = useState<{ x: number; y: number } | null>(null)
    const [isDispersing, setIsDispersing] = useState(false)
    const [disperseCenter, setDisperseCenter] = useState<{ x: number; y: number } | null>(null)
    const lastGestureRef = useRef<GestureType>('none')

    const [isMosaic, setIsMosaic] = useState(false)

    // Banana detection (color-based)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [bananaDetected, setBananaDetected] = useState(false)
    const bananaDetectionCountRef = useRef(0)

    // Camera facing mode
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
    const facingModeRef = useRef<'user' | 'environment'>('user')

    useEffect(() => {
        facingModeRef.current = facingMode
    }, [facingMode])

    // Check if eyes are closed using face blendshapes
    const checkEyesClosed = (result: FaceLandmarkerResult): boolean => {
        if (!result.faceBlendshapes || result.faceBlendshapes.length === 0) return false

        const blendshapes = result.faceBlendshapes[0].categories
        const leftEyeBlink = blendshapes.find(b => b.categoryName === 'eyeBlinkLeft')?.score || 0
        const rightEyeBlink = blendshapes.find(b => b.categoryName === 'eyeBlinkRight')?.score || 0

        // Both eyes closed if blink score > 0.5
        return leftEyeBlink > 0.5 && rightEyeBlink > 0.5
    }

    useEffect(() => {
        // Priority: banana > eyes closed > hand gestures
        if (bananaDetected) {
            setGesture('banana')
            return
        }

        if (eyesClosed) {
            setGesture('sleep')
            return
        }

        if (allLandmarks.length === 0) {
            setGesture('none')
            setFingerTip(null)
            return
        }

        const hand1 = allLandmarks[0] || []
        const hand2 = allLandmarks[1] || []

        if (hand1.length >= 21 && hand2.length >= 21 && detectHeart(hand1, hand2)) {
            setGesture('heart')
            setFingerTip(null)
            lastGestureRef.current = 'heart'
            return
        }

        if (hand1.length < 21) return

        const { isOpenHand, isPeace, isPoint, isRock, isFist } = detectSingleHandGesture(hand1)
        const wrist = hand1[0]
        const indexTipLandmark = hand1[8]

        setFingerTip({ x: indexTipLandmark.x, y: indexTipLandmark.y })

        if (isFist && !isDispersing) {
            setDisperseCenter({ x: wrist.x, y: wrist.y })
            setIsDispersing(true)
            setGesture('fist')
            setTimeout(() => setIsDispersing(false), 600)
            lastGestureRef.current = 'fist'
            return
        }

        if (isPoint) { setGesture('point'); lastGestureRef.current = 'point'; return }
        if (isOpenHand) { setGesture('openHand'); lastGestureRef.current = 'openHand'; return }
        if (isPeace) { setGesture('peace'); lastGestureRef.current = 'peace'; return }
        if (isRock) { setGesture('rock'); lastGestureRef.current = 'rock'; return }

        setGesture('none')
    }, [allLandmarks, isDispersing, eyesClosed, bananaDetected])

    const initializeLandmarkers = useCallback(async () => {
        try {
            setIsLoading(true)
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            )

            const [handLandmarker, faceLandmarker] = await Promise.all([
                HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 2
                }),
                FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numFaces: 1,
                    outputFaceBlendshapes: true
                })
            ])

            handLandmarkerRef.current = handLandmarker
            faceLandmarkerRef.current = faceLandmarker

            setIsLoading(false)
            return true
        } catch (e) {
            console.error(e)
            setIsLoading(false)
            return false
        }
    }, [])

    const startTracking = async (mode?: 'user' | 'environment') => {
        const targetMode = mode ?? facingMode
        if (isLoading) return
        if (!navigator.mediaDevices?.getUserMedia) {
            alert("カメラAPIが利用できません")
            return
        }
        if (!handLandmarkerRef.current && !(await initializeLandmarkers())) return

        // Stop existing stream if any
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: targetMode, width: 640, height: 480 }
            })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
                setIsTracking(true)
                detectAll()
            }
        } catch (e) {
            console.error(e)
            alert("カメラ起動失敗")
        }
    }

    const toggleCamera = async () => {
        const newMode = facingMode === 'user' ? 'environment' : 'user'
        setFacingMode(newMode)
        if (newMode === 'user') setIsMosaic(false) // Turn off mosaic when switching to front camera
        if (isTracking) {
            await startTracking(newMode)
        }
    }

    const detectAll = useCallback(() => {
        if (!videoRef.current || !handLandmarkerRef.current) return

        frameCountRef.current++
        if (frameCountRef.current % 2 === 0) {
            animationFrameRef.current = requestAnimationFrame(detectAll)
            return
        }

        const video = videoRef.current
        const timestamp = performance.now()

        if (video.readyState >= 2) {
            try {
                // Hand detection
                const handResult: HandLandmarkerResult = handLandmarkerRef.current.detectForVideo(video, timestamp)
                setAllLandmarks(handResult.landmarks || [])
            } catch (e) {
                console.warn('Hand detection error:', e)
            }

            // Face detection for eyes (use different timestamp)
            if (faceLandmarkerRef.current) {
                try {
                    const faceResult: FaceLandmarkerResult = faceLandmarkerRef.current.detectForVideo(video, timestamp + 1)
                    setEyesClosed(checkEyesClosed(faceResult))
                } catch (e) {
                    console.warn('Face detection error:', e)
                }
            }

            // Banana detection using color analysis (run every 15 frames for performance)
            bananaDetectionCountRef.current++
            if (bananaDetectionCountRef.current % 15 === 0) {
                // Only detect banana in environment mode
                if (facingModeRef.current !== 'environment') {
                    setBananaDetected(false)
                } else {
                    // Create canvas for color analysis if not exists
                    if (!canvasRef.current) {
                        canvasRef.current = document.createElement('canvas')
                        canvasRef.current.width = 160
                        canvasRef.current.height = 120
                    }

                    const canvas = canvasRef.current
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                        const data = imageData.data

                        let yellowPixels = 0
                        const totalPixels = canvas.width * canvas.height

                        // Check for banana-yellow color (HSL: H=45-65, S>50%, L=40-70%)
                        for (let i = 0; i < data.length; i += 4) {
                            const r = data[i]
                            const g = data[i + 1]
                            const b = data[i + 2]

                            // Convert RGB to HSL
                            const max = Math.max(r, g, b)
                            const min = Math.min(r, g, b)
                            const l = (max + min) / 2 / 255

                            if (max !== min) {
                                const d = (max - min) / 255
                                const s = l > 0.5 ? d / (2 - max / 255 - min / 255) : d / (max / 255 + min / 255)
                                let h = 0
                                if (max === r) h = ((g - b) / (max - min) + (g < b ? 6 : 0)) / 6
                                else if (max === g) h = ((b - r) / (max - min) + 2) / 6
                                else h = ((r - g) / (max - min) + 4) / 6

                                const hDeg = h * 360
                                // Banana yellow: H 40-70 degrees, high saturation, medium lightness
                                if (hDeg >= 40 && hDeg <= 70 && s > 0.4 && l > 0.35 && l < 0.75) {
                                    yellowPixels++
                                }
                            }
                        }

                        // If more than 1% of image is banana-yellow, consider it detected
                        const yellowRatio = yellowPixels / totalPixels
                        setBananaDetected(yellowRatio > 0.01)
                    }
                }
            }
        }
        animationFrameRef.current = requestAnimationFrame(detectAll)
    }, [])

    const stopTracking = useCallback(() => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
            videoRef.current.srcObject = null
        }
        setIsTracking(false)
        setAllLandmarks([])
        setEyesClosed(false)
    }, [])

    // Auto-start tracking when page loads
    useEffect(() => {
        startTracking()
    }, [])

    useEffect(() => {
        return () => {
            stopTracking()
            handLandmarkerRef.current?.close()
            faceLandmarkerRef.current?.close()
        }
    }, [stopTracking])

    return (
        <div className="fixed inset-0 overflow-hidden touch-none bg-black">
            <HamburgerMenu color="#FAC800" />

            {/* Camera toggle button */}
            {isTracking && (
                <button
                    onClick={toggleCamera}
                    className="absolute top-11 right-6 z-50 text-[#FAC800] opacity-60 hover:opacity-100 transition-opacity"
                    aria-label={facingMode === 'user' ? '外カメラに切り替え' : '内カメラに切り替え'}
                >
                    <SwitchCamera size={24} strokeWidth={1.5} />
                </button>
            )}

            {/* Mosaic toggle button (only for environment camera) */}
            {isTracking && facingMode === 'environment' && (
                <button
                    onClick={() => setIsMosaic(!isMosaic)}
                    className={`absolute top-24 right-6 z-50 text-[#FAC800] transition-opacity ${isMosaic ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                    aria-label="モザイクフィルター切り替え"
                >
                    <Grid3x3 size={24} strokeWidth={1.5} />
                </button>
            )}

            {/* Mosaic SVG Filter */}
            <svg style={{ display: 'none' }}>
                <defs>
                    <filter id="pixelate" x="0" y="0">
                        <feFlood x="2" y="2" height="2" width="2" />
                        <feComposite width="10" height="10" />
                        <feTile result="a" />
                        <feComposite in="SourceGraphic" in2="a" operator="in" />
                        <feMorphology operator="dilate" radius="5" />
                    </filter>
                </defs>
            </svg>

            <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover ${isTracking ? "opacity-50" : "opacity-0"
                    } transition-opacity ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                style={{ filter: isMosaic ? 'url(#pixelate)' : 'none' }}
                playsInline
                muted
            />

            {isTracking && (
                <Canvas
                    camera={{ position: [0, 0, 5], fov: 50 }}
                    className="!absolute inset-0"
                    gl={{ antialias: false, powerPreference: "high-performance" }}
                    dpr={1}
                >
                    <ParticleSystem
                        gesture={gesture}
                        fingerTip={fingerTip}
                        isDispersing={isDispersing}
                        disperseCenter={disperseCenter}
                    />
                </Canvas>
            )}

            {!isTracking && isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[#FAC800] font-mono text-sm tracking-widest">LOADING...</span>
                </div>
            )}
        </div>
    )
}
