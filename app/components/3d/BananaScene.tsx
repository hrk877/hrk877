"use client"

import { Canvas } from "@react-three/fiber"
import { Environment, PresentationControls, ContactShadows } from "@react-three/drei"
import { BananaModel } from "./BananaModel"
import { Suspense, Component, type ReactNode } from "react"

// WebGL クラッシュをサイト全体に伝播させないための ErrorBoundary
class BananaErrorBoundary extends Component<
    { children: ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: ReactNode }) {
        super(props)
        this.state = { hasError: false }
    }
    static getDerivedStateFromError() {
        return { hasError: true }
    }
    render() {
        // エラー時は何も表示しない（背景色のみ）
        if (this.state.hasError) return null
        return this.props.children
    }
}

export default function BananaScene() {
    return (
        <BananaErrorBoundary>
            <div className="absolute inset-0 z-0 select-none pointer-events-auto">
                <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }}>
                    <Suspense fallback={null}>
                        <ambientLight intensity={2} />
                        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={5} castShadow />
                        <Environment preset="sunset" />

                        <PresentationControls
                            global
                            rotation={[0, 0, 0]}
                            polar={[-Math.PI / 2, Math.PI / 2]}
                            azimuth={[-Math.PI, Math.PI]}
                        >
                            <BananaModel scale={1.5} />
                        </PresentationControls>

                        <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                    </Suspense>
                </Canvas>
            </div>
        </BananaErrorBoundary>
    )
}
