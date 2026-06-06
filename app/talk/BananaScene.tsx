"use client"

import { useRef, useEffect, Suspense, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF, Environment } from "@react-three/drei"
import * as THREE from "three"
import type { MouthState } from "./types"

function CanvasBridge({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const { gl } = useThree()
  useEffect(() => {
    ;(canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = gl.domElement
  }, [gl.domElement, canvasRef])
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// 口閉じモーフターゲット
//
// ★ 核心戦略: 歯（Z > 0.15）には絶対に触れない
//    バナナの皮の縁（唇縁ゾーン Z=0.06〜0.148）だけを動かして
//    皮が内側に折りたたまれて歯を覆う → カーテンが閉まるイメージ
//
// 実測データ:
//   上唇縁 (Y > -0.09, Z=0.06~0.148): 7,871頂点  Y範囲 -0.09~+0.09
//   下唇縁 (Y <=-0.09, Z=0.06~0.148): 19,631頂点 Y範囲 -0.43~-0.09
//   歯・口腔 (Z > 0.15):              28,013頂点  ← 一切動かさない
// ─────────────────────────────────────────────────────────────────────────────
function buildLipMorph(geometry: THREE.BufferGeometry): Float32Array {
  const pos    = geometry.attributes.position as THREE.BufferAttribute
  const count  = pos.count
  const deltas = new Float32Array(count * 3)

  const Z_LIP_START = 0.060   // 唇縁ゾーン開始（バナナ皮の表面）
  const Z_LIP_END   = 0.148   // 唇縁ゾーン終了（歯の手前、Z>0.15の歯には触れない）
  const SEAM_Y      = -0.09   // 上唇と下唇が合わさるライン
  const LOWER_CAP   = 0.105   // 下唇の最大移動量（これ以上動かさない）
  const X_FULL      = 0.43    // この内側は100%効果
  const X_EDGE      = 0.57    // この外側はゼロ

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)

    // ── 唇縁ゾーン以外は完全にスキップ ──────────────────────────────────
    if (z < Z_LIP_START || z >= Z_LIP_END) continue   // 歯(Z≥0.148)は無視
    if (y >= 0.10 || y <= -0.44)           continue
    if (Math.abs(x) >= X_EDGE)             continue

    // ── X方向フォールオフ（口の両端のみなめらかにフェード） ──────────────
    const ax = Math.abs(x)
    const xFall = ax <= X_FULL
      ? 1.0
      : Math.max(0, 1 - ((ax - X_FULL) / (X_EDGE - X_FULL)) ** 1.5)
    if (xFall <= 0) continue

    // ── Z方向フォールオフ（外縁→フル効果、Z_LIP_STARTから0.04でランプアップ） ─
    const zFactor = Math.max(0, Math.min(1, (z - Z_LIP_START) / 0.04))

    const inf = xFall * zFactor

    // ── Y移動量: シームラインに向かって折りたたむ ─────────────────────────
    // rawDY = SEAM_Y - y （シームへの方向ベクトル）
    //   上唇(Y > SEAM_Y): rawDY < 0 → 下方向
    //   下唇(Y < SEAM_Y): rawDY > 0 → 上方向
    const rawDY = SEAM_Y - y

    // 下唇は動きすぎないようにキャップ（バナナ形状が崩れないため）
    const cappedDY = y > SEAM_Y
      ? rawDY                           // 上唇: シームまで完全に閉じる
      : Math.min(rawDY, LOWER_CAP)      // 下唇: 最大 LOWER_CAP まで

    deltas[i * 3 + 0] = 0
    deltas[i * 3 + 1] = cappedDY * inf
    // 唇縁を僅かにZ後退させて内側ジオメトリとのZ-fightingを防止
    deltas[i * 3 + 2] = -0.012 * inf
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
  const { scene } = useGLTF("/banana-talk.glb")
  const groupRef  = useRef<THREE.Group>(null)
  const meshRef   = useRef<THREE.Mesh | null>(null)
  const frame     = useRef(0)
  const morphVal  = useRef(0)  // 0=口全開、1=口閉じ

  useEffect(() => {
    // 中心合わせ・スケール正規化
    const box    = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())
    scene.position.sub(center)
    scene.scale.setScalar(1.8 / Math.max(size.x, size.y, size.z))

    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      // 材質修正: metallicFactor=1 → 0.05（バナナは非金属）
      const mat = child.material as THREE.MeshStandardMaterial
      if (mat) {
        mat.metalness       = 0.05
        mat.roughness       = 0.65
        mat.envMapIntensity = 0.35
        mat.needsUpdate     = true
      }

      if (!child.geometry?.attributes?.position) return

      const geo    = child.geometry
      const deltas = buildLipMorph(geo)

      geo.morphAttributes.position = [new THREE.BufferAttribute(deltas, 3)]
      geo.morphTargetsRelative = true
      child.updateMorphTargets()
      child.morphTargetInfluences![0] = 0  // 初期: 口全開

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
    const bobFreq = isTalking ? 0.12  : 0.022
    groupRef.current.position.y = Math.sin(t * bobFreq) * bobAmp

    const targetRZ = isTalking ? Math.sin(t * 0.08) * 0.025 : 0
    groupRef.current.rotation.z =
      THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRZ, 0.05)

    const tgtScale = mouthState === "open_full" ? 1.03 : 1.0
    const cs = groupRef.current.scale.x
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(cs, tgtScale, 0.12))

    // ── 口の開閉モーフ ────────────────────────────────────────────────────
    // 0=全開（歯が全部見える）/ 1=閉（唇縁が歯を覆う）
    const targetMorph = mouthState === "rest" ? 1.0 : 0.0

    // 開くとき速く(0.20)、閉じるときゆっくり(0.07) = 自然な顎の重さ
    const speed = targetMorph < morphVal.current ? 0.20 : 0.07
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

function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color="#FAC800" />
    </mesh>
  )
}

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
