import type { MouthState } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// テキスト → 口形タイムライン変換（純粋ロジック）
//
// 旧実装は setTimeout チェーンで1文字=固定115msだったため、
//   ・拗音（きゃ・しょ等）が2文字=2モーラ扱いになり口が余計に動く
//   ・促音っが「閉唇」になり不自然（実際は次の音の口形のまま詰まる）
//   ・TTSの実速度と合わずに後半ほどズレる
// という問題があった。ここでは全文を先にタイムライン（開始時刻+持続時間の列）へ
// コンパイルし、再生側が経過時間ベースで口形を引く。速度のズレは
// useTalkController 側の実測キャリブレーション（scale引数）で吸収する。
// ─────────────────────────────────────────────────────────────────────────────

export type LipStep = {
  mouth: MouthState | "hold"   // hold = 直前の口形を維持
  t: number                    // タイムライン先頭からの開始時刻 ms
  dur: number                  // 持続 ms
  charIndex: number            // 元テキスト内の UTF-16 位置（onboundary 再同期用）
}

// 基準時間（scale=1のとき）。日本語TTSはおよそ7〜9モーラ/秒
const MORA_MS   = 115   // 仮名1モーラ
const KANJI_MS  = 185   // 漢字は平均約1.6モーラ
const SOKUON_MS = 90    // っ: 詰まる無音（口形は維持）
const COMMA_MS  = 260   // 読点
const PERIOD_MS = 380   // 句点・文末

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

export function charToMouth(ch: string): MouthState | "hold" {
  for (const [row, mouth] of VOWEL_ROWS) if (row.includes(ch)) return mouth
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

/**
 * テキストを口形タイムラインへコンパイルする。
 * @param scale 実測キャリブレーション係数（>1 = TTSが基準より遅い）
 */
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

    // 文頭などに単独で現れた小書き仮名: そのまま1モーラ
    if (SMALL_VOWEL[ch]) { push(SMALL_VOWEL[ch], MORA_MS, charIndex); continue }

    if ("。！？!?．".includes(ch)) { push("rest", PERIOD_MS, charIndex); continue }
    if ("、，,".includes(ch))      { push("rest", COMMA_MS,  charIndex); continue }
    if (" 　\n\t…・「」『』（）()\"'’”".includes(ch)) { push("rest", MORA_MS, charIndex); continue }
    if ("ー〜".includes(ch)) { push("hold", MORA_MS,   charIndex); continue }   // 長音: 口形を保って伸ばす
    if ("っッ".includes(ch)) { push("hold", SOKUON_MS, charIndex); continue }   // 促音: 口形を保って詰める
    if ("んン".includes(ch)) { push("closed", MORA_MS, charIndex); continue }

    // 直後の拗音・小書き母音を取り込んで1モーラに合体（きゃ→「あ」の口）
    let vowelOverride: MouthState | undefined
    const next = chars[k + 1]
    if (next && SMALL_VOWEL[next]) {
      vowelOverride = SMALL_VOWEL[next]
      k++
      idx += next.length
    }

    const base  = isKanji(ch) ? KANJI_MS : MORA_MS
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
