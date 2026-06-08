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
// 口開閉 モーフターゲット（上唇 + 下顎 統合版）
//
// 戦略:
//   【下顎】Y < SEAM_Y → 下唇皮 + 下歯 + 口腔下部 すべて一緒に落とす
//           Z_LIP_MAX 制限なし。歯も一体で動かして「伸び」を防ぐ。
//           ただし口縁に近いほど（zFactor）強く落とす。
//
//   【上唇】Y in (SEAM_Y, SEAM_Y + 0.20) → 上唇皮だけ持ち上げる
//           上歯（Z > 0.148）はスキップ — 固定アンカー
//
//   morph=0 → 自然（rest）
//   morph=0.5 → 中開き（open_mid）
//   morph=1.0 → 大開き（open_full）
// ─────────────────────────────────────────────────────────────────────────────
// ── banana-talk.glb 実測値（共通定数） ────────────────────────────────────
// 上歯: y ∈ [0.000, +0.025], z > 0.20
// 下歯: y ∈ [-0.025, -0.175], z > 0.20
// 口幅: x ∈ [-0.30, +0.31]
const SEAM_Y   = 0.000    // y<0 の下顎のみ動かす（上唇・上歯を完全に除外）
const BOTTOM_Y = -0.559

function calcWeights(x: number, y: number, z: number, xFullWidth: number, xFadeEnd: number) {
  if (y >= SEAM_Y || y <= BOTTOM_Y || z < 0.05) return null
  const zWeight = z >= 0.12 ? 1.0 : (z - 0.05) / 0.07
  const ax = Math.abs(x)
  const xWeight = ax <= xFullWidth
    ? 1.0
    : Math.max(0, 1 - (ax - xFullWidth) / (xFadeEnd - xFullWidth))
  const yNorm   = (-y) / (-BOTTOM_Y)
  const yWeight = 1.0 - Math.pow(yNorm, 2.5)
  return zWeight * xWeight * yWeight
}

// モーフ0: A形（あ段・広い開口）—— 下顎↓のみ、上唇は一切動かさない
function buildMorphA(geometry: THREE.BufferGeometry): Float32Array {
  const pos    = geometry.attributes.position as THREE.BufferAttribute
  const deltas = new Float32Array(pos.count * 3)
  const JAW_DROP = 0.17
  for (let i = 0; i < pos.count; i++) {
    const w = calcWeights(pos.getX(i), pos.getY(i), pos.getZ(i), 0.40, 0.60)
    if (w !== null && w > 0) deltas[i * 3 + 1] = -(JAW_DROP * w)
  }
  return deltas
}

// モーフ1: O形（お段・中央のみ）—— 下顎↓のみ、上唇は一切動かさない
function buildMorphO(geometry: THREE.BufferGeometry): Float32Array {
  const pos    = geometry.attributes.position as THREE.BufferAttribute
  const deltas = new Float32Array(pos.count * 3)
  const JAW_DROP = 0.12
  for (let i = 0; i < pos.count; i++) {
    const w = calcWeights(pos.getX(i), pos.getY(i), pos.getZ(i), 0.16, 0.28)
    if (w !== null && w > 0) deltas[i * 3 + 1] = -(JAW_DROP * w)
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
  const meshRef    = useRef<THREE.Mesh[]>([])
  const frame      = useRef(0)
  const morphAVal  = useRef(0)   // A形モーフ（広い開口）
  const morphOVal  = useRef(0)   // O形モーフ（丸い開口）

  useEffect(() => {
    const box    = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())
    scene.position.sub(center)
    scene.scale.setScalar(2.4 / Math.max(size.x, size.y, size.z))

    meshRef.current = []
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      const mat = child.material as THREE.MeshStandardMaterial
      if (mat) {
        mat.metalness       = 0.05
        mat.roughness       = 0.65
        mat.envMapIntensity = 0.35
        mat.needsUpdate     = true
      }

      if (!child.geometry?.attributes?.position) return

      const geo = child.geometry
      geo.morphAttributes.position = [
        new THREE.BufferAttribute(buildMorphA(geo), 3),  // index 0: 広い開口（A形）
        new THREE.BufferAttribute(buildMorphO(geo), 3),  // index 1: 丸い開口（O形）
      ]
      geo.morphTargetsRelative = true
      child.updateMorphTargets()
      child.morphTargetInfluences![0] = 0
      child.morphTargetInfluences![1] = 0

      meshRef.current.push(child)
    })

    onLoaded()
  }, [scene, onLoaded])

  useFrame(() => {
    if (!groupRef.current) return
    frame.current++
    const t = frame.current

    // ── ゆったりした浮遊アニメーション（サイズ変化なし・常に一定）─────
    groupRef.current.position.y = Math.sin(t * 0.018) * 0.010
    groupRef.current.rotation.z = 0
    groupRef.current.scale.setScalar(1.0)

    // ── 5段音素ステート → モーフ値 ──────────────────────────────────────
    // morphA(idx0): 広い開口（A形、全幅）
    // morphO(idx1): 丸い開口（O形、中央のみ）
    //
    //  ア: 広く大きく      → A高 O無
    //  イ: 浅く小さく      → A低 O無  （歯が少し見える程度）
    //  ウ: すぼめ・やや丸  → A低 O中
    //  エ: 中間・やや広め  → A中 O無
    //  オ: 丸く小さく      → A極小 O高
    let tgtA = 0, tgtO = 0
    switch (mouthState) {
      case "open_a":  tgtA = 1.00; tgtO = 0.00; break  // ア: 全開
      case "open_i":  tgtA = 0.28; tgtO = 0.00; break  // イ: 浅め
      case "open_u":  tgtA = 0.10; tgtO = 0.80; break  // ウ: 丸く小さく
      case "open_e":  tgtA = 0.62; tgtO = 0.00; break  // エ: 中広め
      case "open_o":  tgtA = 0.04; tgtO = 1.00; break  // オ: 完全に丸く
      default:        tgtA = 0.00; tgtO = 0.00; break  // rest
    }

    // 開くとき速く(0.42)、閉じるとき(0.28) → 130ms/charで完全に開閉
    const sA = tgtA > morphAVal.current ? 0.42 : 0.28
    const sO = tgtO > morphOVal.current ? 0.42 : 0.28
    morphAVal.current = THREE.MathUtils.lerp(morphAVal.current, tgtA, sA)
    morphOVal.current = THREE.MathUtils.lerp(morphOVal.current, tgtO, sO)

    for (const mesh of meshRef.current) {
      if (mesh.morphTargetInfluences) {
        mesh.morphTargetInfluences[0] = morphAVal.current
        mesh.morphTargetInfluences[1] = morphOVal.current
      }
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
        camera={{ position: [0, 0.05, 2.6], fov: 52 }}
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
