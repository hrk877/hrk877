"use client"

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { Physics, useCompoundBody, usePlane, useSphere, usePointToPointConstraint } from "@react-three/cannon"
import { useState, useEffect, useRef, createRef, RefObject } from "react"
import HamburgerMenu from "../components/navigation/HamburgerMenu"
import { Banana } from "./Banana"
import { motion } from "framer-motion"
import * as THREE from "three"

// Background Color
const BG_COLOR = "#FAC800"

// --- DRAG LOGIC ---
// A cursor object that follows the mouse/touch
function Cursor({ active }: { active: boolean }) {
    const { viewport, pointer } = useThree()
    const [ref, api] = useSphere(() => ({
        type: "Kinematic",
        args: [0.1],
        position: [0, 0, 0],
        collisionFilterGroup: 0 // Don't collide with anything
    }))

    useFrame((state) => {
        // Map pointer (-1 to 1) to viewport units
        // Need to project to a specific Z-depth? 
        // For simplicity, we drag on z=0 plane or keeping z?
        // Let's drag at z=0 for now.
        const x = (pointer.x * viewport.width) / 2
        const y = (pointer.y * viewport.height) / 2
        api.position.set(x, y, 0)
    })

    return <mesh ref={ref as any} visible={false} />
}

// Logic to bind cursor to a body
function DragConstraint({ cursorRef, bodyRef }: { cursorRef: RefObject<THREE.Object3D | null>, bodyRef: RefObject<THREE.Object3D | null> }) {
    usePointToPointConstraint(cursorRef, bodyRef, {
        pivotA: [0, 0, 0],
        pivotB: [0, 0, 0],
    })
    return null
}

// --- BANANA ---
function FallingBanana({
    position,
    rotation,
    onPointerDown
}: {
    position: [number, number, number],
    rotation: [number, number, number],
    onPointerDown: (ref: RefObject<THREE.Object3D>) => void
}) {
    // Improved Compound body: 3 segments for smoother curve
    // Banana scale 25 is approx 2.5 units end-to-end.
    // Center segment + 2 angled tips.
    // Tighter boxes (0.4 thickness) to reduce "floating" gaps.
    const centerArgs: [number, number, number] = [0.8, 0.4, 0.4]
    const tipArgs: [number, number, number] = [0.9, 0.4, 0.4]

    // NOTE: useCompoundBody requires a ref to the group/mesh
    const [ref] = useCompoundBody<THREE.Group>(() => ({
        mass: 5, // Increased from 1 to 5 for heavier feel
        position,
        rotation,
        shapes: [
            { type: 'Box', args: centerArgs, position: [0, 0, 0], rotation: [0, 0, 0] }, // Center
            { type: 'Box', args: tipArgs, position: [0.75, 0.2, 0], rotation: [0, 0, 0.4] }, // Right Tip
            { type: 'Box', args: tipArgs, position: [-0.75, 0.2, 0], rotation: [0, 0, -0.4] } // Left Tip
        ],
        friction: 0.8, // Higher friction for less sliding
        restitution: 0.0, // Low bounciness for heavy feel
        angularDamping: 0.9, // High resistance to rotation for "heavy" feel
        linearDamping: 0.5, // Air resistance
    }))

    return (
        <group
            ref={ref}
            onPointerDown={(e) => {
                e.stopPropagation()
                // @ts-ignore
                e.target.setPointerCapture(e.pointerId)
                onPointerDown(ref)
            }}
            onPointerUp={(e) => {
                // handled globally or let parent handle?
                // usually simple drag handles up on window, but simple pointer capture works
                // Actually passing 'null' to parent to clear drag
            }}
        // className removed as it is not a valid prop for Three.js group (use HTML for that or custom logic)
        >
            <Banana scale={25} rotation={[0, Math.PI, 0]} />
        </group>
    )
}

function Boundaries() {
    const { viewport } = useThree()
    const width = viewport.width
    const height = viewport.height
    // Keep bananas roughly within the visible area. 
    // Divide by 2 for half-width. 
    const xBound = width / 2
    const yFloor = -height / 2 + 0.5 // Just above bottom edge

    return (
        <>
            <Plane position={[0, yFloor, 0]} rotation={[-Math.PI / 2, 0, 0]} opacity={0.4} /> {/* Floor - Visible Shadow */}

            {/* Invisible Walls - No Shadow */}
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
        <mesh ref={ref} receiveShadow={!isWall} castShadow={false}>
            <planeGeometry args={[100, 100]} />
            {!isWall && <shadowMaterial color="#000" transparent opacity={opacity} />}
            {isWall && <meshBasicMaterial visible={false} depthWrite={false} />}
        </mesh>
    )
}

function Scene() {
    const [bananas, setBananas] = useState<{ id: number, pos: [number, number, number], rot: [number, number, number] }[]>([])

    // Drag state
    const [draggedBody, setDraggedBody] = useState<RefObject<THREE.Object3D> | null>(null)
    const cursorRef = useRef<THREE.Object3D>(null)

    // Spawn effect
    useEffect(() => {
        const interval = setInterval(() => {
            setBananas(prev => {
                const limit = 100 // Updated limit per request
                const newBanana = {
                    id: Date.now(),
                    // Spawn logic
                    pos: [(Math.random() - 0.5) * 3, 10, (Math.random() - 0.5) * 1] as [number, number, number],
                    rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number]
                }
                const newArr = [...prev, newBanana]
                if (newArr.length > limit) return newArr.slice(1) // Remove oldest
                return newArr
            })
        }, 5000) // 5 seconds interval as requested
        return () => clearInterval(interval)
    }, [])

    return (
        <>
            {/* Physics World settings for better collision */}
            {/* Decreased gravity for slower fall as requested */}
            <Physics gravity={[0, -5, 0]} iterations={10} allowSleep>
                <Boundaries />

                {/* Cursor for dragging */}
                {/* We create a 'kinematic' sphere tracking mouse. If dragging, we constrain it to the body */}
                {/* Note: direct ref usage for cursor body */}
                <CursorInternal forwardedRef={cursorRef} />

                {draggedBody && cursorRef.current && (
                    <DragConstraint cursorRef={cursorRef} bodyRef={draggedBody as any} />
                )}

                {bananas.map(b => (
                    <FallingBanana
                        key={b.id}
                        position={b.pos}
                        rotation={b.rot}
                        onPointerDown={(ref) => setDraggedBody(ref)}
                    />
                ))}
            </Physics>

            {/* Global event to release drag if mouse up anywhere */}
            <mesh
                visible={false}
                onPointerUp={() => setDraggedBody(null)}
                position={[0, 0, 5]} // in front
            >
                <planeGeometry args={[100, 100]} />
            </mesh>
        </>
    )
}

// Helper to expose ref from useSphere
function CursorInternal({ forwardedRef }: { forwardedRef: any }) {
    const { viewport, pointer } = useThree()
    const [ref, api] = useSphere(() => ({
        type: "Kinematic",
        args: [0.1],
        position: [0, 0, 0],
        collisionFilterGroup: 0
    }))

    // Sync ref
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

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-[#FAC800] overflow-hidden"
            // Use 100dvh for mobile browsers to avoid scrollbar/address bar issues
            style={{
                height: "100dvh",
                position: "fixed",
                inset: 0,
                touchAction: "none" // Prevents scrolling on mobile while dragging
            }}
        >
            <HamburgerMenu />

            {/* Centered Title & Text - Hero Style */}
            {/* z-0 places it behind the Canvas (z-10) */}
            {/* Centered Title & Text - Hero Style */}
            {/* z-0 places it behind the Canvas (z-10) */}
            {/* Centered Title & Text - Hero Style */}
            {/* z-0 places it behind the Canvas (z-10) */}
            {/* Centered Title & Text - Hero Style */}
            {/* z-0 places it behind the Canvas (z-10) */}
            {/* FORCE CENTER + Mobile Offset: justify-center + pb-[35dvh] (shifts even further up) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pb-[35dvh] md:pb-0 pointer-events-none z-0">
                <div className="flex flex-col items-center w-full">
                    <div className="flex justify-center w-full">
                        <div className="flex items-baseline relative whitespace-nowrap">
                            {"877hand".split("").map((char, index) => (
                                <motion.span
                                    key={index}
                                    // Reduced size to 2/3: text-[18vw] md:text-[12vw]
                                    className="text-[18vw] md:text-[12vw] leading-[0.8] font-semibold tracking-tighter mix-blend-overlay text-black select-none cursor-default pointer-events-auto cursor-pointer"
                                    initial={{ y: 100, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 + index * 0.1, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                                    whileHover={{ y: -20, rotate: index % 2 === 0 ? 5 : -5, transition: { duration: 0.3 } }}
                                    whileTap={{ y: -20, rotate: index % 2 === 0 ? 5 : -5, transition: { duration: 0.3 } }}
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
                        {/* "We Curve" removed as requested */}
                        <div className="font-mono text-sm md:text-xs opacity-60 tracking-widest">EST. 2025 — TOKYO</div>
                    </motion.div>
                </div>
            </div>

            {/* Canvas: z-10 (Front), pointer-events-none (Click-through), with eventSource (Captures events from container) */}
            <Canvas
                shadows
                camera={{ position: [0, 0, 12], fov: 50 }}
                className="pointer-events-none relative z-10"
                eventSource={containerRef as any}
                eventPrefix="client"
            >
                {/* Lighting setup: Matches Homepage "Sunset" vibe but top-down */}
                {/* User requested: Real shadows, darker like homepage */}
                <ambientLight intensity={1.0} />
                <spotLight
                    position={[0, 15, 0]} // Directly above
                    angle={1.5} // Wide angle to cover entire floor "visible range"
                    penumbra={1}
                    intensity={4}
                    castShadow
                    shadow-bias={-0.0001}
                />
                <Environment preset="sunset" />

                {/* Removed ContactShadows to avoid "floating" or "narrow" artifacts. 
                    Relying purely on the physical floor shadowMaterial. */}

                <Scene />
            </Canvas>
        </div>
    )
}

export default App
