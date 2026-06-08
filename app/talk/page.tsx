"use client"

import { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import HamburgerMenu         from "../components/navigation/HamburgerMenu"
import BananaScene           from "./BananaScene"
import { useTalkController } from "./useTalkController"

function SoundBars() {
  const bars = [0.5, 1.0, 0.65, 1.0, 0.5]
  return (
    <div className="flex items-end gap-[2px] h-3.5" aria-hidden>
      {bars.map((scale, i) => (
        <motion.span
          key={i}
          className="w-[2px] bg-black rounded-full block"
          animate={{ scaleY: [0.2, scale, 0.2] }}
          transition={{ duration: 0.42 + i * 0.06, repeat: Infinity, delay: i * 0.05, ease: "easeInOut" }}
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
    <div className="h-dvh bg-[#FAC800] text-black flex flex-col overflow-hidden select-none">
      <div className="noise-overlay" />

      {/* ── Top bar ── */}
      <header className="relative shrink-0 flex items-center h-14 px-5 md:px-8 z-10">
        <HamburgerMenu />

        {/* Page title — centered */}
        <div className="absolute inset-x-0 flex justify-center items-center pointer-events-none">
          <h1 className="font-mono text-[9px] md:text-[10px] tracking-[0.42em] uppercase opacity-25">
            Banana Talk
          </h1>
        </div>

        {/* Status — right */}
        <div className="ml-auto shrink-0">
          <AnimatePresence>
            {isTalking && (
              <motion.div
                initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <SoundBars />
                <span className="font-mono text-[8px] tracking-[0.22em] uppercase opacity-35">
                  {isRecording ? "Rec" : "On"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── Banana canvas — takes all remaining space ── */}
      <div className="flex-1 min-h-0 w-full">
        <BananaScene
          canvasRef={canvasRef}
          mouthState={mouthState}
          isTalking={isTalking}
          isRecording={isRecording}
        />
      </div>

      {/* ── Bottom controls ── */}
      <div className="shrink-0 px-5 md:px-8 pt-3 pb-5 md:pb-6 z-10">

        {/* Divider */}
        <div className="w-full border-t border-black/10 mb-3" />

        <div className="flex gap-3 items-end max-w-3xl mx-auto">

          {/* Textarea */}
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="font-mono text-[8px] tracking-[0.28em] uppercase opacity-30">
              Script
            </label>
            <textarea
              value={script}
              onChange={e => setScript(e.target.value)}
              disabled={isTalking}
              placeholder="ここに話させたい文章を入力..."
              rows={2}
              style={{ fontSize: "16px" }}
              className="
                w-full bg-transparent border border-black/20 px-3.5 py-2.5
                font-mono leading-relaxed resize-none
                placeholder:opacity-20 focus:outline-none focus:border-black/50
                disabled:opacity-25 disabled:cursor-not-allowed
                transition-colors duration-200
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
                  transition={{ duration: 0.15 }}
                  onClick={() => speak(script)}
                  disabled={!script.trim()}
                  className="
                    font-mono text-[10px] tracking-[0.22em] uppercase
                    border border-black px-5 py-2.5 w-24 md:w-28
                    hover:bg-black hover:text-[#FAC800]
                    active:scale-[0.97] transition-all duration-150
                    disabled:opacity-20 disabled:cursor-not-allowed
                  "
                >
                  TALK ▶
                </motion.button>
              ) : (
                <motion.button
                  key="stop"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={stop}
                  className="
                    font-mono text-[10px] tracking-[0.22em] uppercase
                    border border-black px-5 py-2.5 w-24 md:w-28
                    bg-black text-[#FAC800]
                    hover:bg-black/80 active:scale-[0.97] transition-all duration-150
                  "
                >
                  STOP ■
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {hasRecording && (
                <motion.button
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.18 }}
                  onClick={download}
                  className="
                    font-mono text-[10px] tracking-[0.22em] uppercase
                    border border-black/30 px-5 py-2.5 w-24 md:w-28
                    hover:bg-black hover:text-[#FAC800] hover:border-black
                    active:scale-[0.97] transition-all duration-150
                  "
                >
                  ↓ SAVE
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer note */}
        <p className="font-mono text-[7px] opacity-15 tracking-widest uppercase mt-3 max-w-3xl mx-auto">
          Voice Lab — 877hand · Web Speech API
        </p>
      </div>
    </div>
  )
}
