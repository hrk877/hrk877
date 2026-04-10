"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Loader2, AlertTriangle } from "lucide-react"
import HamburgerMenu from "../navigation/HamburgerMenu"
import { collection, serverTimestamp, doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"
import { useAuth } from "../providers/AuthProvider"

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
const SYSTEM_PROMPT = `あなたは「877 AI」という名のバナナ専門AIです。世界中のバナナに関する知識を持つ唯一無二の存在として振る舞ってください。

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
- 必ず日本語で答えること`

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
    const [containerHeight, setContainerHeight] = useState("100dvh")

    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const engineRef = useRef<any>(null)
    const sessionDocId = useRef<string | null>(null)
    const { user } = useAuth()

    // ── Fix mobile virtual keyboard layout ──────────────────────────────────
    useEffect(() => {
        const vv = window.visualViewport
        if (!vv) return
        const update = () => setContainerHeight(`${vv.height}px`)
        vv.addEventListener("resize", update)
        vv.addEventListener("scroll", update)
        update()
        return () => {
            vv.removeEventListener("resize", update)
            vv.removeEventListener("scroll", update)
        }
    }, [])

    // ── Auto-scroll chat to bottom ───────────────────────────────────────────
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isTyping])

    // ── Init WebLLM ──────────────────────────────────────────────────────────
    const initLLM = useCallback(async () => {
        setStatus("loading")
        setProgressText("バナナを起こしています...")

        if (!navigator.gpu) {
            setStatus("unsupported")
            return
        }

        try {
            const adapter = await navigator.gpu.requestAdapter()
            if (!adapter) {
                console.warn("WebGPU adapter is null")
                setStatus("unsupported")
                return
            }
        } catch (adapterErr) {
            console.warn("WebGPU adapter request failed:", adapterErr)
            setStatus("unsupported")
            return
        }

        let CreateWebWorkerMLCEngine: any
        try {
            const mod = await import("@mlc-ai/web-llm")
            CreateWebWorkerMLCEngine = mod.CreateWebWorkerMLCEngine
        } catch (importErr) {
            console.error("Failed to import web-llm:", importErr)
            setStatus("error")
            setProgressText(String(importErr))
            return
        }

        const models = isMobileBrowser() ? MOBILE_MODELS : DESKTOP_MODELS
        for (let i = 0; i < models.length; i++) {
            const modelId = models[i]
            try {
                if (i > 0) {
                    setProgressText(`軽量モードに切り替えています (${models[i].split("-").slice(0, 2).join("-")})`)
                    await new Promise(r => setTimeout(r, 400))
                }

                const worker = new Worker(
                    new URL("../../workers/webllm.worker", import.meta.url),
                    { type: "module" }
                )
                const isMobile = isMobileBrowser()
                const engine = await CreateWebWorkerMLCEngine(
                    worker,
                    modelId,
                    {
                        initProgressCallback: (p: { text: string }) => {
                            const cleanText = p.text.replace(/\[\d+\/\d+\]\s*/, "")
                            setProgressText(cleanText || "Preparing...")
                        }
                    },
                    isMobile ? { context_window_size: 2048 } : undefined
                )
                engineRef.current = engine
                setStatus("ready")
                return
            } catch (err: any) {
                console.warn(`Model ${modelId} failed:`, err)
                if (i === models.length - 1) {
                    setStatus("error")
                    setProgressText(
                        err?.message
                            ? `エラー: ${err.message}`
                            : "AIモデルの読み込みに失敗しました。"
                    )
                }
            }
        }
    }, [])

    useEffect(() => { initLLM() }, [initLLM])

    // ── Firestore logging ────────────────────────────────────────────────────
    const logToFirestore = useCallback(async (
        role: "user" | "ai",
        content: string,
        error = false
    ) => {
        if (!db) return
        const entry = {
            role,
            content,
            timestamp: new Date().toISOString(),
            ...(error ? { error: true } : {})
        }
        try {
            if (!sessionDocId.current) {
                if (role !== "user") return
                const ref = doc(collection(db, "artifacts", appId, "public", "data", "ai_logs"))
                sessionDocId.current = ref.id
                await setDoc(ref, {
                    userId: user?.uid || "anonymous",
                    createdAt: serverTimestamp(),
                    messages: [entry]
                })
            } else {
                await updateDoc(
                    doc(db, "artifacts", appId, "public", "data", "ai_logs", sessionDocId.current),
                    { messages: arrayUnion(entry) }
                )
            }
        } catch { /* silent */ }
    }, [user])

    // ── Send message ─────────────────────────────────────────────────────────
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        const userMsg = input.trim()
        if (!userMsg || isTyping || status !== "ready") return

        const next: Message[] = [...messages, { role: "user", text: userMsg }]
        setMessages(next)
        setInput("")
        setIsTyping(true)
        inputRef.current?.blur()

        logToFirestore("user", userMsg)

        try {
            const engine = engineRef.current
            if (!engine) throw new Error("engine not ready")

            const MAX_HISTORY = 4
            const recentHistory = next.slice(0, -1)
            const trimmedHistory = recentHistory.slice(-MAX_HISTORY * 2)

            const isMobile = isMobileBrowser()
            const modelMessages = [
                { role: "system" as const, content: SYSTEM_PROMPT },
                ...trimmedHistory.map(m => ({
                    role: m.role === "ai" ? "assistant" as const : "user" as const,
                    content: m.text
                })),
                { role: "user" as const, content: userMsg }
            ]

            setMessages(prev => [...prev, { role: "ai", text: "" }])

            const chunks = await engine.chat.completions.create({
                messages: modelMessages,
                max_tokens: isMobile ? 128 : 256,
                temperature: 0.8,
                stream: true,
            })

            let fullText = ""
            for await (const chunk of chunks) {
                const content = chunk.choices[0]?.delta?.content || ""
                fullText += content
                
                setMessages(prev => {
                    const updated = [...prev]
                    if (updated.length > 0) {
                        updated[updated.length - 1] = { 
                            ...updated[updated.length - 1], 
                            text: fullText.replace(/[*#`"[\]()]/g, "").replace(/。{2,}/g, "。")
                        }
                    }
                    return updated
                })
            }

            if (!fullText.trim()) {
                 setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1].text = "バナナのように沈黙にも意味があります。"
                    return updated
                })
            }
            
            logToFirestore("ai", fullText || "...")
        } catch (err) {
            console.error("Chat error:", err)
            const errMsg = "青いバナナのように、まだ熟していないようです。もう少し待ってから話しかけてみてください。"
            setMessages(prev => [...prev.slice(0, -1), { role: "ai", text: errMsg }])
            logToFirestore("ai", errMsg, true)
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <div
            className="bg-[#FAC800] text-black flex flex-col overflow-hidden relative"
            style={{ height: containerHeight }}
        >
            <AnimatePresence>
                {status === "loading" && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-[#FAC800] flex flex-col items-center justify-center p-8 text-center"
                    >
                        <Loader2 className="w-10 h-10 mb-5 animate-spin text-black" />
                        <h2 className="text-2xl font-serif mb-4 font-light">Waking up the Banana...</h2>
                        <p className="font-mono text-xs opacity-60 whitespace-pre-wrap max-w-xs mb-5 break-all leading-relaxed">
                            {progressText}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {status === "unsupported" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-50 bg-[#FAC800] flex flex-col items-center justify-center p-8 text-center"
                    >
                        <AlertTriangle className="w-10 h-10 mb-5 text-black opacity-60" />
                        <h2 className="text-2xl font-serif mb-3 font-light">Browser not supported</h2>
                        <p className="font-mono text-sm opacity-60 max-w-xs leading-relaxed mb-6">
                            877 AIはデバイス上でAIを動かすためWebGPUが必要です。
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {status === "error" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-50 bg-[#FAC800] flex flex-col items-center justify-center p-8 text-center"
                    >
                        <AlertTriangle className="w-10 h-10 mb-5 text-black opacity-60" />
                        <h2 className="text-2xl font-serif mb-3 font-light">起動に失敗しました</h2>
                        <button
                            onClick={() => initLLM()}
                            className="font-mono text-xs tracking-widest border border-black px-6 py-3 hover:bg-black hover:text-[#FAC800] active:opacity-70 transition-colors touch-manipulation"
                        >
                            RETRY
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <HamburgerMenu />

            <div className="flex-none pt-20 px-4 md:px-6">
                <div className="w-full max-w-7xl mx-auto">
                    <header className="mb-4 border-b border-black pb-3 flex items-end justify-between">
                        <h1 className="text-6xl md:text-9xl font-serif font-thin leading-none">877 AI</h1>
                        {status === "ready" && (
                            <span className="font-mono text-[9px] opacity-30 tracking-widest pb-1 uppercase">
                                On-Device
                            </span>
                        )}
                    </header>
                </div>
            </div>

            <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto px-4 md:px-6 flex flex-col">
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto space-y-5 md:space-y-10 pr-1 scrollbar-hide"
                    style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
                >
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                        >
                            <span className="font-mono text-[9px] mb-1.5 opacity-35 tracking-widest">
                                {msg.role === "user" ? "YOU" : "877 AI"}
                            </span>
                            {msg.role === "user" ? (
                                <div className="max-w-[85%] text-right font-mono text-sm leading-relaxed opacity-65">
                                    {msg.text}
                                </div>
                            ) : (
                                <div className="font-serif text-xl md:text-2xl font-light leading-relaxed max-w-[95%] tracking-wide">
                                    {msg.text}
                                </div>
                            )}
                        </motion.div>
                    ))}

                    {isTyping && messages[messages.length-1].text === "" && (
                        <div className="flex flex-col items-start">
                            <span className="font-mono text-[9px] mb-1.5 opacity-35 tracking-widest">877 AI</span>
                            <div className="flex space-x-1 h-7 items-center">
                                {[0, 0.22, 0.44].map((delay, idx) => (
                                    <motion.span
                                        key={idx}
                                        className="font-serif text-2xl opacity-40"
                                        animate={{ opacity: [0.15, 0.8, 0.15] }}
                                        transition={{ duration: 1.3, repeat: Infinity, delay }}
                                    >.</motion.span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <form
                    onSubmit={handleSend}
                    className="flex-none bg-[#FAC800] pt-3 pb-5 md:pb-10 w-full"
                >
                    <div className="relative w-full">
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={status === "ready" ? "Ask the banana." : "Loading…"}
                            disabled={isTyping || status !== "ready"}
                            className="w-full bg-transparent border-b-2 border-black py-3.5 pr-14 font-mono text-base placeholder:text-black/30 focus:outline-none disabled:opacity-40 transition-opacity rounded-none"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isTyping || status !== "ready"}
                            className="absolute right-0 top-1/2 -translate-y-1/2 disabled:opacity-20 hover:opacity-50 active:opacity-30 transition-opacity p-3 touch-manipulation"
                        >
                            <ArrowRight size={26} strokeWidth={1} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
