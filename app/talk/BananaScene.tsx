"use client"

import { useRef, useEffect, Suspense, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF, Environment } from "@react-three/drei"
import * as THREE from "three"
import type { MouthState } from "./types"

// ── WebGLキャンバスをMediaRecorder用refへ橋渡し ────────────────────────────
function CanvasBridge({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const { gl } = useThree()
  useEffect(() => {
    ;(canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = gl.domElement
  }, [gl.domElement, canvasRef])
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// バナナモデル
//
// 方針: 頂点操作は一切行わない（単一メッシュの性質上アーティファクトが出るため）
// モデルは常に「口が開いたスマイル」= キャラクターの表情として扱う
//
// しゃべってる感の表現:
//   ① Y軸スケールの脈動 → 顎が上下する印象
//   ② 上下ボブ           → 頭が弾む
//   ③ Z軸回転ゆれ        → 身体がのりのりになる
//   ④ open_full時に前傾き → 「大きく開いた」強調
// ─────────────────────────────────────────────────────────────────────────────
function BananaModel({
  isTalking,
  mouthState,
  onLoaded,
}: {
  isTalking:  boolean
  mouthState: MouthState
  onLoaded:   () => void
}) {
  const { scene } = useGLTF("/banana-talk.glb")
  const groupRef  = useRef<THREE.Group>(null)
  const frame     = useRef(0)

  // モデルのセットアップ（形状・材質のみ）
  useEffect(() => {
    const box    = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())
    scene.position.sub(center)
    scene.scale.setScalar(1.8 / Math.max(size.x, size.y, size.z))

    // 材質修正: metallicFactor=1 → 0.05（バナナは非金属）
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const mat = child.material as THREE.MeshStandardMaterial
      if (!mat) return
      mat.metalness        = 0.05
      mat.roughness        = 0.65
      mat.envMapIntensity  = 0.35
      mat.needsUpdate      = true
    })

    onLoaded()
  }, [scene, onLoaded])

  useFrame(() => {
    if (!groupRef.current) return
    frame.current++
    const t = frame.current

    if (isTalking) {
      // ── 話している状態: 元気よくしゃべる ──────────────────────────────
      const bobFreq  = 0.14
      const bobAmp   = 0.055

      // 上下ボブ（速め）
      groupRef.current.position.y = Math.sin(t * bobFreq) * bobAmp

      // Z軸ゆれ（体を振る）
      groupRef.current.rotation.z = Math.sin(t * 0.09) * 0.030

      // ── 口の開閉: Y軸スケールの脈動で「顎が動く」印象を作る ─────────────
      // open_full: スケールが大きい（口が開ききってる）
      // open_mid:  やや縮む（顎が少し閉じる）
      const targetScaleY = mouthState === "open_full" ? 1.06 : 0.94
      const targetScaleX = mouthState === "open_full" ? 0.97 : 1.02  // 横は逆に
      const curY = groupRef.current.scale.y
      const curX = groupRef.current.scale.x
      groupRef.current.scale.y = THREE.MathUtils.lerp(curY, targetScaleY, 0.22)
      groupRef.current.scale.x = THREE.MathUtils.lerp(curX, targetScaleX, 0.22)
      groupRef.current.scale.z = THREE.MathUtils.lerp(groupRef.current.scale.z, 1.0, 0.10)

      // open_full 時: 少し前傾（大きく開いた強調）
      const targetRX = mouthState === "open_full" ? 0.06 : 0.0
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRX, 0.15)

    } else {
      // ── 休止状態: ゆったりした呼吸 ─────────────────────────────────────
      groupRef.current.position.y =
        THREE.MathUtils.lerp(groupRef.current.position.y, Math.sin(t * 0.022) * 0.016, 0.08)

      // 全スケール・回転を1/0に戻す
      groupRef.current.scale.x = THREE.MathUtils.lerp(groupRef.current.scale.x, 1.0, 0.05)
      groupRef.current.scale.y = THREE.MathUtils.lerp(groupRef.current.scale.y, 1.0, 0.05)
      groupRef.current.scale.z = THREE.MathUtils.lerp(groupRef.current.scale.z, 1.0, 0.05)
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05)
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.05)
    }
  })

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  )
}

// ── ローディング ─────────────────────────────────────────────────────────────
function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color="#FAC800" />
    </mesh>
  )
}

// ── メインコンポーネント ──────────────────────────────────────────────────────
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
        style={{
          background: "transparent",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.6s",
        }}
      >
        <CanvasBridge canvasRef={canvasRef} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 5, 4]}  intensity={1.5} />
        <directionalLight position={[-2, 1, -1]} intensity={0.45} />
        <directionalLight position={[0, -1, 3]}  intensity={0.3} />
        <Environment preset="apartment" />

        <Suspense fallback={<Loader />}>
          <BananaModel
            isTalking={!!isTalking}
            mouthState={mouthState}
            onLoaded={() => setLoaded(true)}
          />
        </Suspense>
      </Canvas>

      {isRecording && (
        <div className="absolute top-3 right-4 flex items-center gap-1.5 pointer-events-none select-none">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse block" />
          <span className="font-mono text-[9px] uppercase tracking-widest opacity-50">REC</span>
        </div>
      )}
    </div>
  )
}

useGLTF.preload("/banana-talk.glb")
