// kuromoji の発音フィールド検証（長音ー・助詞の発音変化・未知語の挙動を確認する）
const kuromoji = require("kuromoji")

const SAMPLES = [
  "今日はいい天気ですね",
  "私は東京へ行きます",
  "バナナを食べよう",
  "877handのバナナトーク",
  "こんにちは、世界！",
  "学校でぎゅうにゅうを飲んだ",
]

kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build((err, tk) => {
  if (err) { console.error(err); process.exit(1) }
  for (const text of SAMPLES) {
    const tokens = tk.tokenize(text)
    console.log(
      text, "→",
      tokens.map(t => `[${t.word_position - 1}]${t.surface_form}=${t.pronunciation ?? t.reading ?? "?"}`).join(" ")
    )
  }
})
