"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { MouthState } from "./types"

export function useTalkController(
  _canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const [mouthState, setMouthState] = useState<MouthState>("rest")
  const [isTalking,  setIsTalking]  = useState(false)

  const isTalkingRef  = useRef(false)
  const lipTimerRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const phonemeIdxRef = useRef(0)

  const stopLipTimer = useCallback(() => {
    if (lipTimerRef.current) {
      clearTimeout(lipTimerRef.current)
      lipTimerRef.current = undefined
    }
  }, [])

  useEffect(() => () => { stopLipTimer() }, [stopLipTimer])

  const detectLang = (text: string) =>
    /[぀-ゟ゠-ヿ一-龯]/.test(text) ? "ja-JP" : "en-US"

  // 濁音・半濁音も含めた完全な母音マップ（旧版は清音のみで濁音が全部デフォルトに落ちていた）
  const charToMouth = (ch: string): MouthState | "hold" => {
    if ("ー〜…・".includes(ch)) return "hold"   // 長音: 直前の口を維持
    if ("。、！？!?., \n　'\"「」『』（）()".includes(ch)) return "rest"
    if ("んンっッ".includes(ch)) return "closed"  // 撥音・促音: 唇を閉じる
    if ("あかがさざただなはばぱまやらわぁゃゎアカガサザタダナハバパマヤラワァャヮ".includes(ch)) return "open_a"
    if ("いきぎしじちぢにひびぴみりゐィキギシジチヂニヒビピミリヰ".includes(ch)) return "open_i"
    if ("うくぐすずつづぬふぶぷむゆるぅゅヴウクグスズツヅヌフムユルゥュ".includes(ch)) return "open_u"
    if ("えけげせぜてでねへべぺめれゑェケゲセゼテデネヘベペメレヱ".includes(ch)) return "open_e"
    if ("おこごそぞとどのほぼぽもよろをぉょォコゴソゾトドノホボポモヨロヲ".includes(ch)) return "open_o"
    if ("aAáÁ".includes(ch)) return "open_a"
    if ("iIíÍyY".includes(ch)) return "open_i"
    if ("uUúÚwW".includes(ch)) return "open_u"
    if ("eEéÉ".includes(ch)) return "open_e"
    if ("oOóÓ".includes(ch)) return "open_o"
    if ("mMbBpP".includes(ch)) return "closed"
    // 漢字など読み不明の文字: 文字コードから決定論的に母音を選ぶ（常に「あ」固定を回避）
    const vowels: MouthState[] = ["open_a", "open_i", "open_u", "open_e", "open_o"]
    return vowels[ch.codePointAt(0)! % 5]
  }

  // 両唇音（ま・ば・ぱ行）: 唇を閉じてから母音を発音する2段階の口
  const isBilabial = (ch: string) =>
    "まみむめもばびぶべぼぱぴぷぺぽマミムメモバビブベボパピプペポ".includes(ch)

  // 文字種ごとの表示時間（漢字は多くが2モーラなので長め）
  const charDuration = (ch: string): number => {
    if ("。、！？!?.,".includes(ch)) return 220
    if (/[一-龯]/.test(ch)) return 185
    return 115
  }

  const startLipTimer = useCallback((text: string) => {
    stopLipTimer()
    // 各文字 = 1ステップ（charIndex 再同期用に文字位置を保持）。
    // 両唇音は「閉唇→母音」の2フェーズに分割する
    const steps: { mouth: MouthState | "hold"; dur: number; next?: { mouth: MouthState; dur: number } }[] = []
    for (const ch of text) {
      const dur = charDuration(ch)
      if (isBilabial(ch)) {
        const vowel = charToMouth(ch) as MouthState
        steps.push({ mouth: "closed", dur: Math.round(dur * 0.42),
                     next: { mouth: vowel, dur: Math.round(dur * 0.58) } })
      } else {
        steps.push({ mouth: charToMouth(ch), dur })
      }
    }
    if (steps.length === 0) return
    phonemeIdxRef.current = 0

    const tick = () => {
      if (!isTalkingRef.current) return
      if (phonemeIdxRef.current >= steps.length) {
        // タイマーが先に末尾へ到達: 発話が続く限り onboundary の再同期を待つ
        lipTimerRef.current = setTimeout(tick, 150)
        return
      }
      const step = steps[phonemeIdxRef.current]
      if (step.mouth !== "hold") setMouthState(step.mouth)  // hold は直前の口を維持
      phonemeIdxRef.current++
      if (step.next) {
        // 両唇音: 閉唇のあと母音へ開く2フェーズ
        const phase2 = step.next
        lipTimerRef.current = setTimeout(() => {
          if (!isTalkingRef.current) return
          setMouthState(phase2.mouth)
          lipTimerRef.current = setTimeout(tick, phase2.dur)
        }, step.dur)
      } else {
        lipTimerRef.current = setTimeout(tick, step.dur)
      }
    }
    tick()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopLipTimer])

  const speak = useCallback((text: string) => {
    if (!text.trim() || typeof window === "undefined") return

    window.speechSynthesis.cancel()
    stopLipTimer()

    const utter    = new SpeechSynthesisUtterance(text)
    const isJa     = detectLang(text) === "ja-JP"
    utter.lang     = isJa ? "ja-JP" : "en-US"
    utter.pitch    = 1.25   // ほんのり明るい程度（1.9はチップマンク風だった）
    utter.rate     = 1.05   // 落ち着いたテンポ
    utter.volume   = 1.0

    // 声キャラクター選択: 高品質なニューラル系を最優先（プラットフォーム依存なのでフォールバックあり）
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length === 0) return
      if (isJa) {
        utter.voice =
          voices.find(v => v.lang.startsWith("ja") && v.name.includes("Google")) ??  // Chrome: ニューラル系で滑らか
          voices.find(v => v.lang.startsWith("ja") && v.name.includes("Kyoko"))  ??
          voices.find(v => v.lang.startsWith("ja") && v.name.includes("O-Ren"))  ??
          voices.find(v => v.lang.startsWith("ja")) ??
          null
      } else {
        utter.voice =
          voices.find(v => v.lang.startsWith("en") && v.name.includes("Google")) ??
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

    // TTSの実際の発話位置でリップ位置を再同期（タイマーとの速度ドリフトを補正）
    utter.onboundary = (e) => {
      if (typeof e.charIndex === "number" && e.charIndex > 0) {
        phonemeIdxRef.current = e.charIndex
      }
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
