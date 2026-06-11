"use client"

import { splitSegments, type PhonToken } from "./lipSync"

// ─────────────────────────────────────────────────────────────────────────────
// /api/talk/phonemize のクライアントキャッシュ。
//
// 設計原則「絶対に破綻しない」:
//   ・speak() はネットワークを一切 await しない。getCachedTokens の同期参照のみ
//     （iOSはユーザー操作と同期的に speechSynthesis.speak しないと再生がブロックされる）
//   ・キャッシュは入力中の先読み（prefetchPhonemes）で温める
//   ・取得失敗は null を一時記録 → 30秒後に自動で再試行可能へ戻す
//   ・未取得/失敗時は呼び出し側が文字ベース推定へフォールバックする
// ─────────────────────────────────────────────────────────────────────────────

const cache    = new Map<string, PhonToken[] | null>()
const inflight = new Set<string>()
const MAX_CACHE = 200
const RETRY_AFTER_MS = 30_000

/** 同期参照。undefined=未取得 / null=取得失敗（フォールバックせよ） */
export function getCachedTokens(seg: string): PhonToken[] | null | undefined {
  return cache.get(seg)
}

const setCache = (seg: string, val: PhonToken[] | null) => {
  if (cache.size >= MAX_CACHE) cache.clear()
  cache.set(seg, val)
}

function fetchSegments(segs: string[]): void {
  const missing = segs.filter(s => !cache.has(s) && !inflight.has(s))
  if (missing.length === 0) return
  missing.forEach(s => inflight.add(s))

  fetch("/api/talk/phonemize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts: missing }),
  })
    .then(r => (r.ok ? (r.json() as Promise<{ results?: PhonToken[][] }>) : Promise.reject(new Error(`${r.status}`))))
    .then(j => {
      missing.forEach((seg, i) => {
        const tokens = j.results?.[i]
        setCache(seg, Array.isArray(tokens) ? tokens : null)
      })
    })
    .catch(() => {
      // 一時的な失敗（オフライン・コールドスタート遅延等）は時間をおいて再試行できるようにする
      missing.forEach(seg => {
        setCache(seg, null)
        setTimeout(() => { if (cache.get(seg) === null) cache.delete(seg) }, RETRY_AFTER_MS)
      })
    })
    .finally(() => missing.forEach(s => inflight.delete(s)))
}

/** 入力中・発話開始時に呼ぶ。冪等・fire-and-forget */
export function prefetchPhonemes(text: string): void {
  if (typeof window === "undefined" || !text.trim()) return
  const segs = splitSegments(text).filter(s => s.length <= 2000)
  if (segs.length > 0) fetchSegments(segs.slice(0, 50))
}
