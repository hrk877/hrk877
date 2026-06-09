"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { MouthState } from "./types"

export function useTalkController(
  _canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const [mouthState, setMouthState] = useState<MouthState>("rest")
  const [isTalking,  setIsTalking]  = useState(false)

  const isTalkingRef  = useRef(false)
  const lipTimerRef   = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
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

  const startLipTimer = useCallback((text: string) => {
    stopLipTimer()
    const phonemes: MouthState[] = []
    for (const ch of text) phonemes.push(charToMouth(ch))
    if (phonemes.length === 0) return
    phonemeIdxRef.current = 0
    lipTimerRef.current = setInterval(() => {
      if (!isTalkingRef.current || phonemeIdxRef.current >= phonemes.length) {
        stopLipTimer()
        return
      }
      setMouthState(phonemes[phonemeIdxRef.current])
      phonemeIdxRef.current++
    }, 115)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopLipTimer])

  const speak = useCallback((text: string) => {
    if (!text.trim() || typeof window === "undefined") return

    window.speechSynthesis.cancel()
    stopLipTimer()

    const utter    = new SpeechSynthesisUtterance(text)
    const isJa     = detectLang(text) === "ja-JP"
    utter.lang     = isJa ? "ja-JP" : "en-US"
    utter.pitch    = 1.9    // 高め → キャラクター感のある面白い声
    utter.rate     = 1.15   // 少し速め → 元気なバナナ
    utter.volume   = 1.0

    // 声キャラクター選択（プラットフォーム依存なのでフォールバックあり）
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length === 0) return
      if (isJa) {
        utter.voice =
          voices.find(v => v.lang.startsWith("ja") && v.name.includes("Kyoko"))  ??
          voices.find(v => v.lang.startsWith("ja") && v.name.includes("Otoya"))   ??
          voices.find(v => v.lang.startsWith("ja")) ??
          null
      } else {
        utter.voice =
          voices.find(v => v.lang.startsWith("en") && v.name.includes("Samantha")) ??
          voices.find(v => v.lang.startsWith("en") && v.name.includes("Victoria")) ??
          voices.find(v => v.lang.startsWith("en")) ??
          null
      }
    }

    if (window.speechSynthesis.getVoices().length > 0) {
      pickVoice()
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", pickVoice, { once: true })
    }

    utter.onstart = () => {
      isTalkingRef.current = true
      setIsTalking(true)
      startLipTimer(text)
    }

    const finish = () => {
      isTalkingRef.current = false
      setIsTalking(false)
      stopLipTimer()
      setTimeout(() => setMouthState("rest"), 180)
    }

    utter.onend   = finish
    utter.onerror = finish

    window.speechSynthesis.speak(utter)
  }, [startLipTimer, stopLipTimer])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    isTalkingRef.current = false
    setIsTalking(false)
    stopLipTimer()
    setMouthState("rest")
  }, [stopLipTimer])

  return { mouthState, isTalking, speak, stop }
}
