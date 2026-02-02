"use client"

import { useRef, useState, useCallback, useEffect, useMemo } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { FilesetResolver, HandLandmarker, HandLandmarkerResult, NormalizedLandmark, FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision"
import { SwitchCamera, Grid3x3, Calendar, Palette, User, Scissors, Scan } from "lucide-react"
import HamburgerMenu from "../components/navigation/HamburgerMenu"

// Constants
const PARTICLE_COUNT = 200
const TEXT_FORMATION_SPEED = 0.12
const SPHERE_COLLECT_SPEED = 0.35
const DISPERSE_STRENGTH = 0.12
const FRICTION = 0.92
const SPHERE_RADIUS = 0.4

type CameraMode = 'standard' | 'face-mosaic' | 'human-cutout'

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
}

type GestureType = 'none' | 'peace' | 'point' | 'rock' | 'heart' | 'openHand' | 'fist' | 'sleep'

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
    disperseCenter,
    eyePosition
}: {
    gesture: GestureType
    fingerTip: { x: number; y: number } | null
    isDispersing: boolean
    disperseCenter: { x: number; y: number } | null
    eyePosition: { x: number; y: number } | null
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
            default: return null
        }
    }

    // Check if particles should be visible (only for active gestures, not 'none')
    const shouldShowParticles = gesture !== 'none'

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
                // When no gesture, keep particles off-screen
                pos[idx] += (-10 - pos[idx]) * 0.1
                pos[idx + 1] += (0 - pos[idx + 1]) * 0.1
                pos[idx + 2] += (0 - pos[idx + 2]) * 0.1
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
    const [eyePosition, setEyePosition] = useState<{ x: number; y: number } | null>(null)
    const [faceBounds, setFaceBounds] = useState<{ x: number, y: number, width: number, height: number } | null>(null)
    const lastGestureRef = useRef<GestureType>('none')
    const oscillatorRef = useRef<OscillatorNode | null>(null)

    const [cameraMode, setCameraMode] = useState<CameraMode>('standard')
    const [isMosaic, setIsMosaic] = useState(true)
    const [isYellow, setIsYellow] = useState(true)
    const [mosaicLevel, setMosaicLevel] = useState<1 | 2 | 0>(1) // 1=small, 2=medium, 0=high clarity
    const [isDateVisible, setIsDateVisible] = useState(false)
    const dateVisibleRef = useRef(false)

    useEffect(() => {
        dateVisibleRef.current = isDateVisible
    }, [isDateVisible])

    useEffect(() => {
        // Mode logic
        if (cameraMode === 'standard') {
            setIsMosaic(true)
            setIsYellow(true)
        } else if (cameraMode === 'face-mosaic') {
            setIsMosaic(false) // Custom drawing in effect
            setIsYellow(false)
        } else if (cameraMode === 'human-cutout') {
            setIsMosaic(false)
            setIsYellow(false) // Custom background in effect
        }
    }, [cameraMode])

    // Mosaic canvas
    const mosaicCanvasRef = useRef<HTMLCanvasElement>(null)

    // Camera facing mode
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
    const facingModeRef = useRef<'user' | 'environment'>('user')

    // Recording state
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordedChunksRef = useRef<Blob[]>([])
    const recordingTimerRef = useRef<number | null>(null)

    // Audio context and nodes stored in refs to prevent garbage collection during recording
    const audioContextRef = useRef<AudioContext | null>(null)
    const audioStreamRef = useRef<MediaStream | null>(null)
    const shifterRef = useRef<ScriptProcessorNode | null>(null)

    // Recording canvas and context stored in refs to prevent GC during recording
    const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const recordingCtxRef = useRef<CanvasRenderingContext2D | null>(null)
    const recordingAnimationRef = useRef<number | null>(null)
    const isCapturingRef = useRef<boolean>(false)

    // Three.js canvas ref for capturing particles in recording
    const threeCanvasRef = useRef<HTMLCanvasElement | null>(null)

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
        // Priority: eyes closed > hand gestures
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
    }, [allLandmarks, isDispersing, eyesClosed])

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

    // Restart camera when page becomes visible again (after download)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // If we're returning from a background state (like a download screen),
                // reload the page to ensure all camera states and effects are properly reset.
                window.location.reload()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
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
            const currentStream = videoRef.current.srcObject as MediaStream
            currentStream.getTracks().forEach(t => {
                t.stop()
                currentStream.removeTrack(t)
            })
            videoRef.current.srcObject = null
        }

        try {
            // Use ideal constraints for better mobile compatibility
            const constraints = {
                video: {
                    facingMode: targetMode,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            }
            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
                setIsTracking(true)
                detectAll()
            }
        } catch (e) {
            console.error("Camera transition error:", e)
            alert("カメラの切り替えに失敗しました。ブラウザの設定でカメラ許可を確認してください。")
        }
    }

    const toggleCamera = async () => {
        const newMode = facingMode === 'user' ? 'environment' : 'user'
        setFacingMode(newMode)
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
                    if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
                        const face = faceResult.faceLandmarks[0]

                        // Calculate face bounding box for specialized modes
                        let minX = 1, minY = 1, maxX = 0, maxY = 0
                        face.forEach(pt => {
                            if (pt.x < minX) minX = pt.x
                            if (pt.y < minY) minY = pt.y
                            if (pt.x > maxX) maxX = pt.x
                            if (pt.y > maxY) maxY = pt.y
                        })

                        const video = videoRef.current
                        if (video) {
                            setFaceBounds({
                                x: minX * video.videoWidth,
                                y: minY * video.videoHeight,
                                width: (maxX - minX) * video.videoWidth,
                                height: (maxY - minY) * video.videoHeight
                            })
                        }

                        // Get eye position (average of left and right eye centers)
                        if (face[159] && face[386]) {
                            const leftEye = face[159]
                            const rightEye = face[386]
                            const eyeX = (leftEye.x + rightEye.x) / 2
                            const eyeY = (leftEye.y + rightEye.y) / 2
                            setEyePosition({ x: eyeX, y: eyeY })
                        }
                    } else {
                        setFaceBounds(null)
                    }
                    setEyesClosed(checkEyesClosed(faceResult))
                } catch (e) {
                    console.warn('Face detection error:', e)
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
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop()
            }
            handLandmarkerRef.current?.close()
            faceLandmarkerRef.current?.close()
        }
    }, [stopTracking])

    // Apply mosaic effect using Canvas
    useEffect(() => {
        if (!isTracking || !videoRef.current || !mosaicCanvasRef.current) return

        const video = videoRef.current
        const canvas = mosaicCanvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationId: number

        const applyMosaic = () => {
            if (!video.readyState || video.readyState < 2) {
                animationId = requestAnimationFrame(applyMosaic)
                return
            }

            // Set canvas size to match video
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            if (cameraMode === 'standard' && isMosaic) {
                // Mosaic size based on level: 1=10px, 2=20px, 0=4px (High Clarity)
                const pixelSizes = { 1: 10, 2: 20, 0: 4 }
                const pixelSize = pixelSizes[mosaicLevel]
                const w = Math.ceil(canvas.width / pixelSize)
                const h = Math.ceil(canvas.height / pixelSize)
                ctx.imageSmoothingEnabled = false
                ctx.drawImage(video, 0, 0, w, h)
                ctx.drawImage(canvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height)
            } else if (cameraMode === 'face-mosaic' && faceBounds) {
                // Background clear
                ctx.drawImage(video, 0, 0)

                // Draw mosaic ONLY on face area
                const tempCanvas = document.createElement('canvas')
                tempCanvas.width = canvas.width
                tempCanvas.height = canvas.height
                const tCtx = tempCanvas.getContext('2d')
                if (tCtx) {
                    const pixelSize = 8
                    const fw = Math.ceil(faceBounds.width / pixelSize)
                    const fh = Math.ceil(faceBounds.height / pixelSize)

                    tCtx.imageSmoothingEnabled = false
                    tCtx.drawImage(video, faceBounds.x, faceBounds.y, faceBounds.width, faceBounds.height, 0, 0, fw, fh)

                    ctx.drawImage(tempCanvas, 0, 0, fw, fh, faceBounds.x, faceBounds.y, faceBounds.width, faceBounds.height)
                }
            } else if (cameraMode === 'human-cutout') {
                // Background Yellow
                ctx.fillStyle = '#FAC800'
                ctx.fillRect(0, 0, canvas.width, canvas.height)

                // Cut out person (Simplified: everything within person's bounding box + padding)
                // In a perfect world we'd use Segmentation, but face bounds + padding is a good start
                if (faceBounds) {
                    const personH = faceBounds.height * 3.5
                    const personW = faceBounds.width * 2.5
                    const personX = faceBounds.x - (personW - faceBounds.width) / 2
                    const personY = faceBounds.y - faceBounds.height * 0.5

                    ctx.drawImage(video, personX, personY, personW, personH, personX, personY, personW, personH)
                } else {
                    // Fallback: draw video at center if no face detected
                    const scale = 0.8
                    const w = canvas.width * scale
                    const h = canvas.height * scale
                    const x = (canvas.width - w) / 2
                    const y = (canvas.height - h) / 2
                    ctx.drawImage(video, x, y, w, h)
                }
            } else {
                // Fallback / Modes that just need video
                ctx.drawImage(video, 0, 0)
            }

            animationId = requestAnimationFrame(applyMosaic)
        }

        applyMosaic()

        return () => {
            if (animationId) cancelAnimationFrame(animationId)
        }
    }, [isTracking, cameraMode, isMosaic, faceBounds, mosaicLevel])

    // Recording functions
    const startRecording = async () => {
        try {
            // Get the container element
            const container = document.querySelector('.fixed.inset-0') as HTMLElement
            if (!container) return

            // STYLISH RADIO VOICE - FM broadcast quality with character
            // More polished than AM, with slight warmth and presence
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const audioContext = new AudioContext()
            const source = audioContext.createMediaStreamSource(audioStream)
            const pitchShift = audioContext.createMediaStreamDestination()
            const shifter = audioContext.createScriptProcessor(4096, 1, 1)

            // EXTREME WALKIE-TALKIE / TRANSCEIVER VOICE (3X INTENSITY)
            // Super narrow bandwidth, heavy mid boost, crushed sound

            // High-pass: Very strong low cut
            const highPass = audioContext.createBiquadFilter()
            highPass.type = 'highpass'
            highPass.frequency.value = 500 // Aggressive low cut
            highPass.Q.value = 1.5

            // Low-pass: Super narrow bandwidth
            const lowPass = audioContext.createBiquadFilter()
            lowPass.type = 'lowpass'
            lowPass.frequency.value = 2200 // Very narrow high cut
            lowPass.Q.value = 1.5

            // Mid boost 1: Extreme nasal radio character
            const midBoost = audioContext.createBiquadFilter()
            midBoost.type = 'peaking'
            midBoost.frequency.value = 1000 // Core radio frequency
            midBoost.Q.value = 3.0 // Very narrow
            midBoost.gain.value = 15 // EXTREME boost

            // Mid boost 2: Additional nasality
            const midBoost2 = audioContext.createBiquadFilter()
            midBoost2.type = 'peaking'
            midBoost2.frequency.value = 1400
            midBoost2.Q.value = 2.5
            midBoost2.gain.value = 10

            // "Crackle" character - harsh edge
            const crackle = audioContext.createBiquadFilter()
            crackle.type = 'peaking'
            crackle.frequency.value = 1800 // Harsh edge
            crackle.Q.value = 4.0 // Very focused
            crackle.gain.value = 8 // Strong crackle

            // Output gain (lower to prevent clipping with all boosts)
            const outputGain = audioContext.createGain()
            // RING MODULATOR (Strong Robot Voice)
            // Synthesizes voice with a sine wave for a metallic "dalek" effect

            // 1. Create Oscillator (The "Carrier")
            // 50Hz is the classic sci-fi robot growl frequency
            const oscillator = audioContext.createOscillator()
            oscillator.type = 'sine'
            oscillator.frequency.value = 50

            // 2. Create Gain for modulation
            // The oscillator will control the volume of this gain node extremely fast
            const ringModGain = audioContext.createGain()
            ringModGain.gain.value = 0 // Center at 0

            // 3. Connect Oscillator to Gain.gain
            // This is the "Multiplication" or "Synthesis" part
            oscillator.connect(ringModGain.gain)
            oscillator.start()

            // Store for cleanup
            oscillatorRef.current = oscillator

            // Signal Chain:
            // Source -> HighPass -> MidBoost -> MidBoost2 -> Crackle -> RING MOD -> LowPass -> Gain -> Output

            source.connect(highPass)
            highPass.connect(midBoost)
            midBoost.connect(midBoost2)
            midBoost2.connect(crackle)

            // Helper Gain to boost input into the modulator (make it louder/stronger)
            const inputRunUp = audioContext.createGain()
            inputRunUp.gain.value = 1.0

            crackle.connect(inputRunUp)
            inputRunUp.connect(ringModGain) // Transformation happens here

            ringModGain.connect(lowPass)
            lowPass.connect(outputGain)
            outputGain.connect(pitchShift) // Final output

            // Update refs
            audioStreamRef.current = audioStream
            audioContextRef.current = audioContext
            shifterRef.current = shifter

            if (audioContext.state === 'suspended') {
                await audioContext.resume()
            }

            // Use canvas stream from display - store in refs to prevent GC
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) return


            // Store in refs to prevent garbage collection during recording
            recordingCanvasRef.current = canvas
            recordingCtxRef.current = ctx

            // Set canvas size to 9:16 aspect ratio for iPhone
            const aspectRatio = 9 / 16
            canvas.width = window.innerWidth
            canvas.height = Math.round(window.innerWidth / aspectRatio)

            // If height exceeds window height, adjust based on height instead
            if (canvas.height > window.innerHeight) {
                canvas.height = window.innerHeight
                canvas.width = Math.round(window.innerHeight * aspectRatio)
            }

            // Use ref for capturing state to prevent closure issues
            isCapturingRef.current = true

            // Capture frames continuously
            const captureFrame = () => {
                if (!isCapturingRef.current) return

                // Use refs to ensure canvas and ctx are still valid
                const canvas = recordingCanvasRef.current
                const ctx = recordingCtxRef.current
                if (!canvas || !ctx) return

                // Draw the entire page content
                ctx.fillStyle = '#000000'
                ctx.fillRect(0, 0, canvas.width, canvas.height)

                // Draw video
                if (videoRef.current && videoRef.current.readyState >= 2) {
                    const video = videoRef.current
                    const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight)
                    const x = (canvas.width - video.videoWidth * scale) / 2
                    const y = (canvas.height - video.videoHeight * scale) / 2

                    ctx.save()
                    if (facingMode === 'user') {
                        ctx.translate(canvas.width, 0)
                        ctx.scale(-1, 1)
                    }

                    if (isMosaic && mosaicCanvasRef.current) {
                        ctx.drawImage(mosaicCanvasRef.current, x, y, video.videoWidth * scale, video.videoHeight * scale)
                    } else {
                        // Draw video at full opacity for proper colors
                        ctx.drawImage(video, x, y, video.videoWidth * scale, video.videoHeight * scale)
                    }
                    ctx.restore()
                }

                // Yellow overlay - match display opacity
                if (isYellow) {
                    ctx.fillStyle = 'rgba(250, 204, 0, 0.5)'
                    ctx.globalCompositeOperation = 'overlay'
                    ctx.fillRect(0, 0, canvas.width, canvas.height)
                    ctx.globalCompositeOperation = 'source-over'
                }

                // Date stamp - Custom Font Style
                if (dateVisibleRef.current) {
                    const now = new Date()
                    // Format: 2026.2.1 (no zero padding)
                    const dateString = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`

                    // Match Hero title font: Cormorant Garamond
                    ctx.font = '600 80px "Cormorant Garamond", serif'
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'top'

                    // No shadow requested
                    ctx.shadowColor = 'transparent'
                    ctx.shadowBlur = 0
                    ctx.shadowOffsetX = 0
                    ctx.shadowOffsetY = 0

                    ctx.fillStyle = '#FAC800' // Yellow to match branding
                    ctx.fillText(dateString, canvas.width / 2, 150) // Adjusted y to 150 for larger font
                }

                // Draw Three.js particles canvas on top
                if (threeCanvasRef.current) {
                    try {
                        ctx.drawImage(threeCanvasRef.current, 0, 0, canvas.width, canvas.height)
                    } catch (e) {
                        // Ignore cross-origin errors if any
                    }
                }

                recordingAnimationRef.current = requestAnimationFrame(captureFrame)
            }

            // Start capturing frames
            captureFrame()

            // Create stream from canvas
            const videoStream = canvas.captureStream(30) // 30 fps

            // Combine video and audio streams
            const combinedStream = new MediaStream([
                ...videoStream.getVideoTracks(),
                ...pitchShift.stream.getAudioTracks()
            ])

            // Prioritize MP4/H.264 for iPhone compatibility
            const mimeTypes = [
                'video/mp4; codecs="avc1.42E01E, mp4a.40.2"', // H.264 Main Profile + AAC
                'video/mp4; codecs="avc1.640028, mp4a.40.2"', // H.264 High Profile
                'video/mp4; codecs=h264',
                'video/mp4',
                'video/webm; codecs=h264', // Chrome can usually do H.264 in WebM
                'video/webm; codecs=vp9',
                'video/webm'
            ]

            let mimeType = ''
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type
                    break
                }
            }

            // If no supported type found (very unlikely), fallback
            if (!mimeType) mimeType = 'video/webm'

            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: mimeType,
                videoBitsPerSecond: 2500000,
                audioBitsPerSecond: 128000
            })

            recordedChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = async () => {
                isCapturingRef.current = false
                if (recordingAnimationRef.current) {
                    cancelAnimationFrame(recordingAnimationRef.current)
                    recordingAnimationRef.current = null
                }

                // Clear recording canvas refs
                recordingCanvasRef.current = null
                recordingCtxRef.current = null

                // Stop audio tracks and close audio context using refs
                if (audioStreamRef.current) {
                    audioStreamRef.current.getTracks().forEach(track => track.stop())
                    audioStreamRef.current = null
                }

                if (shifterRef.current) {
                    shifterRef.current.disconnect()
                    shifterRef.current = null
                }

                if (oscillatorRef.current) {
                    try {
                        oscillatorRef.current.stop()
                        oscillatorRef.current.disconnect()
                    } catch (e) {
                        // Ignore if already stopped
                    }
                    oscillatorRef.current = null
                }

                if (audioContextRef.current) {
                    await audioContextRef.current.close()
                    audioContextRef.current = null
                }

                // Determine extension based on mimeType, favoring .mov for iPhone feel if mp4 is used
                let extension = 'mov'
                // If it's explicitly WebM and NOT H.264, maybe keep webm, but user asked for iPhone format.
                // iPhone handles .mov (H.264/HEVC). 
                // If the browser forces VP8/VP9, calling it .mov might confuse some players, but often they check valid headers.
                // However, let's try to stick to valid extensions.
                if (mimeType.includes('webm') && !mimeType.includes('h264')) {
                    // Fallback for strict WebM browsers (e.g. Firefox on Windows/Linux sometimes)
                    // converting .webm to .mov isn't real without re-encoding, but we can try renaming 
                    // if the user REALLY wants it looks like iPhone. 
                    // BUT, a .mov with VP8 is weird. 
                    // Let's settle: if MP4 is supported (Safari/Chrome), we use .MOV.
                    // If only WebM is supported, we keep .webm to avoid breaking playback.
                    extension = 'webm'
                }

                // Force .MOV if it's MP4-based (standard for iPhone Camera)
                if (mimeType.includes('mp4') || mimeType.includes('h264')) {
                    extension = 'mov'
                }

                const blob = new Blob(recordedChunksRef.current, { type: mimeType })
                const url = URL.createObjectURL(blob)

                // Generate iPhone-style filename: IMG_YYYYMMDD_HHMMSS
                const now = new Date()
                const pad = (n: number) => n.toString().padStart(2, '0')
                const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
                const filename = `IMG_${timestamp}.${extension}`

                // For iOS Safari, use a different approach to trigger download
                const a = document.createElement('a')
                a.style.display = 'none'
                a.href = url
                a.download = filename

                // Add to DOM, click, and remove
                document.body.appendChild(a)

                // Use setTimeout to ensure the download starts before cleanup
                setTimeout(() => {
                    a.click()

                    // Clean up after a delay
                    setTimeout(() => {
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                    }, 100)
                }, 0)
            }

            mediaRecorderRef.current = mediaRecorder
            // Start with timeslice to periodically flush data and prevent buffer issues
            // This fixes the issue where recording stops after ~15 seconds
            mediaRecorder.start(1000)
            setIsRecording(true)
            setRecordingTime(0)

            // Start timer
            recordingTimerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1)
            }, 1000)

        } catch (error) {
            console.error('Recording failed:', error)
            alert('録画の開始に失敗しました')
        }
    }

    const stopRecording = () => {
        // Immediately update UI to show "stopped" state
        setIsRecording(false)

        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current)
            recordingTimerRef.current = null
        }

        // Add a delay before actually stopping the recorder
        // This ensures the buffer is flushed and the last moment is captured
        setTimeout(() => {
            try {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.stop()
                }
            } catch (e) {
                console.error("Stop recording error:", e)
            }
        }, 1000) // 1 second buffer to catch the end
    }

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording()
        } else {
            startRecording()
        }
    }

    return (
        <div className="fixed inset-0 overflow-hidden touch-none bg-black">
            <HamburgerMenu color="#FAC800" />

            {/* Camera controls - top right */}
            {isTracking && (
                <div className="absolute top-9 right-6 z-50 flex flex-col gap-4">
                    {/* Camera toggle button */}
                    <button
                        onClick={toggleCamera}
                        className="text-[#FAC800] opacity-60 hover:opacity-100 transition-opacity"
                        aria-label={facingMode === 'user' ? '外カメラに切り替え' : '内カメラに切り替え'}
                    >
                        <SwitchCamera className="w-8 h-8" strokeWidth={1.5} />
                    </button>

                    {/* Grid button - mosaic size */}
                    {/* Grid button - mosaic size */}
                    <button
                        onClick={() => setMosaicLevel(prev => {
                            if (prev === 1) return 2
                            if (prev === 2) return 0
                            return 1
                        })}
                        className="text-[#FAC800] opacity-60 hover:opacity-100 transition-opacity"
                    >
                        <Grid3x3 className="w-8 h-8" strokeWidth={mosaicLevel === 0 ? 1 : mosaicLevel === 1 ? 2 : 3} />
                    </button>

                    {/* Date toggle button */}
                    <button
                        onClick={() => setIsDateVisible(prev => !prev)}
                        className={`transition-opacity ${isDateVisible ? 'text-[#FAC800] opacity-100' : 'text-[#FAC800] opacity-60 hover:opacity-100'}`}
                    >
                        <Calendar className="w-8 h-8" strokeWidth={1.5} />
                    </button>
                </div>
            )}

            {/* Yellow Overlay - Always on */}
            {isYellow && (
                <div className="absolute inset-0 z-10 bg-yellow-400 mix-blend-overlay pointer-events-none opacity-50" />
            )}

            {/* Date Preview Overlay */}
            {isDateVisible && (
                <div className="absolute top-[150px] left-1/2 -translate-x-1/2 z-40 pointer-events-none">
                    <span className="text-[#FAC800] text-[80px] font-semibold tracking-tight select-none"
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        {`${new Date().getFullYear()}.${new Date().getMonth() + 1}.${new Date().getDate()}`}
                    </span>
                </div>
            )}

            <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover ${isTracking ? "opacity-50" : "opacity-0"
                    } transition-opacity ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${isMosaic ? 'opacity-0' : ''}`}
                playsInline
                muted
            />

            {/* Mosaic Canvas Overlay */}
            <canvas
                ref={mosaicCanvasRef}
                className={`absolute inset-0 w-full h-full object-cover ${isMosaic && isTracking ? 'opacity-100' : 'opacity-0'
                    } transition-opacity ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {isTracking && (
                <Canvas
                    camera={{ position: [0, 0, 5], fov: 50 }}
                    className="!absolute inset-0"
                    gl={{ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
                    dpr={1}
                    onCreated={({ gl }) => {
                        threeCanvasRef.current = gl.domElement
                    }}
                >
                    <ParticleSystem
                        gesture={gesture}
                        fingerTip={fingerTip}
                        isDispersing={isDispersing}
                        disperseCenter={disperseCenter}
                        eyePosition={eyePosition}
                    />
                </Canvas>
            )}

            {!isTracking && isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[#FAC800] font-mono text-sm tracking-widest">LOADING...</span>
                </div>
            )}

            {/* Recording Button */}
            {isTracking && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-50">
                    {/* Timer */}
                    {isRecording && (
                        <div className="flex items-center gap-2.5 bg-black/70 px-5 py-2.5 rounded-full backdrop-blur-md">
                            <div className="w-2.5 h-2.5 bg-[#8B0000] rounded-full animate-pulse" />
                            <span className="text-white font-mono text-sm">
                                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    )}

                    {/* Simple Record Button */}
                    <button
                        onClick={toggleRecording}
                        className="flex items-center justify-center transition-all duration-300"
                        aria-label={isRecording ? '録画停止' : '録画開始'}
                    >
                        <div className={`bg-[#8B0000] transition-all duration-300 ${isRecording
                            ? 'w-7 h-7 rounded-sm'
                            : 'w-16 h-16 rounded-full'
                            }`} />
                    </button>
                </div>
            )}
        </div>
    )
}
