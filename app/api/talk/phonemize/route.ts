import { NextRequest, NextResponse } from "next/server"
import path from "path"
import kuromoji from "kuromoji"

// kuromoji辞書(約17MB)の読み込みは初回のみ。サーバーレスのコールドスタートで
// 1〜2秒かかるため、クライアントは入力中に先読みして温める設計（phonemize.ts）
export const maxDuration = 30

type Tokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>
let tokenizerPromise: Promise<Tokenizer> | null = null

const getTokenizer = (): Promise<Tokenizer> => {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise<Tokenizer>((resolve, reject) => {
      kuromoji
        .builder({ dicPath: path.join(process.cwd(), "node_modules", "kuromoji", "dict") })
        .build((err, tk) => (err ? reject(err) : resolve(tk)))
    })
    // 失敗を恒久化しない（次のリクエストで再試行できるようにする）
    tokenizerPromise.catch(() => { tokenizerPromise = null })
  }
  return tokenizerPromise
}

export async function POST(req: NextRequest) {
  let texts: unknown
  try {
    ;({ texts } = (await req.json()) as { texts?: unknown })
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
  if (
    !Array.isArray(texts) || texts.length === 0 || texts.length > 50 ||
    texts.some(t => typeof t !== "string" || t.length > 2000)
  ) {
    return NextResponse.json(
      { error: "texts: string[] (≤50 items, ≤2000 chars each) required" },
      { status: 400 },
    )
  }

  try {
    const tk = await getTokenizer()
    const results = (texts as string[]).map(text =>
      tk.tokenize(text).map(t => ({
        s: t.word_position - 1,                       // UTF-16開始位置（0-based）
        surface: t.surface_form,
        pron: t.pronunciation ?? t.reading ?? "",     // 発音はーで長音を区別する（キョー等）
      })),
    )
    return NextResponse.json({ results })
  } catch (err) {
    console.error("[/api/talk/phonemize]", err)
    // クライアントは文字ベース推定へフォールバックするので 503 でよい
    return NextResponse.json({ error: "tokenizer unavailable" }, { status: 503 })
  }
}
