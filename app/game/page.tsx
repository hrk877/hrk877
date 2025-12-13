
"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Environment, Center } from "@react-three/drei"
import { Physics, useBox, usePointToPointConstraint, useSpring, useSphere } from "@react-three/cannon"
import { useState, useEffect, useRef, createRef, RefObject } from "react"
import * as THREE from "three"
import HamburgerMenu from "../components/navigation/HamburgerMenu"
import { Banana } from "../hand/Banana"

// --- Physics Interaction Components (Copied/Adapted from /hand) ---

// Cursor Component: Must be a Physics Body for constraints to work
const Cursor = ({ forwardedRef }: { forwardedRef: RefObject<THREE.Object3D> }) => {
    const { viewport, pointer } = useThree()
    const [ref, api] = useSphere(() => ({
        type: "Kinematic",
        args: [0.1],
        position: [0, 0, 0],
        collisionFilterGroup: 0 // No collisions, just for constraint attachment
    }))

    // Sync external ref
    useEffect(() => {
        if (forwardedRef) {
            // @ts-ignore
            forwardedRef.current = ref.current
        }
    }, [ref, forwardedRef])

    useFrame(() => {
        // Map pointer to viewport (Z=0 plane)
        const x = (pointer.x * viewport.width) / 2
        const y = (pointer.y * viewport.height) / 2
        api.position.set(x, y, 0)
    })

    return (
        <mesh ref={ref as any} visible={false}>
            <sphereGeometry args={[0.1]} />
            <meshBasicMaterial color="red" />
        </mesh>
    )
}

// Link component
function DragLink({ bodyRef, cursorRef, pivot }: { bodyRef: RefObject<THREE.Object3D>, cursorRef: RefObject<THREE.Object3D>, pivot: [number, number, number] }) {
    usePointToPointConstraint(bodyRef, cursorRef, {
        pivotA: pivot,
        pivotB: [0, 0, 0],
    })
    return null
}

// Spinning Banana
function SpinningBanana({ cursorRef }: { cursorRef: RefObject<THREE.Object3D> }) {
    const { viewport } = useThree()
    const scale = Math.min(viewport.width, viewport.height) * 3

    // Physics Body
    const [ref] = useBox(() => ({
        mass: 10,  // Heavier feels better
        position: [0, 0, 0],
        args: [5, 2, 2], // Physics shape size (approx)
        linearDamping: 0.1,
        angularDamping: 0.5, // Increased friction
        linearFactor: [0, 0, 0], // Lock Position
        angularFactor: [0, 0, 1] // Lock Rotation to Z axis
    }))

    // Hinge removed in favor of Factors

    const [dragPivot, setDragPivot] = useState<[number, number, number] | null>(null)

    const handlePointerDown = (e: any) => {
        e.stopPropagation()
        e.target.setPointerCapture(e.pointerId)

        const bananaBody = ref.current
        if (bananaBody) {
            const worldPoint = new THREE.Vector3(e.point.x, e.point.y, e.point.z)
            const localPoint = bananaBody.worldToLocal(worldPoint)
            setDragPivot([localPoint.x, localPoint.y, localPoint.z])
        }
    }

    const handlePointerUp = (e: any) => {
        setDragPivot(null)
        e.target.releasePointerCapture(e.pointerId)
    }

    useEffect(() => {
        const globalUp = () => setDragPivot(null)
        window.addEventListener("pointerup", globalUp)
        return () => window.removeEventListener("pointerup", globalUp)
    }, [])

    return (
        <group>
            {dragPivot && cursorRef.current && <DragLink bodyRef={ref as any} cursorRef={cursorRef} pivot={dragPivot} />}

            <mesh ref={ref as any} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
                <group rotation={[0, Math.PI, Math.PI / 2]}>
                    <Center>
                        <Banana scale={scale} />
                    </Center>
                </group>
                {/* Generous Hit Box */}
                <boxGeometry args={[scale * 0.9, scale * 0.4, 2]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
        </group>
    )
}

export default function GamePage() {
    const containerRef = useRef(null)
    const cursorRef = useRef<THREE.Object3D>(null)

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-[#FAC800] overflow-hidden fixed inset-0 touch-none"
        >
            <HamburgerMenu />

            <Canvas shadows camera={{ position: [0, 0, 15], fov: 50 }}>
                <ambientLight intensity={1.5} />
                <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={2} castShadow />
                <Environment preset="sunset" />

                <Physics gravity={[0, 0, 0]}>
                    <Cursor forwardedRef={cursorRef as any} />
                    <SpinningBanana cursorRef={cursorRef as any} />
                </Physics>
            </Canvas>
        </div>
    )
}
