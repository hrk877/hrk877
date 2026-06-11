"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { MouthState } from "./types"
import { buildTimeline, type LipStep } from "./lipSync"

// 改行で区切られた行の間に置く間（ま）
const NEWLINE_PAUSE_MS = 500

export function useTalkController(
  _canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const [mouthState, setMouthState] = useState<MouthState>("rest")
  const [isTalking,  setIsTalking]  = useState(false)

  const isTalkingRef  = useRef(false)
  const rafRef        = useRef(0)
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── 口形タイムライン再生状態 ──────────────────────────────────────────
  const stepsRef     = useRef<LipStep[]>([])
  const stepPtrRef   = useRef(0)        // 次に適用するステップ
  const startedAtRef = useRef(0)        // 発話開始時刻 performance.now()
  const offsetMsRef  = useRef(0)        // onboundary 再同期によるタイムラインずらし
  const estTotalRef  = useRef(0)        // 推定発話時間（キャリブレーション用）
  // 実測キャリブレーション: 前回までの「実際の発話時間 ÷ 推定時間」の移動平均。
  // 端末・選ばれた声ごとに違うTTS速度へタイムラインを自動で合わせ込む
  const calibRef = useRef(1)

  const stopLipLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
  }, [])

  const clearPause = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current)
      pauseTimerRef.current = undefined
    }
  }, [])

  useEffect(() => () => {
    stopLipLoop()
    clearPause()
    if (typeof window !== "undefined") window.speechSynthesis.cancel()
  }, [stopLipLoop, clearPause])

  const startLipLoop = useCallback((text: string) => {
    stopLipLoop()
    const { steps, total } = buildTimeline(text, calibRef.current)
    stepsRef.current     = steps
    estTotalRef.current  = total
    stepPtrRef.current   = 0
    startedAtRef.current = performance.now()
    offsetMsRef.current  = 0

    const loop = () => {
      if (!isTalkingRef.current) return
      const elapsed = performance.now() - startedAtRef.current + offsetMsRef.current
      const all = stepsRef.current
      // 経過時間が開始時刻を過ぎたステップを順に適用（最後の書き込みが勝つ）
      while (stepPtrRef.current < all.length && elapsed >= all[stepPtrRef.current].t) {
        const step = all[stepPtrRef.current]
        if (step.mouth !== "hold") setMouthState(step.mouth)
        stepPtrRef.current++
      }
      // 末尾を過ぎてもTTSが続いていれば最後の口形を保持して onend を待つ
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [stopLipLoop])

  // TTSの実際の発話位置（charIndex）へタイムラインをジャンプさせる
  const resyncToChar = useCallback((charIndex: number) => {
    const all = stepsRef.current
    if (all.length === 0) return
    let i = all.findIndex(s => s.charIndex >= charIndex)
    if (i < 0) i = all.length - 1
    offsetMsRef.current = all[i].t - (performance.now() - startedAtRef.current)
    stepPtrRef.current  = i
  }, [])

  const detectLang = (text: string) =>
    /[぀-ゟ゠-ヿ一-龯]/.test(text) ? "ja-JP" : "en-US"

  // Apple純正のキャラクターボイス（macOS/iOS）。普通のKyokoより
  // 個性的でオシャレな声。端末によっては未ダウンロードなのでフォールバックあり
  const configureUtterance = (utter: SpeechSynthesisUtterance, isJa: boolean) => {
    const JA_CHARACTER = ["Flo", "Rocko", "Sandy", "Shelley", "Eddy", "Reed", "Grandpa", "Grandma"]
    const EN_CHARACTER = ["Flo", "Rocko", "Sandy", "Shelley", "Eddy", "Reed", "Superstar", "Bubbles"]

    let usedCharacter = false
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length === 0) return
      const pool  = voices.filter(v => v.lang.startsWith(isJa ? "ja" : "en"))
      const names = isJa ? JA_CHARACTER : EN_CHARACTER
      for (const n of names) {
        const v = pool.find(p => p.name.includes(n))
        if (v) { utter.voice = v; usedCharacter = true; return }
      }
      utter.voice =
        pool.find(v => v.name.includes("Google")) ??
        pool.find(v => v.name.includes(isJa ? "Kyoko" : "Samantha")) ??
        pool[0] ?? null
    }
    // 声に合わせてピッチ・テンポを調整（キャラ声は素材を活かして軽く整える）
    const applyProsody = () => {
      if (usedCharacter) { utter.pitch = 0.95; utter.rate = 0.98 }
      else               { utter.pitch = 1.3;  utter.rate = 1.05 }
    }

    if (window.speechSynthesis.getVoices().length > 0) {
      pickVoice(); applyProsody()
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", () => {
        pickVoice(); applyProsody()
      }, { once: true })
      applyProsody()
    }
  }

  const speak = useCallback((text: string) => {
    if (!text.trim() || typeof window === "undefined") return

    window.speechSynthesis.cancel()
    clearPause()
    stopLipLoop()

    // 改行ごとにセグメント化し、各行の間に NEWLINE_PAUSE_MS の間を置いて読む
    const segments = text.split(/\n+/).map(s => s.trim()).filter(Boolean)
    if (segments.length === 0) return

    isTalkingRef.current = true
    setIsTalking(true)

    const speakSegment = (i: number) => {
      const seg   = segments[i]
      const utter = new SpeechSynthesisUtterance(seg)
      const isJa  = detectLang(seg) === "ja-JP"
      utter.lang   = isJa ? "ja-JP" : "en-US"
      utter.volume = 1.0
      configureUtterance(utter, isJa)

      let spokeAt = 0
      utter.onstart = () => {
        if (!isTalkingRef.current) return
        spokeAt = performance.now()
        startLipLoop(seg)
      }

      // TTSの実際の発話位置でリップ位置を再同期（タイマーとの速度ドリフトを補正）
      utter.onboundary = (e) => {
        if (typeof e.charIndex === "number" && e.charIndex > 0) resyncToChar(e.charIndex)
      }

      let finished = false
      const finishSegment = () => {
        if (finished) return
        finished = true
        stopLipLoop()
        setMouthState("rest")

        // 実測時間でキャリブレーション更新（短文・異常値はノイズなので除外）
        const est = estTotalRef.current
        if (spokeAt > 0 && est > 400) {
          const actual = performance.now() - spokeAt
          if (actual > 400) {
            const ideal = (actual / est) * calibRef.current
            const next  = calibRef.current * 0.5 + ideal * 0.5
            calibRef.current = Math.min(2.5, Math.max(0.5, next))
          }
        }

        if (!isTalkingRef.current) return   // stop() 済み
        if (i + 1 < segments.length) {
          pauseTimerRef.current = setTimeout(() => {
            if (isTalkingRef.current) speakSegment(i + 1)
          }, NEWLINE_PAUSE_MS)
        } else {
          isTalkingRef.current = false
          setIsTalking(false)
        }
      }
      utter.onend   = finishSegment
      utter.onerror = finishSegment

      window.speechSynthesis.speak(utter)
    }

    speakSegment(0)
  }, [clearPause, stopLipLoop, startLipLoop, resyncToChar])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    isTalkingRef.current = false
    setIsTalking(false)
    clearPause()
    stopLipLoop()
    setMouthState("rest")
  }, [clearPause, stopLipLoop])

  return { mouthState, isTalking, speak, stop }
}
