
"use client"

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { Physics, useCompoundBody, usePlane, useSphere, usePointToPointConstraint } from "@react-three/cannon"
import { useState, useEffect, useRef, RefObject } from "react"
import HamburgerMenu from "../components/navigation/HamburgerMenu"
import { Banana } from "../finger/Banana"
import { motion } from "framer-motion"
import * as THREE from "three"
import { WeatherForecast } from "../lib/weather"

// --- 3D COMPONENTS (Adapted from Finger) ---

function Cursor({ active }: { active: boolean }) {
    const { viewport, pointer } = useThree()
    const [ref, api] = useSphere(() => ({
        type: "Kinematic",
        args: [0.1],
        position: [0, 0, 0],
        collisionFilterGroup: 0
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

// --- UPDATED FALLING BANANA ---

function FallingBanana({
    position,
    rotation,
    onDragStart,
    onDragEnd,
    onRemove, // New prop
    id
}: {
    position: [number, number, number],
    rotation: [number, number, number],
    onDragStart: (ref: RefObject<THREE.Object3D>, offset: [number, number, number]) => void
    onDragEnd: () => void
    onRemove: (id: string) => void
    id: string
}) {
    // Scale 15 args (approx 60% of original scale 25)
    const centerArgs: [number, number, number] = [0.48, 0.24, 0.24]
    const tipArgs: [number, number, number] = [0.54, 0.24, 0.24]

    const [ref] = useCompoundBody<THREE.Group>(() => ({
        mass: 3,
        position,
        rotation,
        shapes: [
            { type: 'Box', args: centerArgs, position: [0, 0, 0], rotation: [0, 0, 0] },
            { type: 'Box', args: tipArgs, position: [0.45, 0.12, 0], rotation: [0, 0, 0.4] },
            { type: 'Box', args: tipArgs, position: [-0.45, 0.12, 0], rotation: [0, 0, -0.4] }
        ],
        friction: 0.8,
        restitution: 0.0,
        angularDamping: 0.9,
        linearDamping: 0.8, // Increased damping for "floaty" feel
    }))

    const isDragging = useRef(false)
    const startPointerPos = useRef<{ x: number, y: number } | null>(null)

    // Position-based cleanup
    useFrame(() => {
        if (ref.current) {
            // Check Y position. Lower bound -20 ensures it's well off screen (camera at Z=12, Y view is approx +/- 10?)
            if (ref.current.position.y < -20) {
                onRemove(id)
            }
        }
    })

    return (
        <group
            ref={ref}
            onPointerDown={(e) => {
                e.stopPropagation()
                // @ts-ignore
                e.target.setPointerCapture(e.pointerId)
                const worldPoint = e.point.clone()
                const localPoint = ref.current!.worldToLocal(worldPoint)
                startPointerPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
                isDragging.current = false
                    ; (ref.current as any).userData.dragOffset = [localPoint.x, localPoint.y, localPoint.z]
            }}
            onPointerMove={(e) => {
                if (!startPointerPos.current) return
                const dx = e.nativeEvent.clientX - startPointerPos.current.x
                const dy = e.nativeEvent.clientY - startPointerPos.current.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (!isDragging.current && dist > 20) {
                    isDragging.current = true
                    const offset = (ref.current as any).userData.dragOffset
                    onDragStart(ref, offset)
                }
            }}
            onPointerUp={(e) => {
                e.stopPropagation()
                // @ts-ignore
                e.target.releasePointerCapture(e.pointerId)
                startPointerPos.current = null
                if (isDragging.current) onDragEnd()
            }}
        >
            <Banana scale={15} rotation={[0, Math.PI, 0]} />
        </group>
    )
}

function Boundaries() {
    const { viewport } = useThree()
    const width = viewport.width
    const xBound = width / 2

    return (
        <>
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

// --- SCENE ---

interface InteractiveBanana {
    id: string
    pos: [number, number, number]
    rot: [number, number, number]
    createdAt: number
}

function Scene({ isRaining }: { isRaining: boolean }) {
    const [bananas, setBananas] = useState<InteractiveBanana[]>([])
    const [draggedBody, setDraggedBody] = useState<RefObject<THREE.Object3D> | null>(null)
    const [dragOffset, setDragOffset] = useState<[number, number, number]>([0, 0, 0])
    const cursorRef = useRef<THREE.Object3D>(null)

    // Callback for position-based removal
    const handleRemove = (id: string) => {
        setBananas(prev => prev.filter(b => b.id !== id))
    }

    // Spawner ONLY (Cleanup is now in Child component)
    useEffect(() => {
        const interval = setInterval(() => {
            setBananas(prev => {
                const now = Date.now();
                // Spawn new if raining
                // Start active count check
                if (isRaining && prev.length < 50) {
                    return [
                        ...prev,
                        {
                            id: Math.random().toString(),
                            pos: [(Math.random() - 0.5) * 8, 12, (Math.random() - 0.5) * 4],
                            rot: [Math.random(), Math.random(), Math.random()],
                            createdAt: now
                        }
                    ];
                }
                return prev;
            })
        }, 600); // Check every 600ms

        return () => clearInterval(interval);
    }, [isRaining]);


    return (
        <>
            <Physics gravity={[0, -4, 0]} iterations={10}>
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
                        onRemove={handleRemove}
                    />
                ))}
            </Physics>
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

    useFrame(() => {
        const x = (pointer.x * viewport.width) / 2
        const y = (pointer.y * viewport.height) / 2
        api.position.set(x, y, 0)
    })

    // Connect ref
    useEffect(() => { if (forwardedRef) forwardedRef.current = ref.current }, [forwardedRef, ref])

    return <mesh ref={ref as any} visible={false} />
}


// --- MAIN CLIENT COMPONENT ---

export default function WeatherClient({ forecast }: { forecast: WeatherForecast | null }) {
    const containerRef = useRef<HTMLDivElement>(null)

    return (
        <>
            <HamburgerMenu />

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
                {/* Foreground UI (Overlay) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 text-black">
                    {/* Title */}
                    <div className="flex flex-col items-center">
                        <div className="flex items-baseline relative whitespace-nowrap">
                            {"WEATHER".split("").map((char, index) => (
                                <motion.span
                                    key={index}
                                    className="text-[15vw] md:text-[10vw] leading-[0.8] font-semibold tracking-tighter cursor-default select-none"
                                    initial={{ y: 100, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 * index, duration: 1, ease: [0.2, 1, 0.3, 1] }}
                                >
                                    {char}
                                </motion.span>
                            ))}
                        </div>
                    </div>

                    {/* Info Block */}
                    {forecast ? (
                        <motion.div
                            className="mt-8 flex flex-col items-center gap-4 cursor-default select-none pointer-events-auto"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1, duration: 1 }}
                        >
                            <div className="flex flex-col items-center gap-2">
                                {/* Increased font size for weather description */}
                                <p className="text-3xl font-bold tracking-widest uppercase">{forecast.weather}</p>
                                <p className="text-xs font-mono tracking-[0.2em]">{forecast.date}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-12 mt-6 border-t border-black/20 pt-6">
                                <div className="text-center">
                                    {/* Increased label size */}
                                    <p className="text-sm font-mono tracking-widest mb-1 opacity-60">TEMP</p>
                                    <p className="text-2xl font-bold">
                                        {forecast.tempMin}<span className="text-lg font-light mx-1">-</span>{forecast.tempMax}<span className="text-xs ml-1">°C</span>
                                    </p>
                                </div>
                                <div className="text-center">
                                    {/* Increased label size */}
                                    <p className="text-sm font-mono tracking-widest mb-1 opacity-60">RAIN</p>
                                    <p className="text-2xl font-bold">{forecast.rainChance}</p>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="mt-8 text-xl font-bold">LOADING...</div>
                    )}
                </div>

                {/* 3D Scene */}
                <Canvas
                    shadows
                    camera={{ position: [0, 0, 12], fov: 50 }}
                    className="pointer-events-none relative z-10"
                    eventSource={containerRef as any}
                    eventPrefix="client"
                >
                    <ambientLight intensity={1.0} />
                    <spotLight position={[0, 15, 0]} angle={1.5} penumbra={1} intensity={4} castShadow shadow-bias={-0.0001} />
                    <Environment preset="sunset" />

                    {/* FORCED TRUE for testing */}
                    <Scene isRaining={true} />
                </Canvas>
            </div>
        </>
    )
}
