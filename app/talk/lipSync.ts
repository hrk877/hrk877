import type { MouthState } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// テキスト → 口形タイムライン変換（純粋ロジック）
//
// 2系統のタイムライン生成を持つ:
//   1) buildTimelineFromTokens — kuromojiの発音（カタカナ+長音ー）からモーラ単位で生成。
//      漢字の読み・助詞の発音変化（は→ワ）・長音（今日→キョー）・無声化（です→デs）まで
//      反映する高精度パス。/api/talk/phonemize の結果を使う。
//   2) buildTimeline — 文字ベースの推定。APIが使えない時のフォールバック。
//      数字は読み（877→ハッピャクナナジュウナナ）に展開してから処理する。
//
// 再生側（useTalkController）は経過時間ベースで口形を引き、onboundaryのcharIndexで
// 再同期、発話ごとの実測時間でタイムライン速度を自動キャリブレーションする。
// ─────────────────────────────────────────────────────────────────────────────

export type LipStep = {
  mouth: MouthState | "hold"   // hold = 直前の口形を維持
  t: number                    // タイムライン先頭からの開始時刻 ms
  dur: number                  // 持続 ms
  charIndex: number            // 元テキスト内の UTF-16 位置（onboundary 再同期用）
}

// kuromoji トークン（/api/talk/phonemize のレスポンス）
export type PhonToken = {
  s: number        // 元テキスト内の UTF-16 開始位置
  surface: string  // 表層形
  pron: string     // 発音（カタカナ。長音はー。未知語は空文字）
}

// 基準時間（scale=1のとき）。日本語TTSはおよそ7〜8モーラ/秒
const MORA_MS   = 130   // 発音ベースの1モーラ（読みが正確なので一定値でよい）
const CHAR_MS   = 115   // 文字ベース推定の仮名1文字
const KANJI_MS  = 185   // 文字ベース推定の漢字（平均約1.6モーラ）
const COMMA_MS  = 260   // 読点
const PERIOD_MS = 380   // 句点・文末
const GAP_MS    = 70    // トークン間の空白ぶんの小休止

// 改行ごとの読み上げセグメント分割（controller と phonemize 共用）
export const splitSegments = (text: string): string[] =>
  text.split(/\n+/).map(s => s.trim()).filter(Boolean)

// ── 仮名 → 口形テーブル ──────────────────────────────────────────────────────

// 拗音・小書き母音 → 合体先の母音口形（きゃ＝1モーラで「あ」の口）
const SMALL_VOWEL: Record<string, MouthState> = {
  "ゃ": "open_a", "ャ": "open_a", "ぁ": "open_a", "ァ": "open_a", "ゎ": "open_a", "ヮ": "open_a",
  "ゅ": "open_u", "ュ": "open_u", "ぅ": "open_u", "ゥ": "open_u",
  "ょ": "open_o", "ョ": "open_o", "ぉ": "open_o", "ォ": "open_o",
  "ぃ": "open_i", "ィ": "open_i",
  "ぇ": "open_e", "ェ": "open_e",
}

// 両唇音（ま・ば・ぱ行）: 唇を一度閉じてから母音へ開く2段階
export const isBilabial = (ch: string) =>
  "まみむめもばびぶべぼぱぴぷぺぽマミムメモバビブベボパピプペポ".includes(ch)

const isKanji = (ch: string) => /[一-龯々]/.test(ch)

const VOWEL_ROWS: [string, MouthState][] = [
  ["あかがさざただなはばぱまやらわアカガサザタダナハバパマヤラワ", "open_a"],
  ["いきぎしじちぢにひびぴみりゐイキギシジチヂニヒビピミリヰ",     "open_i"],
  ["うくぐすずつづぬふぶぷむゆるゔウクグスズツヅヌフブプムユルヴ", "open_u"],
  ["えけげせぜてでねへべぺめれゑエケゲセゼテデネヘベペメレヱ",     "open_e"],
  ["おこごそぞとどのほぼぽもよろをオコゴソゾトドノホボポモヨロヲ", "open_o"],
]

const vowelOf = (ch: string): MouthState | null => {
  for (const [row, mouth] of VOWEL_ROWS) if (row.includes(ch)) return mouth
  return null
}

// 無声子音で始まるモーラ（か・さ・た・は・ぱ行）。い/う段の無声化判定に使う
const VOICELESS = "カキクケコサシスセソタチツテトハヒフヘホパピプペポ"

// ひらがな → カタカナ（ぁ U+3041 〜 ゖ U+3096 を +0x60）
const toKatakana = (s: string): string =>
  s.replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60))

export function charToMouth(ch: string): MouthState | "hold" {
  const v = vowelOf(ch)
  if (v) return v
  if ("aAáÁ".includes(ch)) return "open_a"
  if ("iIíÍyY".includes(ch)) return "open_i"
  if ("uUúÚwW".includes(ch)) return "open_u"
  if ("eEéÉ".includes(ch)) return "open_e"
  if ("oOóÓ".includes(ch)) return "open_o"
  if ("mMbBpP".includes(ch)) return "closed"
  if (/[a-zA-Z]/.test(ch)) return "hold"   // 英子音: 直前の口形のまま流す
  // 漢字など読み不明の文字: 文字コードから決定論的に母音を選ぶ
  const vowels: MouthState[] = ["open_a", "open_i", "open_u", "open_e", "open_o"]
  return vowels[ch.codePointAt(0)! % 5]
}

// ── 数字 → 読み（カタカナ） ──────────────────────────────────────────────────
// 877 → ハッピャクナナジュウナナ、2026 → ニセンニジュウロク
const DIGIT_KANA = ["", "イチ", "ニ", "サン", "ヨン", "ゴ", "ロク", "ナナ", "ハチ", "キュウ"]
const DIGIT_SOLO = ["ゼロ", "イチ", "ニ", "サン", "ヨン", "ゴ", "ロク", "ナナ", "ハチ", "キュウ"]

const fourDigitToKana = (n: number): string => {
  let out = ""
  const th = Math.floor(n / 1000) % 10
  const hu = Math.floor(n / 100) % 10
  const te = Math.floor(n / 10) % 10
  const on = n % 10
  if (th) out += th === 1 ? "セン" : th === 3 ? "サンゼン" : th === 8 ? "ハッセン" : DIGIT_KANA[th] + "セン"
  if (hu) out += hu === 1 ? "ヒャク" : hu === 3 ? "サンビャク" : hu === 6 ? "ロッピャク" : hu === 8 ? "ハッピャク" : DIGIT_KANA[hu] + "ヒャク"
  if (te) out += te === 1 ? "ジュウ" : DIGIT_KANA[te] + "ジュウ"
  if (on) out += DIGIT_KANA[on]
  return out
}

export function numberToKana(numStr: string): string {
  // 8桁超や先頭0の桁読み（電話番号等）は1桁ずつ読む
  if (numStr.length > 8 || (numStr.length > 1 && numStr.startsWith("0"))) {
    return [...numStr].map(d => DIGIT_SOLO[Number(d)] ?? "").join("")
  }
  const n = parseInt(numStr, 10)
  if (!Number.isFinite(n)) return ""
  if (n === 0) return "ゼロ"
  const man  = Math.floor(n / 10000)
  const rest = n % 10000
  let out = ""
  if (man) out += fourDigitToKana(man) + "マン"
  if (rest) out += fourDigitToKana(rest)
  return out
}

// ── 発音（カタカナ） → モーラ列 ───────────────────────────────────────────────
// rel は1モーラを1.0とした相対時間。無声化・促音はここで短くする
export type MoraStep = { mouth: MouthState | "hold"; rel: number }

export function parseMoras(pronIn: string): MoraStep[] {
  const pron = toKatakana(pronIn)
  type M = { base: string | null; mouth: MouthState | "hold"; rel: number }
  const moras: M[] = []
  const chars = [...pron]

  for (let k = 0; k < chars.length; k++) {
    const ch = chars[k]
    if (ch === "ッ") { moras.push({ base: null, mouth: "hold",   rel: 0.8 }); continue }
    if (ch === "ー" || ch === "〜") { moras.push({ base: null, mouth: "hold", rel: 1.0 }); continue }
    if (ch === "ン") { moras.push({ base: null, mouth: "closed", rel: 1.0 }); continue }

    // 拗音・小書き母音は直前の子音と合体して1モーラ（キャ→「あ」の口）
    const small = chars[k + 1] ? SMALL_VOWEL[chars[k + 1]] : undefined
    let mouth: MouthState | "hold" | null = small ?? vowelOf(ch)
    if (small) k++
    if (!mouth) {
      if (SMALL_VOWEL[ch]) mouth = SMALL_VOWEL[ch]   // 単独で現れた小書き仮名
      else continue                                   // 発音に寄与しない文字は無視
    }
    moras.push({ base: ch, mouth, rel: 1.0 })
  }

  // 無声化: 無声子音モーラ(い/う段)が「次も無声子音」or「語末のス・シ・ク・チ・ツ」のとき短く
  for (let i = 0; i < moras.length; i++) {
    const m = moras[i]
    if (!m.base || !VOICELESS.includes(m.base)) continue
    if (m.mouth !== "open_i" && m.mouth !== "open_u") continue
    const next = moras[i + 1]
    if (!next && "スシクチツ".includes(m.base)) m.rel *= 0.55          // です・ます等の語末
    else if (next?.base && VOICELESS.includes(next.base)) m.rel *= 0.6 // した・きく等
  }

  // 両唇音は「閉唇→母音」の2フェーズに展開
  const out: MoraStep[] = []
  for (const m of moras) {
    if (m.base && isBilabial(m.base) && m.mouth !== "hold") {
      out.push({ mouth: "closed", rel: m.rel * 0.42 })
      out.push({ mouth: m.mouth,  rel: m.rel * 0.58 })
    } else {
      out.push({ mouth: m.mouth, rel: m.rel })
    }
  }
  return out
}

// ── 高精度パス: kuromojiトークン → タイムライン ──────────────────────────────
export function buildTimelineFromTokens(tokens: PhonToken[], scale = 1): { steps: LipStep[]; total: number } {
  const steps: LipStep[] = []
  let t = 0
  const push = (mouth: MouthState | "hold", dur: number, charIndex: number) => {
    const d = Math.max(1, Math.round(dur * scale))
    steps.push({ mouth, t, dur: d, charIndex })
    t += d
  }

  let prevEnd: number | null = null
  for (const tok of tokens) {
    if (!tok || typeof tok.s !== "number" || typeof tok.surface !== "string") continue
    // トークン間の空白（スペース等）は小休止
    if (prevEnd !== null && tok.s > prevEnd) push("rest", GAP_MS, prevEnd)
    prevEnd = tok.s + tok.surface.length

    const surf = tok.surface
    if (/^[。．！？!?‼⁉]+$/.test(surf)) { push("rest", PERIOD_MS, tok.s); continue }
    if (/^[、，,]+$/.test(surf))         { push("rest", COMMA_MS,  tok.s); continue }
    if (/^[\s…・·「」『』（）()［］\[\]"'’”〝〟]+$/.test(surf)) { push("rest", GAP_MS, tok.s); continue }

    let pron = tok.pron
    if (!pron || pron === "*") {
      if (/^[ぁ-ゖァ-ヶーっッ〜]+$/.test(surf)) {
        pron = toKatakana(surf)               // ひらがな未知語: 表層＝読み
      } else if (/^\d+$/.test(surf)) {
        pron = numberToKana(surf)             // 数字: 読みに展開
      } else {
        // 英字等: 文字ベースで流す
        for (const ch of surf) push(charToMouth(ch), CHAR_MS * 0.85, tok.s)
        continue
      }
    }
    for (const m of parseMoras(pron)) push(m.mouth, MORA_MS * m.rel, tok.s)
  }
  return { steps, total: t }
}

// ── フォールバックパス: 文字ベース推定 ────────────────────────────────────────
export function buildTimeline(text: string, scale = 1): { steps: LipStep[]; total: number } {
  const steps: LipStep[] = []
  let t = 0
  const push = (mouth: MouthState | "hold", dur: number, charIndex: number) => {
    const d = Math.max(1, Math.round(dur * scale))
    steps.push({ mouth, t, dur: d, charIndex })
    t += d
  }

  const chars = [...text]
  let idx = 0   // UTF-16 位置（charsはコードポイント単位なのでサロゲートでずれない）
  for (let k = 0; k < chars.length; k++) {
    const ch = chars[k]
    const charIndex = idx
    idx += ch.length

    // 数字の連続は読みへ展開してモーラで流す（877→ハッピャクナナジュウナナ）
    if (/\d/.test(ch)) {
      let run = ch
      while (k + 1 < chars.length && /\d/.test(chars[k + 1])) { k++; run += chars[k]; idx += chars[k].length }
      for (const m of parseMoras(numberToKana(run))) push(m.mouth, CHAR_MS * m.rel, charIndex)
      continue
    }

    // 文頭などに単独で現れた小書き仮名: そのまま1モーラ
    if (SMALL_VOWEL[ch]) { push(SMALL_VOWEL[ch], CHAR_MS, charIndex); continue }

    if ("。！？!?．".includes(ch)) { push("rest", PERIOD_MS, charIndex); continue }
    if ("、，,".includes(ch))      { push("rest", COMMA_MS,  charIndex); continue }
    if (" 　\n\t…・「」『』（）()\"'’”".includes(ch)) { push("rest", CHAR_MS, charIndex); continue }
    if ("ー〜".includes(ch)) { push("hold", CHAR_MS,        charIndex); continue }   // 長音: 口形を保って伸ばす
    if ("っッ".includes(ch)) { push("hold", CHAR_MS * 0.8,  charIndex); continue }   // 促音: 口形を保って詰める
    if ("んン".includes(ch)) { push("closed", CHAR_MS,      charIndex); continue }

    // 直後の拗音・小書き母音を取り込んで1モーラに合体（きゃ→「あ」の口）
    let vowelOverride: MouthState | undefined
    const next = chars[k + 1]
    if (next && SMALL_VOWEL[next]) {
      vowelOverride = SMALL_VOWEL[next]
      k++
      idx += next.length
    }

    const base  = isKanji(ch) ? KANJI_MS : CHAR_MS
    const mouth = vowelOverride ?? charToMouth(ch)
    if (isBilabial(ch)) {
      const vowel = (mouth === "hold" ? "open_a" : mouth) as MouthState
      push("closed", base * 0.42, charIndex)
      push(vowel,    base * 0.58, charIndex)
    } else {
      push(mouth, base, charIndex)
    }
  }
  return { steps, total: t }
}
