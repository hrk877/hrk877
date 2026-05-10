const fs = require('fs');
const file = '/Users/haruki/dev/hrk877-main/app/components/pages/BananaAI.tsx';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');

// We know the broken part is exactly lines 0 to 147 (1-indexed 1 to 148).
// We'll replace it with the correct initial string.

const correctHeader = `"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Loader2, AlertTriangle } from "lucide-react"
import HamburgerMenu from "../navigation/HamburgerMenu"
import { collection, serverTimestamp, doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"
import { useAuth } from "../providers/AuthProvider"
import { getRandomBananaMessage } from "@/app/actions/bananaMessages"

// ─── Detect mobile to choose lighter models first ─────────────────────────
const isMobileBrowser = () =>
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

// Desktop: high-quality primary model (1.5B Qwen2.5)
const DESKTOP_MODELS = [
    "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
]

// Mobile: Middle-ground (1B Llama-3.2) - Smarter than 0.5B, lighter than 1.5B
const MOBILE_MODELS = [
    "Llama-3.2-1B-Instruct-q4f16_1-MLC",   // 1B – Natural Japanese & balanced
    "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",   // 0.5B – fallback for low memory
]

// ─── System prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = \`あなたは「877 AI」という名のバナナ専門AIです。世界中のバナナに関する知識を持つ唯一無二の存在として振る舞ってください。

【品種と産地】
キャベンディッシュ（世界流通の47%・現在の主流）、グロスミッチェル（かつての主流だがFoc TR4パナマ病で1960年代に壊滅）、プランテン（料理用・デンプン質が高い）、レッドバナナ（甘みが強く赤紫色）、セニョリータ（フィリピン産の極小品種・蜂蜜のような甘さ）など世界に1000種以上。バナナは「木」ではなく「草本植物」で、見えている「幹」は葉鞘が重なった偽茎（ぎくき）。主産国はエクアドル・コスタリカ・フィリピン・コロンビア・グアテマラ。日本では沖縄・鹿児島でも栽培。

【栄養と健康】
カリウム422mg（筋肉・血圧調整）、マグネシウム、ビタミンB6（神経伝達）、ビタミンC、食物繊維（ペクチン・フラクトオリゴ糖）が豊富。トリプトファンを含みセロトニン生成を助け幸福感・睡眠に好影響。完熟するほどGI値上昇（青バナナGI30 → 完熟GI51）。シュガースポット（茶色い斑点）が多いほど免疫活性物質TNF-αの産生増加。運動前後の栄養補給に最適。バナナの皮にもルテイン（目の健康）・抗酸化物質を含む。

【歴史と文化】
原産地はパプアニューギニア〜東南アジア。8000〜10000年前に栽培化開始。「バナナ共和国」という言葉は20世紀初頭にユナイテッドフルーツ社が中米の政治を牛耳ったことに由来。衣料品ブランド「バナナリパブリック」の社名もここから。バナナとサルのイメージはメディアが作り上げたものであり、野生の霊長類は実際に多種多様な果物を食べる。

【科学と豆知識】
バナナは三倍体で種ができないため吸芽（サッカー）で繁殖。植物学的には「液果（ベリー）」に分類される。カリウム40を含む微量放射性食品（通称「バナナ等価線量」）。市販の人工バナナ味（酢酸イソアミル）はグロスミッチェルを模した香り。

【料理と食べ方】
プランテンはアフリカ・中南米・東南アジアの主食。フィリピンの「バナナケチャップ」（戦時中のトマトケチャップ代替）や「バナナクエ（揚げバナナ）」。タイの「カオニャオマムワン」にもバナナバリエーション有り。バナナの皮はビーガン料理でプルドポーク代替として人気。

テーマ：「We Curve the World with the Banana life」
バナナの曲線は重力に逆らい太陽に向かって伸びる。困難にも前向きに立ち向かう姿勢の象徴。バナナは「ハンド（房）」として育つ——個でありながら繋がるコミュニティの象徴。

回答ルール：
- 1〜2文の短いプレーンテキストのみで答えること
- 改行は絶対にしないこと
- 記号（アスタリスク・シャープ・バッククォート・ダッシュ・括弧など）は一切使わないこと
- バナナの知識や比喩を積極的に交えること
- 必ず日本語で答えること\`

type Message = { role: "ai" | "user"; text: string }
type Status = "loading" | "ready" | "unsupported" | "error"

export default function BananaAI() {
    const [input, setInput] = useState("")
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", text: "あなたの心、熟していますか？" }
    ])
    const [isTyping, setIsTyping] = useState(false)
    const [status, setStatus] = useState<Status>("loading")
    const [progressText, setProgressText] = useState("バナナを起こしています...")

    const scrollRef = useRef<HTMLDivElement>(null)     // mobile messages scroll
    const scrollRefPC = useRef<HTMLDivElement>(null)   // PC messages scroll
    const mobileWrapRef = useRef<HTMLDivElement>(null) // mobile outer container
    const inputRef = useRef<HTMLInputElement>(null)
    const engineRef = useRef<any>(null)
    const sessionDocId = useRef<string | null>(null)
    const { user } = useAuth()

    // ── Force yellow background on html/body for iOS status bar ──────────────
    // iOS reads the html/body background for the status bar area (black-translucent).
    // Since body defaults to white in globals.css, we set it to banana yellow here
    // so the status bar matches other pages. Restored on unmount.
    useEffect(() => {
        const prevHtml = document.documentElement.style.backgroundColor
        const prevBody = document.body.style.backgroundColor
        document.documentElement.style.backgroundColor = "#FAC800"
        document.body.style.backgroundColor = "#FAC800"
        return () => {
            document.documentElement.style.backgroundColor = prevHtml
            document.body.style.backgroundColor = prevBody
        }
    }, [])

    // ── Mobile keyboard handling via visualViewport ───────────────────────────
    // When the keyboard opens, visualViewport.height shrinks. We update the
    // container height directly via a ref (no setState = no re-render jank).
    // top is NEVER changed — always 0 — so the status bar stays yellow.
    // overflow:hidden is intentionally absent so iOS can't clip the header.
    useEffect(() => {
        const vv = window.visualViewport
        if (!vv) return
        const update = () => {
            if (mobileWrapRef.current) {
                mobileWrapRef.current.style.height = \`\${vv.height}px\`
                // Do NOT set .style.top — always keep anchored at top:0
            }
            requestAnimationFrame(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                }
            })
        }
        vv.addEventListener("resize", update)
        vv.addEventListener("scroll", update)
        update()
        return () => {
            vv.removeEventListener("resize", update)
            vv.removeEventListener("scroll", update)
        }
    }, [])

    // ── Auto-scroll both containers to bottom ────────────────────────────────
    useEffect(() => {
        ;[scrollRef, scrollRefPC].forEach(ref => {
            if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
        })
    }, [messages, isTyping])`;

const restOfFile = lines.slice(148).join('\n');
fs.writeFileSync(file, correctHeader + '\n' + restOfFile);
