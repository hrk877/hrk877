"use client"

import { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import HamburgerMenu         from "../components/navigation/HamburgerMenu"
import BananaScene           from "./BananaScene"
import { useTalkController } from "./useTalkController"

export default function TalkPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [script, setScript] = useState("")

  const { mouthState, isTalking, speak, stop } = useTalkController(canvasRef)

  return (
    <div className="h-dvh bg-[#FAC800] text-black overflow-hidden relative flex flex-col">
      <div className="noise-overlay" />

      {/* HamburgerMenu — 他のページと同じ絶対配置 */}
      <HamburgerMenu />

      {/* コンテンツ全体 — pt はハンバーガー分の余白 */}
      <div className="flex-1 min-h-0 flex flex-col px-4 md:px-6 pt-20 md:pt-24 pb-4 md:pb-5">

        {/* ── Header — Museum / Journal と同じスタイル（高さ固定・動的要素なし） ── */}
        <header className="flex flex-col md:flex-row justify-between items-start border-b border-black pb-3 md:pb-4 mb-3 md:mb-4 shrink-0">
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
        <div className="flex-1 min-h-0 w-full">
          <BananaScene
            canvasRef={canvasRef}
            mouthState={mouthState}
            isTalking={isTalking}
          />
        </div>

        {/* ── Controls ── */}
        <div className="shrink-0 pt-3 md:pt-4">
          <div className="border-t border-black/20 pb-3" />

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
                  w-full bg-transparent border border-black/30 px-4 py-2.5
                  font-mono leading-relaxed resize-none
                  placeholder:opacity-20 focus:outline-none focus:border-black
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
                      border border-black px-6 py-3 w-28 md:w-36
                      hover:bg-black hover:text-[#FAC800]
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
                      border border-black px-6 py-3 w-28 md:w-36
                      bg-black text-[#FAC800]
                      hover:bg-black/80 active:opacity-60 transition-colors
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
