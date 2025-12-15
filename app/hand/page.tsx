"use client"

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { Physics, useCompoundBody, usePlane, useSphere, usePointToPointConstraint } from "@react-three/cannon"
import { useState, useEffect, useRef, RefObject } from "react"
import HamburgerMenu from "../components/navigation/HamburgerMenu"
import { Banana } from "./Banana"
import { motion } from "framer-motion"
import * as THREE from "three"
import HandPostEditor, { HandPost } from "../components/modals/HandPostEditor"
import PostViewerModal from "../components/modals/PostViewerModal"
import LoginModal from "../components/modals/LoginModal"
import { useAuth } from "../components/providers/AuthProvider"
import { collection, query, orderBy, onSnapshot, limit, deleteDoc, doc } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"

// Background Color
const BG_COLOR = "#FAC800"

// --- DRAG LOGIC ---
function Cursor({ active }: { active: boolean }) {
    const { viewport, pointer } = useThree()
    const [ref, api] = useSphere(() => ({
        type: "Kinematic",
        args: [0.1],
        position: [0, 0, 0],
        collisionFilterGroup: 0 // Don't collide with anything
    }))

    useFrame((state) => {
        const x = (pointer.x * viewport.width) / 2
        const y = (pointer.y * viewport.height) / 2
        api.position.set(x, y, 0)
    })

    return <mesh ref={ref as any} visible={false} />
}

function DragConstraint({ cursorRef, bodyRef, offset }: { cursorRef: RefObject<THREE.Object3D | null>, bodyRef: RefObject<THREE.Object3D | null>, offset: [number, number, number] }) {
    usePointToPointConstraint(cursorRef, bodyRef, {
        pivotA: [0, 0, 0],
        pivotB: offset,
    })
    return null
}

// --- BANANA ---
function FallingBanana({
    position,
    rotation,
    onDragStart,
    onDragEnd,
    onBananaClick,
    id
}: {
    position: [number, number, number],
    rotation: [number, number, number],
    onDragStart: (ref: RefObject<THREE.Object3D>, offset: [number, number, number]) => void
    onDragEnd: () => void
    onBananaClick: (id: string) => void
    id: string
}) {
    const centerArgs: [number, number, number] = [0.8, 0.4, 0.4]
    const tipArgs: [number, number, number] = [0.9, 0.4, 0.4]

    const [ref] = useCompoundBody<THREE.Group>(() => ({
        mass: 5,
        position,
        rotation,
        shapes: [
            { type: 'Box', args: centerArgs, position: [0, 0, 0], rotation: [0, 0, 0] },
            { type: 'Box', args: tipArgs, position: [0.75, 0.2, 0], rotation: [0, 0, 0.4] },
            { type: 'Box', args: tipArgs, position: [-0.75, 0.2, 0], rotation: [0, 0, -0.4] }
        ],
        friction: 0.8,
        restitution: 0.0,
        angularDamping: 0.9,
        linearDamping: 0.5,
    }))

    // Interaction State
    const isDragging = useRef(false)
    const startPointerPos = useRef<{ x: number, y: number } | null>(null)

    return (
        <group
            ref={ref}
            onPointerDown={(e) => {
                e.stopPropagation()
                // @ts-ignore
                e.target.setPointerCapture(e.pointerId)

                // Calculate local offset
                const worldPoint = e.point.clone()
                const localPoint = ref.current!.worldToLocal(worldPoint)

                startPointerPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
                isDragging.current = false // Reset for this new interaction

                    // Store temp offset for when drag starts
                    ; (ref.current as any).userData.dragOffset = [localPoint.x, localPoint.y, localPoint.z]
            }}
            onPointerMove={(e) => {
                if (!startPointerPos.current) return

                const dx = e.nativeEvent.clientX - startPointerPos.current.x
                const dy = e.nativeEvent.clientY - startPointerPos.current.y
                const dist = Math.sqrt(dx * dx + dy * dy)

                if (!isDragging.current) {
                    if (dist > 20) { // Threshold
                        isDragging.current = true
                        const offset = (ref.current as any).userData.dragOffset
                        onDragStart(ref, offset)
                    }
                }
            }}
            onPointerUp={(e) => {
                e.stopPropagation()
                // @ts-ignore
                e.target.releasePointerCapture(e.pointerId)
                startPointerPos.current = null

                if (isDragging.current) {
                    onDragEnd()
                }
                // Do not reset isDragging here, so onClick can check it
            }}
            onClick={(e) => {
                e.stopPropagation()
                if (!isDragging.current) {
                    onBananaClick(id)
                }
            }}
        >
            <Banana scale={25} rotation={[0, Math.PI, 0]} />
            {/* Hit box helper: Transparent box to make clicking easier */}
            <mesh>
                <boxGeometry args={[1.5, 0.8, 0.8]} />
                <meshBasicMaterial visible={false} />
            </mesh>
        </group>
    )
}

function Boundaries() {
    const { viewport } = useThree()
    const width = viewport.width
    const height = viewport.height
    const xBound = width / 2
    const yFloor = -height / 2 + 0.5

    return (
        <>
            <Plane position={[0, yFloor, 0]} rotation={[-Math.PI / 2, 0, 0]} opacity={0.4} />
            <Plane position={[0, 0, -3]} rotation={[0, 0, 0]} isWall />
            <Plane position={[0, 0, 3]} rotation={[0, Math.PI, 0]} isWall />
            <Plane position={[-xBound, 0, 0]} rotation={[0, Math.PI / 2, 0]} isWall />
            <Plane position={[xBound, 0, 0]} rotation={[0, -Math.PI / 2, 0]} isWall />
        </>
    )
}

function Plane({ isWall, opacity = 0.3, ...props }: any) {
    const [ref] = usePlane<THREE.Mesh>(() => ({ ...props }))
    return (
        <mesh ref={ref} receiveShadow={!isWall} castShadow={false} raycast={isWall ? () => null : undefined}>
            <planeGeometry args={[100, 100]} />
            {!isWall && <shadowMaterial color="#000" transparent opacity={opacity} />}
            {isWall && <meshBasicMaterial visible={false} depthWrite={false} />}
        </mesh>
    )
}

interface BananaData {
    id: string
    pos: [number, number, number]
    rot: [number, number, number]
    content: string
    createdAt: number
    authorId?: string
    authorFingerId?: string
}

function Scene({ bananas, onBananaClick }: { bananas: BananaData[], onBananaClick: (id: string) => void }) {
    const [draggedBody, setDraggedBody] = useState<RefObject<THREE.Object3D> | null>(null)
    const [dragOffset, setDragOffset] = useState<[number, number, number]>([0, 0, 0])
    const cursorRef = useRef<THREE.Object3D>(null)

    return (
        <>
            <Physics gravity={[0, -5, 0]} iterations={10} allowSleep>
                <Boundaries />
                <CursorInternal forwardedRef={cursorRef} />

                {draggedBody && cursorRef.current && (
                    <DragConstraint cursorRef={cursorRef} bodyRef={draggedBody as any} offset={dragOffset} />
                )}

                {bananas.map(b => (
                    <FallingBanana
                        key={b.id}
                        id={b.id}
                        position={b.pos}
                        rotation={b.rot}
                        onDragStart={(ref, offset) => {
                            setDragOffset(offset)
                            setDraggedBody(ref)
                        }}
                        onDragEnd={() => setDraggedBody(null)}
                        onBananaClick={onBananaClick}
                    />
                ))}
            </Physics>

            <mesh visible={false} onPointerUp={() => setDraggedBody(null)} position={[0, 0, 5]}>
                <planeGeometry args={[100, 100]} />
            </mesh>
        </>
    )
}

function CursorInternal({ forwardedRef }: { forwardedRef: any }) {
    const { viewport, pointer } = useThree()
    const [ref, api] = useSphere(() => ({
        type: "Kinematic",
        args: [0.1],
        position: [0, 0, 0],
        collisionFilterGroup: 0
    }))

    useEffect(() => {
        if (forwardedRef) forwardedRef.current = ref.current
    }, [ref, forwardedRef])

    useFrame(() => {
        const x = (pointer.x * viewport.width) / 2
        const y = (pointer.y * viewport.height) / 2
        api.position.set(x, y, 0)
    })

    return <mesh ref={ref as any} visible={false} />
}

function App() {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [viewerPost, setViewerPost] = useState<HandPost | null>(null)
    const [bananas, setBananas] = useState<BananaData[]>([])
    const [isHoverSupported, setIsHoverSupported] = useState(false)
    const [isLoginOpen, setIsLoginOpen] = useState(false)
    const { user } = useAuth()

    // Editing state
    const [editingPost, setEditingPost] = useState<HandPost | null>(null)

    useEffect(() => {
        setIsHoverSupported(window.matchMedia('(hover: hover)').matches)
    }, [])

    // Queue for staggered spawning
    const bananaQueue = useRef<BananaData[]>([])
    const knownIds = useRef(new Set<string>())

    // Process Queue Interval
    useEffect(() => {
        const interval = setInterval(() => {
            if (bananaQueue.current.length > 0) {
                const nextBanana = bananaQueue.current.shift()
                if (nextBanana) {
                    setBananas(prev => {
                        // Double check it's not already there (safety)
                        if (prev.find(b => b.id === nextBanana.id)) return prev

                        return [
                            ...prev,
                            {
                                ...nextBanana,
                                // Random spawn at top
                                pos: [(Math.random() - 0.5) * 3, 10, (Math.random() - 0.5) * 1] as [number, number, number],
                                rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number]
                            }
                        ]
                    })
                }
            }
        }, 1000) // 1 second interval

        return () => clearInterval(interval)
    }, [])

    // Firestore Integration
    useEffect(() => {
        if (!db) return

        // Reset scene when user changes (so we can re-sort with new user items first)
        setBananas([])
        bananaQueue.current = []
        knownIds.current = new Set()

        const q = query(
            collection(db, "artifacts", appId, "public", "data", "banana_hand_posts"),
            orderBy("createdAt", "desc"),
            limit(50)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let fetchedBananas: BananaData[] = snapshot.docs.map(doc => {
                const data = doc.data()
                return {
                    id: doc.id,
                    content: data.content,
                    createdAt: data.createdAt?.toMillis() || Date.now(),
                    authorId: data.authorId,
                    authorFingerId: data.authorFingerId,
                    pos: [0, 0, 0],
                    rot: [0, 0, 0]
                }
            })

            // Sort logic: My posts first
            if (user?.uid) {
                fetchedBananas.sort((a, b) => {
                    const isMyA = a.authorId === user.uid
                    const isMyB = b.authorId === user.uid
                    if (isMyA && !isMyB) return -1
                    if (!isMyA && isMyB) return 1
                    return 0 // Keep original order (createdAt desc)
                })
            }

            const fetchedIds = new Set(fetchedBananas.map(b => b.id))

            // 1. Handle Removals & Updates immediately
            setBananas(prev => {
                // Remove deleted
                const surviving = prev.filter(b => fetchedIds.has(b.id))
                // Update content
                return surviving.map(b => {
                    const freshData = fetchedBananas.find(fb => fb.id === b.id)
                    if (freshData && freshData.content !== b.content) {
                        return { ...b, content: freshData.content }
                    }
                    return b
                })
            })

            // 2. Handle Additions (Queue)
            // Since `fetchedBananas` is sorted, they will be pushed to queue in order
            fetchedBananas.forEach(b => {
                if (!knownIds.current.has(b.id)) {
                    knownIds.current.add(b.id)
                    bananaQueue.current.push(b)
                }
            })
        })

        return () => unsubscribe()
    }, [user?.uid])


    // Sequence Logic: 8-7-7 (Indices: 0, 1, 2 of "877")
    const [tapSequenceIndex, setTapSequenceIndex] = useState(0)
    const targetSequence = ["8", "7", "7"]

    const handleCharTap = (char: string) => {
        const expectedChar = targetSequence[tapSequenceIndex]

        if (char === expectedChar) {
            if (tapSequenceIndex === targetSequence.length - 1) {
                // Success
                if (user && !user.isAnonymous) {
                    setEditingPost(null)
                    setIsEditorOpen(true)
                } else {
                    setIsLoginOpen(true)
                }
                setTapSequenceIndex(0)
            } else {
                setTapSequenceIndex(prev => prev + 1)
            }
        } else {
            // Reset
            if (char === "8") {
                setTapSequenceIndex(1)
            } else {
                setTapSequenceIndex(0)
            }
        }
    }

    const handleBananaClick = (id: string) => {
        const banana = bananas.find(b => b.id === id)
        if (banana) {
            setViewerPost({
                id: banana.id,
                content: banana.content,
                createdAt: banana.createdAt,
                authorId: banana.authorId,
                authorFingerId: banana.authorFingerId
            })
        }
    }

    const handleDeletePost = async (id: string) => {
        if (!db) return
        try {
            await deleteDoc(doc(db, "artifacts", appId, "public", "data", "banana_hand_posts", id))
            // The snapshot listener will handle the UI removal
        } catch (err) {
            console.error("Error deleting:", err)
            alert("Error deleting post.")
        }
    }

    const handleEditPost = (post: HandPost) => {
        setViewerPost(null) // Close viewer
        setEditingPost(post)
        setIsEditorOpen(true)
    }

    return (
        <>
            <HamburgerMenu />

            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

            <HandPostEditor
                isOpen={isEditorOpen}
                onClose={() => {
                    setIsEditorOpen(false)
                    setEditingPost(null)
                }}
                user={user}
                postToEdit={editingPost}
            />

            <PostViewerModal
                isOpen={!!viewerPost}
                onClose={() => setViewerPost(null)}
                post={viewerPost}
                currentUserId={user?.uid}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
            />

            <div
                ref={containerRef}
                className="w-full h-full bg-[#FAC800] overflow-hidden"
                style={{
                    height: "100dvh",
                    position: "fixed",
                    inset: 0,
                    touchAction: "none"
                }}
            >

                <div className="absolute inset-0 flex flex-col items-center justify-center pb-[35dvh] md:pb-0 pointer-events-none z-0">
                    <div className="flex flex-col items-center w-full">
                        <div className="flex justify-center w-full">
                            <div className="flex items-baseline relative whitespace-nowrap">


                                {/* 877hand */}
                                {"877hand".split("").map((char, index) => (
                                    <motion.span
                                        key={index}
                                        className="text-[18vw] md:text-[12vw] leading-[0.8] font-semibold tracking-tighter mix-blend-overlay text-black select-none pointer-events-auto cursor-pointer"
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 + index * 0.1, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                                        whileHover={isHoverSupported ? { y: -20, rotate: index % 2 === 0 ? 5 : -5, transition: { duration: 0.3 } } : undefined}
                                        whileTap={{ y: -20, rotate: index % 2 === 0 ? 5 : -5, transition: { duration: 0.3 } }}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleCharTap(char)
                                        }}
                                    >
                                        {char}
                                    </motion.span>
                                ))}
                            </div>
                        </div>

                        <motion.div
                            className="mt-8 md:mt-16 text-center relative z-20 px-2 mix-blend-overlay text-black pointer-events-auto"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1, duration: 1 }}
                        >
                            <div className="font-mono text-sm md:text-xs opacity-60 tracking-widest">EST. 2025 — TOKYO</div>
                        </motion.div>
                    </div>
                </div>

                <Canvas
                    shadows
                    camera={{ position: [0, 0, 12], fov: 50 }}
                    className="pointer-events-none relative z-10"
                    eventSource={containerRef as any}
                    eventPrefix="client"
                >
                    <ambientLight intensity={1.0} />
                    <spotLight
                        position={[0, 15, 0]}
                        angle={1.5}
                        penumbra={1}
                        intensity={4}
                        castShadow
                        shadow-bias={-0.0001}
                    />
                    <Environment preset="sunset" />
                    <Scene bananas={bananas} onBananaClick={handleBananaClick} />
                </Canvas>
            </div>
        </>
    )
}

export default App
