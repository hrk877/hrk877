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
// 口閉じモーフターゲット生成
//
// GLB座標系（実測）:
//   X: -0.55 ~ +0.55  (口の幅)
//   Y:  0.04 ~ -0.40  (口の高さ: 上端0.04, 下端-0.40)
//   Z: -0.27 ~ +0.27  (前後: 前面=正, 後面=負)
//
// 口腔内 (Z>0.15): 28,013頂点
//   上グループ (Y > -0.08): 上顎・上の歯
//   下グループ (Y < -0.12): 下顎・下の歯
//
// ★ 解法: 剛体平行移動（Rigid Body Translation）
//   各グループ内の頂点は全て同じΔYだけ移動 → 歯の形が崩れない
//   前後圧縮（ΔZ）も一様に適用
// ─────────────────────────────────────────────────────────────────────────────
function buildMouthMorph(geometry: THREE.BufferGeometry): Float32Array {
  const pos    = geometry.attributes.position as THREE.BufferAttribute
  const count  = pos.count
  const deltas = new Float32Array(count * 3)

  // ── 閉じる量 ──────────────────────────────────────────────────────────────
  const UPPER_DY = -0.10   // 上グループ: 下に0.10移動
  const LOWER_DY = +0.13   // 下グループ: 上に0.13移動
  const INNER_DZ = -0.06   // 奥行きを縮める

  // ── 境界 ─────────────────────────────────────────────────────────────────
  const SEAM_HI  = -0.08   // 上グループ下端 (Y > SEAM_HI → 上グループ)
  const SEAM_LO  = -0.14   // 下グループ上端 (Y < SEAM_LO → 下グループ)
  // SEAM_HI ~ SEAM_LO 間はブレンド

  // ── 口の領域 ─────────────────────────────────────────────────────────────
  const Z_OUTER  = 0.07    // 口の外縁Z（これより小さいと口の外）
  const Z_INNER  = 0.16    // 完全な内側Z（これより大きいと奥歯・喉）
  const X_FULL   = 0.42    // この内側は100%効果
  const X_EDGE   = 0.56    // この外側はゼロ（境界フェード）
  const Y_TOP    = 0.08    // 口の上端
  const Y_BOT    = -0.42   // 口の下端

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)

    // 口の領域外はスキップ
    if (z <= Z_OUTER) continue
    if (Math.abs(x) >= X_EDGE) continue
    if (y >= Y_TOP || y <= Y_BOT) continue

    // ── X方向フォールオフ: 両端のみなだらかにフェード ──────────────────────
    const ax = Math.abs(x)
    const xFall = ax <= X_FULL
      ? 1.0
      : 1.0 - ((ax - X_FULL) / (X_EDGE - X_FULL)) ** 2
    if (xFall <= 0) continue

    // ── Z方向フォールオフ: 奥ほど強く動く ─────────────────────────────────
    // 外縁(Z=Z_OUTER)→0、内側(Z=Z_INNER以上)→1
    const zFactor = Math.max(0, Math.min(1, (z - Z_OUTER) / (Z_INNER - Z_OUTER)))

    // ── 剛体平行移動: 上グループ/下グループで固定量を適用 ──────────────────
    let rigidDY: number
    if (y > SEAM_HI) {
      // 上グループ: 全頂点を同じ量だけ下に移動
      rigidDY = UPPER_DY
    } else if (y < SEAM_LO) {
      // 下グループ: 全頂点を同じ量だけ上に移動
      rigidDY = LOWER_DY
    } else {
      // 境界ブレンドゾーン (-0.14 ~ -0.08)
      const t = (y - SEAM_LO) / (SEAM_HI - SEAM_LO)  // 0→下, 1→上
      rigidDY = LOWER_DY + t * (UPPER_DY - LOWER_DY)
    }

    const inf = xFall * zFactor

    deltas[i * 3 + 0] = 0                // ΔX なし
    deltas[i * 3 + 1] = rigidDY * inf    // ΔY: 剛体移動
    deltas[i * 3 + 2] = INNER_DZ * inf   // ΔZ: 奥行きを縮める
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
  const morphVal    = useRef(0)  // 0=開, 1=閉

  useEffect(() => {
    // 中心合わせ・スケール正規化
    const box    = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())
    scene.position.sub(center)
    scene.scale.setScalar(1.8 / Math.max(size.x, size.y, size.z))

    // モーフターゲット設定
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      if (!child.geometry?.attributes?.position) return

      const geo    = child.geometry
      const deltas = buildMouthMorph(geo)

      geo.morphAttributes.position = [new THREE.BufferAttribute(deltas, 3)]
      geo.morphTargetsRelative = true
      child.morphTargetInfluences = [0]  // 0=開いた状態
      child.updateMorphTargets()

      meshRef.current = child
    })

    onLoaded()
  }, [scene, onLoaded])

  useFrame(() => {
    if (!groupRef.current) return
    frame.current++
    const t = frame.current

    // ── ボブ・ゆれ ─────────────────────────────────────────────────────────
    const bobAmp  = isTalking ? 0.055 : 0.016
    const bobFreq = isTalking ? 0.10  : 0.022
    groupRef.current.position.y = Math.sin(t * bobFreq) * bobAmp

    const targetZ = isTalking ? Math.sin(t * 0.08) * 0.028 : 0
    groupRef.current.rotation.z =
      THREE.MathUtils.lerp(groupRef.current.rotation.z, targetZ, 0.06)

    const targetScale = mouthState === "open_full" ? 1.04 : 1.0
    const cs = groupRef.current.scale.x
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(cs, targetScale, 0.14))

    // ── 口の開閉モーフ ─────────────────────────────────────────────────────
    // 0=完全に開いた状態, 1=閉じた状態
    const targetMorph = mouthState === "rest" ? 1.0 : 0.0

    // 開く時は速く・閉じる時はゆっくり（自然な顎の動き）
    const lerpSpeed = targetMorph < morphVal.current ? 0.14 : 0.09
    morphVal.current = THREE.MathUtils.lerp(morphVal.current, targetMorph, lerpSpeed)

    if (meshRef.current?.morphTargetInfluences) {
      meshRef.current.morphTargetInfluences[0] = morphVal.current
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
