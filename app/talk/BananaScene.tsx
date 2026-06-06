"use client"

import { useRef, useEffect, Suspense, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF, Environment } from "@react-three/drei"
import * as THREE from "three"
import type { MouthState } from "./types"

// ── WebGLキャンバスをMediaRecorder用に外部refへ橋渡し ──────────────────────
function CanvasBridge({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const { gl } = useThree()
  useEffect(() => {
    ;(canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = gl.domElement
  }, [gl.domElement, canvasRef])
  return null
}

// ── バナナモデル ─────────────────────────────────────────────────────────────
function BananaModel({
  isTalking,
  mouthState,
  onLoaded,
}: {
  isTalking: boolean
  mouthState: MouthState
  onLoaded: () => void
}) {
  const { scene } = useGLTF("/banana-talk.glb")
  const groupRef  = useRef<THREE.Group>(null)
  const frame     = useRef(0)

  // 初回: 中心合わせ + スケール正規化
  useEffect(() => {
    const box    = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)

    scene.position.sub(center)
    scene.scale.setScalar(1.8 / maxDim)
    onLoaded()
  }, [scene, onLoaded])

  useFrame(() => {
    if (!groupRef.current) return
    frame.current++
    const t = frame.current

    // ゆったりした呼吸ボブ（話してる時は速く大きく）
    const bobAmp  = isTalking ? 0.055 : 0.016
    const bobFreq = isTalking ? 0.10  : 0.022
    groupRef.current.position.y = Math.sin(t * bobFreq) * bobAmp

    // 話してる時の左右ゆれ
    const targetZ = isTalking ? Math.sin(t * 0.08) * 0.028 : 0
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetZ, 0.06)

    // open_fullの瞬間だけわずかにズームアップ
    const targetScale = mouthState === "open_full" ? 1.04 : 1.0
    const cs = groupRef.current.scale.x
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(cs, targetScale, 0.14))
  })

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  )
}

// ── ローディングフォールバック ─────────────────────────────────────────────
function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color="#FAC800" />
    </mesh>
  )
}

// ── メインコンポーネント ─────────────────────────────────────────────────────
interface BananaSceneProps {
  canvasRef:    React.RefObject<HTMLCanvasElement | null>
  mouthState:   MouthState
  isTalking?:   boolean
  isRecording?: boolean
}

export default function BananaScene({
  canvasRef,
  mouthState,
  isTalking,
  isRecording,
}: BananaSceneProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative w-full" style={{ aspectRatio: "600 / 400" }}>
      {/* ローディング表示 */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[10px] tracking-widest uppercase opacity-30 animate-pulse">
            Loading...
          </span>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 0.05, 3.2], fov: 42 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        style={{ background: "transparent", opacity: loaded ? 1 : 0, transition: "opacity 0.6s" }}
      >
        <CanvasBridge canvasRef={canvasRef} />

        {/* ライティング */}
        <ambientLight intensity={1.4} />
        <directionalLight position={[4, 5, 5]}  intensity={2.2} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.7} />
        <directionalLight position={[0, -2, 3]}  intensity={0.4} />
        <Environment preset="studio" />

        <Suspense fallback={<Loader />}>
          <BananaModel
            isTalking={!!isTalking}
            mouthState={mouthState}
            onLoaded={() => setLoaded(true)}
          />
        </Suspense>
      </Canvas>

      {/* REC バッジ */}
      {isRecording && (
        <div className="absolute top-3 right-4 flex items-center gap-1.5 pointer-events-none select-none">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse block" />
          <span className="font-mono text-[9px] uppercase tracking-widest opacity-50">REC</span>
        </div>
      )}
    </div>
  )
}

// プリロード
useGLTF.preload("/banana-talk.glb")
