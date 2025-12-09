"use client"

import { Canvas } from "@react-three/fiber"
import { Environment, PresentationControls, ContactShadows } from "@react-three/drei"
import { BananaModel } from "./BananaModel"
import { Suspense } from "react"

export default function BananaScene() {
    return (
        <div className="absolute inset-0 z-0 select-none pointer-events-auto">
            <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }}>
                <Suspense fallback={null}>
                    <ambientLight intensity={2} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={5} castShadow />
                    <Environment preset="sunset" />

                    <PresentationControls
                        global
                        config={{ mass: 2, tension: 400 }}
                        // Removed snap to keep it where user left it
                        rotation={[0, 0, 0]}
                        polar={[-Infinity, Infinity]} // Allow full rotation
                        azimuth={[-Infinity, Infinity]}
                    >
                        <BananaModel rotation={[0, 0, Math.PI / 4]} scale={1.5} />
                    </PresentationControls>

                    <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                </Suspense>
            </Canvas>
        </div>
    )
}
