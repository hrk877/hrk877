"use client"

import { useRef, useEffect, Suspense, useState, useCallback } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF, Environment } from "@react-three/drei"
import * as THREE from "three"
import type { MouthState } from "./types"

function CanvasBridge({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    ;(canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = gl.domElement
    // デバッグ用: コンソールからライト・マテリアルを調整できるように公開
    ;(window as unknown as Record<string, unknown>).__talkScene = { gl, scene }
  }, [gl, scene, canvasRef])
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// 口開閉 モーフターゲット（GLB実測ベース v2）
//
// banana-talk.glb は単一メッシュ + ペイントテクスチャの一体型モデル。
// 歯・口はジオメトリではなくテクスチャに描かれているため、
// 「描かれた帯」に合わせて変位プロファイルを区分設計する:
//
//   上唇・上歯帯  → 完全固定（動かすと気持ち悪い）
//   暗い口腔帯    → ここだけに勾配を集中（黒いので伸びても見えない）
//   下歯帯        → 一定変位 = 剛体移動（歯が伸びない）
//   顎下          → なだらかに減衰
//
// 口はスマイル曲線状に湾曲しているため、帯の境界は x の二次曲線。
// 全定数は頂点UV→テクスチャ色の逆引きによる実測値（2026-06-11計測）:
//   口の中心線:  y = -0.2293 + 0.0727x²
//   口腔半高:    0.0575 - 0.45x²（口角に向かって閉じる）
//   下歯下端:    y = -0.3427 + 0.7867x²
//   口角:        x ≈ ±0.33（±0.26まで全効・±0.38で0）
// ─────────────────────────────────────────────────────────────────────────────
const seamY    = (x: number) => -0.2293 + 0.0727 * x * x          // 上下の歯の間の中心線
const halfGap  = (x: number) => Math.max(0.012, 0.0575 - 0.45 * x * x)
const rampTop  = (x: number) => seamY(x) + halfGap(x)             // 上歯の下端
const rampBot  = (x: number) => seamY(x) - halfGap(x)             // 下歯の上端
const JAW_DROP = 0.16

// SHUT（閉唇）用: 口全体（上歯上端〜下歯下端）を中心線へ圧縮する帯
const mouthTop = (x: number) => -0.055 - 1.04 * x * x + 0.012     // 上唇の際
const mouthBot = (x: number) => -0.3427 + 0.7867 * x * x - 0.012  // 下唇の際
const SHUT_TOP = 0.03    // この上は不動（皮はここまでに吸収）
const SHUT_BOT = -0.50   // この下は不動
const SHUT_K   = 0.12    // 圧縮後に残す高さの比率

const smooth01 = (t: number) => {
  const c = t < 0 ? 0 : t > 1 ? 1 : t
  return c * c * (3 - 2 * c)
}
const xWeight = (x: number) => 1 - smooth01((Math.abs(x) - 0.26) / 0.12)
const zWeight = (z: number) => smooth01((z - 0.02) / 0.07)

// 4モーフを1パスで生成
//   jaw:    開口（下歯帯〜あご全体を剛体で下げる）— あ・え・お
//   close:  閉口（下歯を上歯に当てるまで上げる）  — い・う
//   narrow: すぼめ（口領域を x 中央へ収縮）       — う・お
//   shut:   閉唇（口全体を中心線へ圧縮→一本の線） — ま・ば・ぱ行・ん
function buildMorphs(geometry: THREE.BufferGeometry) {
  const pos    = geometry.attributes.position as THREE.BufferAttribute
  const jaw    = new Float32Array(pos.count * 3)
  const close  = new Float32Array(pos.count * 3)
  const narrow = new Float32Array(pos.count * 3)
  const shut   = new Float32Array(pos.count * 3)

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const zw = zWeight(z)
    if (zw <= 0) continue
    const xw = xWeight(x)

    if (xw > 0 && y < rampTop(x)) {
      const rt = rampTop(x), rb = rampBot(x)
      // 区分プロファイル: 暗帯=勾配 / 下歯帯〜あご下端=剛体
      // （あご下をフェードさせると皮が折り重なる。漫画的にも顎ごと動くのが正しい）
      const w = y >= rb ? (rt - y) / (rt - rb) : 1.0

      jaw[i * 3 + 1] = -JAW_DROP * w * xw * zw

      // 閉口は列ごとの口腔高さ（2*halfGap）に比例して持ち上げる
      const d = (y >= rb ? rt - y : rt - rb) * 0.92
      close[i * 3 + 1] = d * xw * zw
    }

    // 閉唇: 口帯[mouthBot, mouthTop]を seam へ圧縮し、上下の皮で吸収する
    if (xw > 0 && y < SHUT_TOP && y > SHUT_BOT) {
      const s = seamY(x), mt = mouthTop(x), mb = mouthBot(x)
      let d: number
      if (y > mt)       d = (s - mt) * (1 - SHUT_K) * (1 - smooth01((y - mt) / (SHUT_TOP - mt)))
      else if (y >= mb) d = (s - y) * (1 - SHUT_K)
      else              d = (s - mb) * (1 - SHUT_K) * (1 - smooth01((mb - y) / (mb - SHUT_BOT)))
      shut[i * 3 + 1] = d * xw * zw
    }

    // すぼめ: 口中心 ±0.10 全効・±0.24 で0、x は ±0.30..0.46 でフェード
    const yw = 1 - smooth01((Math.abs(y - seamY(x)) - 0.10) / 0.14)
    const nw = yw * (1 - smooth01((Math.abs(x) - 0.30) / 0.16)) * zw
    if (nw > 0) narrow[i * 3] = -x * 0.5 * nw
  }
  return { jaw, close, narrow, shut }
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
  const groupRef    = useRef<THREE.Group>(null)
  const meshRef     = useRef<THREE.Mesh[]>([])
  const frame       = useRef(0)
  const morphVals   = useRef([0, 0, 0, 0])   // jaw / close / narrow / shut
  const initialized = useRef(false)  // スケール設定を一度だけ実行するガード

  useEffect(() => {
    if (initialized.current) return   // 再レンダー時の再実行を防ぐ
    initialized.current = true
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
        mat.envMapIntensity = 0.07
        mat.needsUpdate     = true
      }

      if (!child.geometry?.attributes?.position) return

      const geo = child.geometry
      const { jaw, close, narrow, shut } = buildMorphs(geo)
      geo.morphAttributes.position = [
        new THREE.BufferAttribute(jaw, 3),     // index 0: 開口
        new THREE.BufferAttribute(close, 3),   // index 1: 閉口
        new THREE.BufferAttribute(narrow, 3),  // index 2: すぼめ
        new THREE.BufferAttribute(shut, 3),    // index 3: 閉唇
      ]
      geo.morphTargetsRelative = true
      child.updateMorphTargets()
      child.morphTargetInfluences!.fill(0)

      meshRef.current.push(child)
    })

    onLoaded()
  }, [scene, onLoaded])

  useFrame(() => {
    if (!groupRef.current) return
    frame.current++
    const t = frame.current

    // 静止（揺れ・スケール変化なし）
    groupRef.current.position.y = 0
    groupRef.current.rotation.z = 0
    groupRef.current.scale.setScalar(1.0)

    // ── 音素ステート → モーフ値 ──────────────────────────────────────
    // [jaw, close, narrow, shut]
    //
    //  rest:   全0 → 元の描かれた笑顔
    //  ア:     大きく開く            → jaw 1.0
    //  イ:     歯を噛み合わせた横笑顔 → close 0.92
    //  ウ:     小さくすぼめる        → close 0.55 + narrow 1.0
    //  エ:     中開き                → jaw 0.50
    //  オ:     丸く縦開き            → jaw 0.50 + narrow 0.85
    //  closed: 唇を閉じる(ま・ば・ぱ・ん) → shut 1.0
    const targets = [0, 0, 0, 0]
    switch (mouthState) {
      case "open_a":  targets[0] = 1.00;                   break
      case "open_i":  targets[1] = 0.92;                   break
      case "open_u":  targets[1] = 0.55; targets[2] = 1.0; break
      case "open_e":  targets[0] = 0.50;                   break
      case "open_o":  targets[0] = 0.50; targets[2] = 0.85; break
      case "closed":  targets[3] = 1.00;                   break
      default:                                             break  // rest
    }

    // 動き始め速く(0.5)、戻るとき(0.32) → 110ms/charでも開閉が見える
    const vals = morphVals.current
    for (let k = 0; k < 4; k++) {
      const s = targets[k] > vals[k] ? 0.5 : 0.32
      vals[k] = THREE.MathUtils.lerp(vals[k], targets[k], s)
    }

    for (const mesh of meshRef.current) {
      const inf = mesh.morphTargetInfluences
      if (inf) {
        inf[0] = vals[0]; inf[1] = vals[1]; inf[2] = vals[2]; inf[3] = vals[3]
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
  canvasRef:  React.RefObject<HTMLCanvasElement | null>
  mouthState: MouthState
  isTalking?: boolean
}

export default function BananaScene({
  canvasRef,
  mouthState,
  isTalking,
}: BananaSceneProps) {
  const [loaded, setLoaded] = useState(false)
  // useCallbackで参照を安定化 → BananaModelのuseEffectが再実行されない
  const handleLoaded = useCallback(() => setLoaded(true), [])

  return (
    <div className="relative w-full h-full">
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
          width: "100%",
          height: "100%",
          background: "transparent",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.6s",
        }}
      >
        <CanvasBridge canvasRef={canvasRef} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[3, 5, 4]}  intensity={0.38} />
        <directionalLight position={[-2, 1, -1]} intensity={0.1} />
        <directionalLight position={[0, -1, 3]}  intensity={0.06} />
        <Environment preset="apartment" environmentIntensity={0.25} />

        <Suspense fallback={<Loader />}>
          <BananaModel
            isTalking={!!isTalking}
            mouthState={mouthState}
            onLoaded={handleLoaded}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}

useGLTF.preload("/banana-talk.glb")
