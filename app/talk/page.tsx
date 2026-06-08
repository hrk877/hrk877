"use client"

import { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import HamburgerMenu         from "../components/navigation/HamburgerMenu"
import BananaScene           from "./BananaScene"
import { useTalkController } from "./useTalkController"

function SoundBars() {
  const bars = [0.5, 1.0, 0.65, 1.0, 0.5]
  return (
    <div className="flex items-end gap-[3px] h-5" aria-hidden>
      {bars.map((scale, i) => (
        <motion.span
          key={i}
          className="w-[3px] bg-black rounded-full block"
          animate={{ scaleY: [0.2, scale, 0.2] }}
          transition={{ duration: 0.45 + i * 0.06, repeat: Infinity, delay: i * 0.055, ease: "easeInOut" }}
          style={{ originY: 1 }}
        />
      ))}
    </div>
  )
}

export default function TalkPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [script, setScript] = useState("")

  const { mouthState, isTalking, isRecording, hasRecording, speak, stop, download } =
    useTalkController(canvasRef)

  return (
    <div className="h-dvh bg-[#FAC800] text-black overflow-hidden relative flex flex-col">
      <div className="noise-overlay" />

      {/* HamburgerMenu — 他のページと同じ絶対配置 */}
      <HamburgerMenu />

      {/* コンテンツ全体 — pt はハンバーガー分の余白 */}
      <div className="flex-1 min-h-0 flex flex-col px-4 md:px-6 pt-20 md:pt-24 pb-4 md:pb-5">

        {/* ── Header — Museum / Journal と同じスタイル ── */}
        <header className="flex flex-col md:flex-row justify-between items-start border-b border-black pb-3 md:pb-4 mb-3 md:mb-4 shrink-0">
          <h1 className="text-[clamp(2.8rem,10vw,5.5rem)] font-serif font-thin leading-[0.92] tracking-tight">
            BANANA<br className="hidden sm:block" />{" "}TALK
          </h1>
          <div className="text-left mt-3 md:mt-0 flex flex-col items-start gap-2">
            <p className="font-mono text-lg md:text-xs opacity-60">
              Voice Lab<br />
              877hand
            </p>
            <AnimatePresence>
              {isTalking && (
                <motion.div
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                  className="flex items-center gap-2"
                >
                  <SoundBars />
                  <span className="font-mono text-[9px] tracking-[0.22em] uppercase opacity-40">
                    {isRecording ? "Recording" : "Speaking"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* ── Banana — 残り全スペース ── */}
        <div className="flex-1 min-h-0 w-full">
          <BananaScene
            canvasRef={canvasRef}
            mouthState={mouthState}
            isTalking={isTalking}
            isRecording={isRecording}
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

            {/* Buttons */}
            <div className="flex flex-col gap-2 shrink-0 pb-px">
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

              <AnimatePresence>
                {hasRecording && (
                  <motion.button
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.20 }}
                    onClick={download}
                    className="
                      font-mono text-[11px] tracking-[0.24em] uppercase
                      border border-black/40 px-6 py-3 w-28 md:w-36
                      hover:bg-black hover:text-[#FAC800] hover:border-black
                      active:opacity-60 transition-colors
                    "
                  >
                    ↓ SAVE
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="font-mono text-[8px] opacity-20 tracking-widest uppercase mt-2">
            Audio by Web Speech API — Video export .webm — 877hand Lab
          </p>
        </div>

      </div>
    </div>
  )
}
