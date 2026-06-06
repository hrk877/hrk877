"use client"

import { useState, useRef, useCallback } from "react"
import type { MouthState } from "./types"

export function useTalkController(
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const [mouthState,    setMouthState]    = useState<MouthState>("rest")
  const [isTalking,     setIsTalking]     = useState(false)
  const [isRecording,   setIsRecording]   = useState(false)
  const [hasRecording,  setHasRecording]  = useState(false)

  const recorderRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const blobRef      = useRef<Blob | null>(null)
  const toggleRef    = useRef<"open_mid" | "open_full">("open_mid")
  const restTimer    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── Detect language for natural-sounding TTS ──────────────────────────
  const detectLang = (text: string) =>
    /[぀-ゟ゠-ヿ一-龯]/.test(text) ? "ja-JP" : "en-US"

  // ── speak ─────────────────────────────────────────────────────────────
  const speak = useCallback(
    (text: string) => {
      if (!text.trim() || typeof window === "undefined") return

      window.speechSynthesis.cancel()
      clearTimeout(restTimer.current)
      blobRef.current = null
      setHasRecording(false)

      const utter      = new SpeechSynthesisUtterance(text)
      utter.lang       = detectLang(text)
      utter.rate       = 0.92
      utter.pitch      = 1.05
      toggleRef.current = "open_mid"

      // ── onstart: begin talking + start recording ─────────────────────
      utter.onstart = () => {
        setIsTalking(true)
        setMouthState("open_mid")

        const canvas = canvasRef.current
        if (!canvas) return

        try {
          const stream   = canvas.captureStream(30)
          const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
            ? "video/webm;codecs=vp9"
            : "video/webm"

          const recorder  = new MediaRecorder(stream, { mimeType })
          chunksRef.current = []

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data)
          }

          recorder.onstop = () => {
            blobRef.current = new Blob(chunksRef.current, { type: "video/webm" })
            setHasRecording(true)
            setIsRecording(false)
          }

          recorder.start(100)
          recorderRef.current = recorder
          setIsRecording(true)
        } catch {
          // captureStream not supported (e.g. some mobile Safari) — just skip recording
          setIsRecording(false)
        }
      }

      // ── onboundary: toggle mouth on each spoken word ──────────────────
      utter.onboundary = (e) => {
        if (e.name === "word") {
          toggleRef.current =
            toggleRef.current === "open_mid" ? "open_full" : "open_mid"
          setMouthState(toggleRef.current)
        }
      }

      // ── finish (shared by onend + onerror) ────────────────────────────
      const finish = () => {
        setIsTalking(false)
        restTimer.current = setTimeout(() => setMouthState("rest"), 360)
        if (recorderRef.current?.state !== "inactive") {
          recorderRef.current?.stop()
        }
      }

      utter.onend   = finish
      utter.onerror = finish

      window.speechSynthesis.speak(utter)
    },
    [canvasRef]
  )

  // ── stop ──────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setIsTalking(false)
    setMouthState("rest")
    if (recorderRef.current?.state !== "inactive") {
      recorderRef.current?.stop()
    }
  }, [])

  // ── download ──────────────────────────────────────────────────────────
  const download = useCallback(() => {
    if (!blobRef.current) return
    const url  = URL.createObjectURL(blobRef.current)
    const a    = document.createElement("a")
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    a.href     = url
    a.download = `banana-talk-${date}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  return {
    mouthState,
    isTalking,
    isRecording,
    hasRecording,
    speak,
    stop,
    download,
  }
}
