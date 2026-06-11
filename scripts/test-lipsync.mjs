// リップシンク純粋ロジックの検証スイート
// 実行: node scripts/test-lipsync.mjs  （Node 23+ の type stripping で .ts を直接 import）
import {
  buildTimeline,
  buildTimelineFromTokens,
  parseMoras,
  numberToKana,
  splitSegments,
  charToMouth,
} from "../app/talk/lipSync.ts"

let failed = 0
const eq = (name, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a === e) { console.log(`  ok  ${name}`) }
  else { failed++; console.error(`FAIL  ${name}\n      expected: ${e}\n      actual:   ${a}`) }
}
const ok = (name, cond) => {
  if (cond) { console.log(`  ok  ${name}`) }
  else { failed++; console.error(`FAIL  ${name}`) }
}
const mouths = r => r.steps.map(s => s.mouth)
const moraMouths = ms => ms.map(m => m.mouth)

// タイムラインの構造的不変条件（どんな入力でも壊れてはいけない）
const invariants = (name, r) => {
  let t = 0, okFlag = true
  for (const s of r.steps) {
    if (s.t !== t || s.dur < 1 || !Number.isFinite(s.dur) || s.charIndex < 0) { okFlag = false; break }
    t += s.dur
  }
  ok(`${name}: 不変条件（t連続・dur≥1・charIndex≥0・total一致）`, okFlag && t === r.total)
}

console.log("── numberToKana ──")
eq("877", numberToKana("877"), "ハッピャクナナジュウナナ")
eq("2026", numberToKana("2026"), "ニセンニジュウロク")
eq("0", numberToKana("0"), "ゼロ")
eq("10", numberToKana("10"), "ジュウ")
eq("300", numberToKana("300"), "サンビャク")
eq("600", numberToKana("600"), "ロッピャク")
eq("8000", numberToKana("8000"), "ハッセン")
eq("15000", numberToKana("15000"), "イチマンゴセン")
eq("090（先頭0は桁読み）", numberToKana("090"), "ゼロキュウゼロ")
eq("123456789（9桁は桁読み）", numberToKana("123456789"), "イチニサンヨンゴロクナナハチキュウ")

console.log("── parseMoras ──")
eq("キョー → 拗音1モーラ+長音hold", moraMouths(parseMoras("キョー")), ["open_o", "hold"])
eq("ガッコー", moraMouths(parseMoras("ガッコー")), ["open_a", "hold", "open_o", "hold"])
eq("コンニチワ", moraMouths(parseMoras("コンニチワ")), ["open_o", "closed", "open_i", "open_i", "open_a"])
eq("バナナ → 両唇音2フェーズ", moraMouths(parseMoras("バナナ")), ["closed", "open_a", "open_a", "open_a"])
{
  const desu = parseMoras("デス")
  eq("デス 口形", moraMouths(desu), ["open_e", "open_u"])
  ok("デス 語末スは無声化で短い", desu[1].rel < 0.6)
}
{
  const shita = parseMoras("シタ")
  ok("シタ 無声子音前のシは短い", shita[0].rel < 0.7 && shita[1].rel === 1)
}
eq("ひらがな入力も同じ結果", moraMouths(parseMoras("きょー")), moraMouths(parseMoras("キョー")))
eq("空文字", parseMoras(""), [])
eq("記号のみ（発音に寄与しない）", parseMoras("→★"), [])

console.log("── buildTimelineFromTokens ──")
{
  // 今日はいい天気ですね（kuromoji実出力を再現）
  const tokens = [
    { s: 0, surface: "今日", pron: "キョー" },
    { s: 2, surface: "は",   pron: "ワ" },
    { s: 3, surface: "いい", pron: "イイ" },
    { s: 5, surface: "天気", pron: "テンキ" },
    { s: 7, surface: "です", pron: "デス" },
    { s: 9, surface: "ね",   pron: "ネ" },
  ]
  const r = buildTimelineFromTokens(tokens)
  invariants("今日は…", r)
  eq("今日は…の口形列", mouths(r),
    ["open_o", "hold", "open_a", "open_i", "open_i", "open_e", "closed", "open_i", "open_e", "open_u", "open_e"])
  // 旧文字ベース: 今日=2漢字=擬似ランダム2口形。新: キョ+ー の2ステップで長音保持 ✓
  eq("charIndexはトークン開始位置", [...new Set(r.steps.map(s => s.charIndex))], [0, 2, 3, 5, 7, 9])
}
{
  // 句読点・空白ギャップ
  const tokens = [
    { s: 0, surface: "こんにちは", pron: "コンニチワ" },
    { s: 5, surface: "、", pron: "、" },
    { s: 6, surface: "世界", pron: "セカイ" },
    { s: 8, surface: "！", pron: "！" },
  ]
  const r = buildTimelineFromTokens(tokens)
  invariants("こんにちは、世界！", r)
  const rests = r.steps.filter(s => s.mouth === "rest")
  ok("読点・感嘆符でrest 2回", rests.length === 2 && rests[0].dur > 200 && rests[1].dur > 300)
}
{
  // 未知語フォールバック: ひらがな表層・数字・英字
  const tokens = [
    { s: 0, surface: "877",  pron: "" },
    { s: 3, surface: "hand", pron: "" },
    { s: 8, surface: "ぎゅうにゅう", pron: "" },   // s=8: 間に空白1つ想定
  ]
  const r = buildTimelineFromTokens(tokens)
  invariants("未知語混在", r)
  ok("877はハッピャク…に展開（閉唇を含む≥8ステップ）",
     r.steps.filter(s => s.charIndex === 0).length >= 8 &&
     r.steps.some(s => s.charIndex === 0 && s.mouth === "closed"))
  ok("空白ギャップのrestがある", r.steps.some(s => s.mouth === "rest" && s.charIndex === 7))
  eq("ぎゅうにゅう（表層かな読み）",
     r.steps.filter(s => s.charIndex === 8).map(s => s.mouth),
     ["open_u", "open_u", "open_u", "open_u"])
}
{
  // 壊れたトークンでも落ちない
  const r = buildTimelineFromTokens([null, { s: -1 }, { s: 0, surface: 42 }, { s: 0, surface: "あ", pron: "ア" }])
  ok("不正トークンを無視して処理続行", r.steps.length === 1 && r.steps[0].mouth === "open_a")
}
eq("空配列", buildTimelineFromTokens([]), { steps: [], total: 0 })

console.log("── buildTimeline（フォールバック） ──")
{
  const r = buildTimeline("きゃ")
  eq("きゃ → 1モーラ", mouths(r), ["open_a"])
}
{
  const r = buildTimeline("ばっちりー")
  eq("ばっちりー", mouths(r), ["closed", "open_a", "hold", "open_i", "open_i", "hold"])
}
{
  const r = buildTimeline("877円")
  invariants("877円", r)
  ok("フォールバックでも数字を読みに展開", r.steps.length >= 9)
  eq("数字runのcharIndexは先頭", r.steps[0].charIndex, 0)
  eq("円のcharIndexは3", r.steps.at(-1).charIndex, 3)
}
{
  const r = buildTimeline("𩸽あ")   // サロゲートペア
  invariants("サロゲート", r)
  eq("サロゲート後のcharIndex", r.steps.map(s => s.charIndex), [0, 2])
}
ok("空文字で空タイムライン", buildTimeline("").steps.length === 0)
ok("絵文字・記号で例外なし", buildTimeline("🍌✨→").total >= 0)

console.log("── splitSegments / charToMouth ──")
eq("改行分割", splitSegments("こんにちは\n\nバナナです\n  "), ["こんにちは", "バナナです"])
eq("英子音はhold", charToMouth("k"), "hold")
eq("mは閉唇", charToMouth("m"), "closed")

console.log(failed === 0 ? "\n✅ all tests passed" : `\n❌ ${failed} test(s) failed`)
process.exit(failed === 0 ? 0 : 1)
