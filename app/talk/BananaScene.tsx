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

// ── 口の頂点を解析してモーフターゲット（デルタ）を生成 ──────────────────────
// GLB座標系: X[-1,1] Y[-0.56,0.56] Z[-0.27,0.27]
// 口の領域:  Z > 0.08, |X| < 0.48, -0.32 < Y < 0.12
function buildMouthCloseDelta(geometry: THREE.BufferGeometry): Float32Array {
  const pos    = geometry.attributes.position as THREE.BufferAttribute
  const count  = pos.count
  const deltas = new Float32Array(count * 3) // 全頂点ゼロ初期化

  const X_MAX    = 0.48
  const Y_MIN    = -0.33
  const Y_MAX    = 0.13
  const Y_CENTER = (Y_MIN + Y_MAX) / 2  // ≈ -0.10（口の中心Y）
  const Z_OUTER  = 0.08   // 唇の外縁
  const Z_INNER  = 0.22   // 奥歯・喉付近

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)

    // 口の領域外はスキップ
    if (Math.abs(x) >= X_MAX || y <= Y_MIN || y >= Y_MAX || z <= Z_OUTER) continue

    // 深さ方向の強度（奥ほど強く動く）
    const depth = Math.max(0, Math.min(1, (z - Z_OUTER) / (Z_INNER - Z_OUTER)))

    // X方向のフォールオフ（端ほど弱く）
    const xFall = Math.max(0, 1 - (Math.abs(x) / X_MAX) ** 1.4)

    // 総合強度
    const inf = depth * xFall

    // 口を閉じる: 上下の頂点を Y_CENTER に向けて寄せる
    deltas[i * 3 + 0] = 0                              // ΔX なし
    deltas[i * 3 + 1] = (Y_CENTER - y) * inf * 0.80   // ΔY: 上は下へ・下は上へ
    deltas[i * 3 + 2] = -0.10 * inf * depth            // ΔZ: 奥行きを縮める
  }

  return deltas
}

// ── バナナモデル ─────────────────────────────────────────────────────────────
function BananaModel({
  isTalking,
  mouthState,
  onLoaded,
}: {
  isTalking:  boolean
  mouthState: MouthState
  onLoaded:   () => void
}) {
  const { scene }   = useGLTF("/banana-talk.glb")
  const groupRef    = useRef<THREE.Group>(null)
  const meshRef     = useRef<THREE.Mesh | null>(null)
  const frame       = useRef(0)
  const morphTarget = useRef(0) // 現在のモーフ値（0=開, 1=閉）

  useEffect(() => {
    // シーンの中心合わせ・スケール正規化
    const box    = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    scene.position.sub(center)
    scene.scale.setScalar(1.8 / maxDim)

    // メッシュを取得してモーフターゲットを設定
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      if (!child.geometry?.attributes?.position)  return

      const geo    = child.geometry
      const deltas = buildMouthCloseDelta(geo)

      geo.morphAttributes.position = [
        new THREE.BufferAttribute(deltas, 3),
      ]
      geo.morphTargetsRelative = true  // デルタ方式（元の形 + 差分）

      child.morphTargetInfluences = [0]  // 初期値: 口が開いた状態
      child.updateMorphTargets()

      meshRef.current = child
    })

    onLoaded()
  }, [scene, onLoaded])

  useFrame(() => {
    if (!groupRef.current) return
    frame.current++
    const t = frame.current

    // ── ボブ＆ゆれアニメーション ──────────────────────────────────────────
    const bobAmp  = isTalking ? 0.055 : 0.016
    const bobFreq = isTalking ? 0.10  : 0.022
    groupRef.current.position.y = Math.sin(t * bobFreq) * bobAmp

    const targetZ = isTalking ? Math.sin(t * 0.08) * 0.028 : 0
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetZ, 0.06)

    const targetScale = mouthState === "open_full" ? 1.04 : 1.0
    const cs = groupRef.current.scale.x
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(cs, targetScale, 0.14))

    // ── 口の開閉モーフ ────────────────────────────────────────────────────
    // 0 = 開いてる, 1 = 閉じてる
    const targetMorph = mouthState === "rest" ? 1.0 : 0.0
    morphTarget.current = THREE.MathUtils.lerp(morphTarget.current, targetMorph, 0.10)

    if (meshRef.current?.morphTargetInfluences) {
      meshRef.current.morphTargetInfluences[0] = morphTarget.current
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
      <sphereGeometry args={[0.08, 8, 8]} />
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
        style={{ background: "transparent", opacity: loaded ? 1 : 0, transition: "opacity 0.6s" }}
      >
        <CanvasBridge canvasRef={canvasRef} />
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
