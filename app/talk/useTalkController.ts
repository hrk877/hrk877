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

  const recorderRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const blobRef      = useRef<Blob | null>(null)
  const isTalkingRef = useRef(false)
  const lipTimerRef  = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const phonemeIdxRef = useRef(0)

  const stopLipTimer = useCallback(() => {
    if (lipTimerRef.current) {
      clearInterval(lipTimerRef.current)
      lipTimerRef.current = undefined
    }
  }, [])

  useEffect(() => () => { stopLipTimer() }, [stopLipTimer])

  const detectLang = (text: string) =>
    /[぀-ゟ゠-ヿ一-龯]/.test(text) ? "ja-JP" : "en-US"

  // 文字 → 口の形（日本語5段 + 英語近似 + 句読点でrest）
  const charToMouth = (ch: string): MouthState => {
    if ("。、！？!?., \n　".includes(ch)) return "rest"
    if ("あかさたなはまやらわぁゃゎアカサタナハマヤラワァャヮ".includes(ch)) return "open_a"
    if ("いきしちにひみりゐィキシチニヒミリヰ".includes(ch)) return "open_i"
    if ("うくすつぬふむゆるぅゅウクスツヌフムユルゥュ".includes(ch)) return "open_u"
    if ("えけせてねへめれゑェケセテネヘメレヱ".includes(ch)) return "open_e"
    if ("おこそとのほもよろをぉょォコソトノホモヨロヲォョ".includes(ch)) return "open_o"
    if ("aAáÁ".includes(ch)) return "open_a"
    if ("iIíÍyY".includes(ch)) return "open_i"
    if ("uUúÚ".includes(ch)) return "open_u"
    if ("eEéÉ".includes(ch)) return "open_e"
    if ("oOóÓ".includes(ch)) return "open_o"
    return "open_a"
  }

  // 全文字を口形シーケンスに変換してすぐに開始
  const startLipTimer = useCallback((text: string) => {
    stopLipTimer()

    const phonemes: MouthState[] = []
    for (const ch of text) {
      phonemes.push(charToMouth(ch))
    }
    if (phonemes.length === 0) return

    phonemeIdxRef.current = 0

    // 1文字あたり約130ms（rate=0.92の日本語TTS目安）
    lipTimerRef.current = setInterval(() => {
      if (!isTalkingRef.current || phonemeIdxRef.current >= phonemes.length) {
        stopLipTimer()
        return
      }
      setMouthState(phonemes[phonemeIdxRef.current])
      phonemeIdxRef.current++
    }, 130)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopLipTimer])

  // ── speak ─────────────────────────────────────────────────────────────────
  const speak = useCallback(
    (text: string) => {
      if (!text.trim() || typeof window === "undefined") return

      window.speechSynthesis.cancel()
      stopLipTimer()
      blobRef.current = null
      setHasRecording(false)

      const utter   = new SpeechSynthesisUtterance(text)
      utter.lang    = detectLang(text)
      utter.rate    = 0.92
      utter.pitch   = 1.05

      utter.onstart = () => {
        isTalkingRef.current = true
        setIsTalking(true)
        startLipTimer(text)

        const canvas = canvasRef.current
        if (!canvas) return
        try {
          const stream   = canvas.captureStream(30)
          const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
            ? "video/webm;codecs=vp9"
            : "video/webm"
          const recorder = new MediaRecorder(stream, { mimeType })
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

      const finish = () => {
        isTalkingRef.current = false
        setIsTalking(false)
        stopLipTimer()
        setTimeout(() => setMouthState("rest"), 200)
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
