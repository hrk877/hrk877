"use client"

import { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import HamburgerMenu         from "../components/navigation/HamburgerMenu"
import BananaScene           from "./BananaScene"
import { useTalkController } from "./useTalkController"
import { prefetchPhonemes }  from "./phonemize"
import type { MouthState }   from "./types"

const DEBUG_STATES: MouthState[] = ["rest", "open_a", "open_i", "open_u", "open_e", "open_o", "closed"]

export default function TalkPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [script, setScript] = useState("")
  const [isDebug, setIsDebug] = useState(false)
  const [debugMouth, setDebugMouth] = useState<MouthState | null>(null)
  const [isLandscapePhone, setIsLandscapePhone] = useState(false)

  useEffect(() => {
    setIsDebug(new URLSearchParams(window.location.search).has("debug"))
  }, [])

  // スマホ横画面の検出（高さ600px以下に限定してデスクトップを除外）
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape) and (max-height: 600px)")
    const update = () => setIsLandscapePhone(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  // 入力中に形態素解析を先読みして、TALK押下時にはモーラ精度のタイムラインが揃っている状態にする
  useEffect(() => {
    if (!script.trim()) return
    const id = setTimeout(() => prefetchPhonemes(script), 400)
    return () => clearTimeout(id)
  }, [script])

  // ブラウザUI色（iOSステータスバー・オーバースクロール）もページに合わせて黒にする
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#000000")
    const prevBg = document.body.style.backgroundColor
    document.body.style.backgroundColor = "#000000"
    return () => { document.body.style.backgroundColor = prevBg }
  }, [])

  const { mouthState, isTalking, speak, stop } = useTalkController(canvasRef)

  // ── スマホ横画面: バナナだけの全画面。タップで入力済みスクリプトを喋る ──
  if (isLandscapePhone) {
    return (
      <div
        className="h-dvh w-screen bg-black overflow-hidden"
        onPointerUp={() => (isTalking ? stop() : speak(script.trim() || "こんにちは、バナナです"))}
      >
        <BananaScene
          canvasRef={canvasRef}
          mouthState={debugMouth ?? mouthState}
          isTalking={isTalking}
          zoomed
        />
      </div>
    )
  }

  return (
    <div className="h-dvh bg-black text-[#FAC800] overflow-hidden relative flex flex-col">
      <div className="noise-overlay" />

      {/* HamburgerMenu — 他のページと同じ絶対配置 */}
      <HamburgerMenu color="#FAC800" themeColor="#000000" />

      {/* コンテンツ全体 — pt はハンバーガー分の余白 */}
      <div className="flex-1 min-h-0 flex flex-col px-4 md:px-6 pt-20 md:pt-24 pb-4 md:pb-5">

        {/* ── Header — Museum / Journal と同じスタイル（高さ固定・動的要素なし） ── */}
        <header className="flex flex-col md:flex-row justify-between items-start border-b border-[#FAC800] pb-3 md:pb-4 mb-3 md:mb-4 shrink-0">
          <h1 className="text-[clamp(2.8rem,10vw,5.5rem)] font-serif font-thin leading-[0.92] tracking-tight">
            BANANA<br className="hidden sm:block" />{" "}TALK
          </h1>
          <div className="text-left mt-3 md:mt-0">
            <p className="font-mono text-lg md:text-xs opacity-60">
              Voice Lab<br />
              877hand
            </p>
          </div>
        </header>

        {/* ── Banana — 残り全スペース ── */}
        <div className="flex-1 min-h-0 w-full relative">
          <BananaScene
            canvasRef={canvasRef}
            mouthState={debugMouth ?? mouthState}
            isTalking={isTalking}
          />
          {/* ?debug=1 のときだけ表示する口形検証ボタン */}
          {isDebug && (
            <div className="absolute top-0 right-0 flex flex-col gap-1 z-10">
              {DEBUG_STATES.map(s => (
                <button
                  key={s}
                  data-mouth={s}
                  onClick={() => setDebugMouth(m => (m === s ? null : s))}
                  className={`font-mono text-[9px] border border-[#FAC800] px-2 py-1 uppercase
                    ${debugMouth === s ? "bg-[#FAC800] text-black" : "bg-transparent"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Controls ── */}
        <div className="shrink-0 pt-3 md:pt-4">
          <div className="border-t border-[#FAC800]/20 pb-3" />

          <div className="flex gap-3 md:gap-4 items-end">

            {/* Textarea */}
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="font-mono text-[9px] tracking-[0.24em] uppercase opacity-35">
                Script
              </label>
              <textarea
                value={script}
                onChange={e => setScript(e.target.value)}
                disabled={isTalking}
                placeholder="ここにスクリプトを入力..."
                rows={2}
                style={{ fontSize: "16px" }}
                className="
                  w-full bg-transparent border border-[#FAC800]/30 px-4 py-2.5
                  font-mono leading-relaxed resize-none
                  placeholder:opacity-20 focus:outline-none focus:border-[#FAC800]
                  disabled:opacity-30 disabled:cursor-not-allowed
                  transition-colors
                "
              />
            </div>

            {/* TALK / STOP button */}
            <div className="shrink-0 pb-px">
              <AnimatePresence mode="wait">
                {!isTalking ? (
                  <motion.button
                    key="talk"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => speak(script)}
                    disabled={!script.trim()}
                    className="
                      font-mono text-[11px] tracking-[0.24em] uppercase
                      border border-[#FAC800] px-6 py-3 w-28 md:w-36
                      hover:bg-[#FAC800] hover:text-black
                      active:opacity-60 transition-colors
                      disabled:opacity-20 disabled:cursor-not-allowed
                    "
                  >
                    TALK ▶
                  </motion.button>
                ) : (
                  <motion.button
                    key="stop"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={stop}
                    className="
                      font-mono text-[11px] tracking-[0.24em] uppercase
                      border border-[#FAC800] px-6 py-3 w-28 md:w-36
                      bg-[#FAC800] text-black
                      hover:bg-[#FAC800]/80 active:opacity-60 transition-colors
                    "
                  >
                    STOP ■
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="font-mono text-[8px] opacity-20 tracking-widest uppercase mt-2">
            Audio by Web Speech API — 877hand Lab
          </p>
        </div>

      </div>
    </div>
  )
}
