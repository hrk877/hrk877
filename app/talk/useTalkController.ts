"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { MouthState } from "./types"

export function useTalkController(
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const [mouthState,    setMouthState]    = useState<MouthState>("rest")
  const [isTalking,     setIsTalking]     = useState(false)
  const [isRecording,   setIsRecording]   = useState(false)
  const [hasRecording,  setHasRecording]  = useState(false)

  const recorderRef     = useRef<MediaRecorder | null>(null)
  const chunksRef       = useRef<Blob[]>([])
  const blobRef         = useRef<Blob | null>(null)
  const toggleRef       = useRef<"open_mid" | "open_full">("open_mid")
  const restTimer       = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isTalkingRef    = useRef(false)

  // ── フォールバックタイマー: onboundaryが発火しないブラウザ用 ──────────────
  // 170ms間隔でopen_mid/open_fullをトグル → 確実にパクパクする
  const lipTimerRef     = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const boundaryFiredRef = useRef(false)  // onboundaryが動いているか監視

  const startLipTimer = useCallback(() => {
    stopLipTimer()
    boundaryFiredRef.current = false
    // 300ms後にまだonboundaryが来てなければフォールバック開始
    restTimer.current = setTimeout(() => {
      if (!boundaryFiredRef.current && isTalkingRef.current) {
        lipTimerRef.current = setInterval(() => {
          toggleRef.current = toggleRef.current === "open_mid" ? "open_full" : "open_mid"
          setMouthState(toggleRef.current)
        }, 170)
      }
    }, 300)
  }, [])

  const stopLipTimer = useCallback(() => {
    if (lipTimerRef.current) {
      clearInterval(lipTimerRef.current)
      lipTimerRef.current = undefined
    }
  }, [])

  // cleanup on unmount
  useEffect(() => () => { stopLipTimer() }, [stopLipTimer])

  // ── 言語自動検出 ──────────────────────────────────────────────────────────
  const detectLang = (text: string) =>
    /[぀-ゟ゠-ヿ一-龯]/.test(text) ? "ja-JP" : "en-US"

  // ── speak ─────────────────────────────────────────────────────────────────
  const speak = useCallback(
    (text: string) => {
      if (!text.trim() || typeof window === "undefined") return

      window.speechSynthesis.cancel()
      clearTimeout(restTimer.current)
      stopLipTimer()
      blobRef.current = null
      setHasRecording(false)

      const utter       = new SpeechSynthesisUtterance(text)
      utter.lang        = detectLang(text)
      utter.rate        = 0.92
      utter.pitch       = 1.05
      toggleRef.current = "open_mid"

      // ── onstart ─────────────────────────────────────────────────────────
      utter.onstart = () => {
        isTalkingRef.current = true
        setIsTalking(true)
        setMouthState("open_mid")
        startLipTimer()   // フォールバックタイマー待機開始

        const canvas = canvasRef.current
        if (!canvas) return
        try {
          const stream    = canvas.captureStream(30)
          const mimeType  = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
            ? "video/webm;codecs=vp9"
            : "video/webm"
          const recorder  = new MediaRecorder(stream, { mimeType })
          chunksRef.current = []
          recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
          recorder.onstop = () => {
            blobRef.current = new Blob(chunksRef.current, { type: "video/webm" })
            setHasRecording(true)
            setIsRecording(false)
          }
          recorder.start(100)
          recorderRef.current = recorder
          setIsRecording(true)
        } catch {
          setIsRecording(false)
        }
      }

      // ── onboundary: 単語ごとにパクパク ─────────────────────────────────
      utter.onboundary = (e) => {
        if (e.name !== "word") return
        boundaryFiredRef.current = true   // フォールバック不要と判断
        stopLipTimer()
        toggleRef.current = toggleRef.current === "open_mid" ? "open_full" : "open_mid"
        setMouthState(toggleRef.current)
      }

      // ── finish ──────────────────────────────────────────────────────────
      const finish = () => {
        isTalkingRef.current = false
        setIsTalking(false)
        stopLipTimer()
        restTimer.current = setTimeout(() => setMouthState("rest"), 350)
        if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop()
      }

      utter.onend   = finish
      utter.onerror = finish

      window.speechSynthesis.speak(utter)
    },
    [canvasRef, startLipTimer, stopLipTimer]
  )

  // ── stop ──────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    isTalkingRef.current = false
    setIsTalking(false)
    stopLipTimer()
    setMouthState("rest")
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop()
  }, [stopLipTimer])

  // ── download ──────────────────────────────────────────────────────────────
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

  return { mouthState, isTalking, isRecording, hasRecording, speak, stop, download }
}
