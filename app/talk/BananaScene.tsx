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
// 戦略: Y方向（上下）ではなく Z方向（奥行き）で「隠す」
//   開いた状態: 奥歯・口腔内が正面から見える (Z > 0.15)
//   閉じた状態: 奥歯・口腔内をZ方向に後退させてバナナの皮の裏に隠す
//   → 歯が交差する問題が物理的に発生しない
//
// 加えて: ごく小さなY移動で唇の「すぼまり感」を演出
// ─────────────────────────────────────────────────────────────────────────────
function buildMouthMorph(geometry: THREE.BufferGeometry): Float32Array {
  const pos    = geometry.attributes.position as THREE.BufferAttribute
  const count  = pos.count
  const deltas = new Float32Array(count * 3)

  // ── パラメータ ─────────────────────────────────────────────────────────────
  const CLOSE_Z      = -0.18   // 奥歯・口腔内をZ方向に後退（皮の裏へ隠す）
  const LIP_CLOSE_Y  = 0.025   // 唇の微小な閉じ（上下それぞれ ±0.025 のみ）

  // ── 境界 ─────────────────────────────────────────────────────────────────
  const Z_LIP    = 0.07    // 唇外縁（これより小さいと口の外）
  const Z_TEETH  = 0.15    // 歯・口腔内の境界
  const X_FULL   = 0.42    // この内側は100%効果
  const X_EDGE   = 0.57    // この外側はゼロ
  const Y_SEAM   = -0.09   // 上唇と下唇の境界

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)

    // 口の外はスキップ
    if (z <= Z_LIP)           continue
    if (Math.abs(x) >= X_EDGE) continue
    if (y >= 0.09 || y <= -0.43) continue

    // X方向フォールオフ（端だけなめらかにフェード）
    const ax = Math.abs(x)
    const xFall = ax <= X_FULL
      ? 1.0
      : Math.max(0, 1 - ((ax - X_FULL) / (X_EDGE - X_FULL)) ** 1.5)
    if (xFall <= 0) continue

    // Z方向: 奥ほど強く後退
    // 唇外縁(Z_LIP)→0, 歯・口腔内(Z_TEETH以上)→1
    const zFactor = z >= Z_TEETH
      ? 1.0
      : (z - Z_LIP) / (Z_TEETH - Z_LIP)

    const inf = xFall * zFactor

    // ── 奥行き圧縮（主）: 歯・口腔内を後退させる ─────────────────────────
    deltas[i * 3 + 2] = CLOSE_Z * inf

    // ── Y方向（微量）: 唇のすぼまり感のみ。歯の交差は絶対に起きないサイズ ─
    const lipY = y > Y_SEAM
      ? -LIP_CLOSE_Y * inf          // 上唇: わずかに下へ
      : +LIP_CLOSE_Y * inf * 0.6    // 下唇: わずかに上へ（控えめ）
    deltas[i * 3 + 1] = lipY
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
  const morphVal    = useRef(0)   // 0=開 1=閉

  useEffect(() => {
    // 中心合わせ・スケール正規化
    const box    = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())
    scene.position.sub(center)
    scene.scale.setScalar(1.8 / Math.max(size.x, size.y, size.z))

    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      // ── 材質修正: metallicFactor=1 を補正してテクスチャを正しく表示 ──────
      if (child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        mat.metalness = 0.05   // ほぼ非金属（バナナは有機物）
        mat.roughness = 0.65   // 適度なざらつき
        mat.envMapIntensity = 0.4  // 環境反射を抑える
        mat.needsUpdate = true
      }

      if (!child.geometry?.attributes?.position) return

      const geo    = child.geometry
      const deltas = buildMouthMorph(geo)

      geo.morphAttributes.position = [new THREE.BufferAttribute(deltas, 3)]
      geo.morphTargetsRelative = true
      child.updateMorphTargets()
      child.morphTargetInfluences![0] = 0   // 初期値: 開いた状態

      meshRef.current = child
    })

    onLoaded()
  }, [scene, onLoaded])

  useFrame(() => {
    if (!groupRef.current) return
    frame.current++
    const t = frame.current

    // ── ボブ・ゆれアニメーション ─────────────────────────────────────────
    const bobAmp  = isTalking ? 0.05  : 0.015
    const bobFreq = isTalking ? 0.11  : 0.022
    groupRef.current.position.y = Math.sin(t * bobFreq) * bobAmp

    const targetRZ = isTalking ? Math.sin(t * 0.07) * 0.022 : 0
    groupRef.current.rotation.z =
      THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRZ, 0.05)

    // open_full 時: わずかにスケールアップ（口が大きく開く強調）
    const tgtScale = mouthState === "open_full" ? 1.035 : 1.0
    const cs = groupRef.current.scale.x
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(cs, tgtScale, 0.12))

    // ── 口の開閉モーフ ────────────────────────────────────────────────────
    // 0=開いた状態  1=閉じた状態（奥歯が後退して皮に隠れる）
    const targetMorph = mouthState === "rest" ? 1.0 : 0.0

    // 開く: 速い（0.18） 閉じる: ゆっくり（0.08）→ 自然な顎の重さ
    const speed = targetMorph < morphVal.current ? 0.18 : 0.08
    morphVal.current = THREE.MathUtils.lerp(morphVal.current, targetMorph, speed)

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

        {/* 自然な光: 強すぎず、テクスチャが潰れない強度に調整 */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 5, 4]}  intensity={1.4} />
        <directionalLight position={[-2, 1, -1]} intensity={0.4} />
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
