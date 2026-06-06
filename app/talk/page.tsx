"use client"

import { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import HamburgerMenu from "../components/navigation/HamburgerMenu"
import BananaCanvas   from "./BananaCanvas"
import { useTalkController } from "./useTalkController"

// ── Animated sound-bar indicator ────────────────────────────────────────────
function SoundBars() {
  const bars = [0.6, 1.0, 0.7, 1.0, 0.5, 0.9, 0.6]
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
  const [script, setScript]   = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { mouthState, isTalking, isRecording, hasRecording, speak, stop, download } =
    useTalkController(canvasRef)

  return (
    <div className="min-h-screen bg-[#FAC800] text-black selection:bg-black selection:text-[#FAC800] flex flex-col">
      <div className="noise-overlay" />
      <HamburgerMenu />

      {/* ── Top spacer ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 md:px-10 pt-20 pb-12">

        {/* ── Hero header ────────────────────────────────────────────────── */}
        <header className="w-full max-w-4xl mb-6 md:mb-8">
          <div className="border-b border-black/20 pb-4">
            <h1 className="text-[clamp(2.8rem,10vw,5.5rem)] font-serif font-thin leading-[0.92] tracking-tight">
              BANANA<br className="hidden sm:block" />{" "}TALK
            </h1>
            <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
              <p className="font-mono text-[9px] opacity-25 tracking-[0.24em] uppercase">
                Voice Lab — 877hand
              </p>
              <AnimatePresence>
                {isTalking && (
                  <motion.div
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
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
          </div>
        </header>

        {/* ── Canvas ─────────────────────────────────────────────────────── */}
        <div className="w-full max-w-4xl mb-6 md:mb-8">
          <div className="border border-black/10 overflow-hidden w-full">
            <BananaCanvas
              canvasRef={canvasRef}
              mouthState={mouthState}
              isTalking={isTalking}
              isRecording={isRecording}
            />
          </div>
        </div>

        {/* ── Two-column layout on desktop ────────────────────────────────── */}
        <div className="w-full max-w-4xl flex flex-col md:flex-row gap-5 md:gap-8 items-start">

          {/* ── Script textarea ────────────────────────────────────────────── */}
          <div className="flex-1 w-full">
            <label className="font-mono text-[9px] tracking-[0.24em] uppercase opacity-35 block mb-2">
              Script
            </label>
            <textarea
              ref={textareaRef}
              value={script}
              onChange={e => setScript(e.target.value)}
              disabled={isTalking}
              placeholder="ここにスクリプトを入力..."
              rows={4}
              className="
                w-full bg-transparent border border-black/30 p-4
                font-mono text-sm leading-relaxed resize-none
                placeholder:opacity-20 focus:outline-none focus:border-black
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-colors
              "
            />
          </div>

          {/* ── Controls ───────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 md:pt-[1.6rem] w-full md:w-auto shrink-0">

            {/* Talk / Stop */}
            <AnimatePresence mode="wait">
              {!isTalking ? (
                <motion.button
                  key="talk"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => speak(script)}
                  disabled={!script.trim()}
                  className="
                    w-full md:w-44 font-mono text-[11px] tracking-[0.24em] uppercase
                    border border-black px-6 py-4
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
                    w-full md:w-44 font-mono text-[11px] tracking-[0.24em] uppercase
                    border border-black px-6 py-4
                    bg-black text-[#FAC800]
                    hover:bg-black/80 active:opacity-60 transition-colors
                  "
                >
                  STOP ■
                </motion.button>
              )}
            </AnimatePresence>

            {/* Download */}
            <AnimatePresence>
              {hasRecording && (
                <motion.button
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.20 }}
                  onClick={download}
                  className="
                    w-full md:w-44 font-mono text-[11px] tracking-[0.24em] uppercase
                    border border-black px-6 py-4
                    hover:bg-black hover:text-[#FAC800]
                    active:opacity-60 transition-colors
                  "
                >
                  ↓ DOWNLOAD
                </motion.button>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* ── Footer note ────────────────────────────────────────────────── */}
        <footer className="w-full max-w-4xl mt-10 pt-5 border-t border-black/10">
          <p className="font-mono text-[8px] opacity-18 tracking-widest uppercase">
            Audio by Web Speech API — video export .webm — 877hand Lab
          </p>
        </footer>

      </div>
    </div>
  )
}
