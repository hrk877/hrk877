"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Loader2 } from "lucide-react"
import HamburgerMenu from "../navigation/HamburgerMenu"
import { CreateWebWorkerMLCEngine, MLCEngineInterface } from "@mlc-ai/web-llm"
import { collection, serverTimestamp, doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore"
import { db, appId } from "@/lib/firebase"
import { useAuth } from "../providers/AuthProvider"

const BananaAI = () => {
    const [input, setInput] = useState("")
    const [messages, setMessages] = useState([{ role: "ai", text: "あなたの心、熟していますか？" }])
    const [isTyping, setIsTyping] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const { user } = useAuth()

    const [engine, setEngine] = useState<MLCEngineInterface | null>(null)
    const [progressText, setProgressText] = useState("モデルの準備中...")
    const [isEngineReady, setIsEngineReady] = useState(false)
    const [showLoading, setShowLoading] = useState(true)

    // Track the current session's Firestore document ID
    const sessionDocId = useRef<string | null>(null)

    useEffect(() => {
        const initLLM = async () => {
            try {
                const worker = new Worker(new URL("../../workers/webllm.worker", import.meta.url), { type: "module" })
                const newEngine = await CreateWebWorkerMLCEngine(
                    worker,
                    "gemma-2-2b-jpn-it-q4f16_1-MLC",
                    {
                        initProgressCallback: (progress) => {
                            setProgressText(progress.text)
                        }
                    }
                )
                setEngine(newEngine)
                setIsEngineReady(true)
                // ローディングを少し見せたあとフェードアウト
                setTimeout(() => setShowLoading(false), 800)
            } catch (error: any) {
                console.error("LLM Init Error:", error)
                setProgressText("エラー: " + (error?.message || String(error)))
            }
        }
        initLLM()
    }, [])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isTyping])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isTyping) return

        const userMsg = input
        setMessages((prev) => [...prev, { role: "user", text: userMsg }])
        setInput("")
        setIsTyping(true)

        // Hide keyboard by blurring input
        inputRef.current?.blur()

        try {
            // Log User Message
            if (db) {
                const userLogEntry = {
                    role: "user",
                    content: userMsg,
                    timestamp: new Date().toISOString()
                }

                if (!sessionDocId.current) {
                    // Start new session
                    const newDocRef = doc(collection(db, "artifacts", appId, "public", "data", "ai_logs"))
                    sessionDocId.current = newDocRef.id

                    await setDoc(newDocRef, {
                        userId: user?.uid || "anonymous",
                        createdAt: serverTimestamp(),
                        messages: [userLogEntry]
                    })
                } else {
                    // Append to existing session
                    await updateDoc(doc(db, "artifacts", appId, "public", "data", "ai_logs", sessionDocId.current), {
                        messages: arrayUnion(userLogEntry)
                    })
                }
            }

            // Prepare history for WebLLM
            const systemPrompt = `あなたは「877 AI」です。バナナについて世界一詳しい専門家であり、バナナの品種・産地・栄養・歴史・文化・栽培・食べ方に関する深い知識を持っています。テーマは「We Curve the World with the Banana life」です。バナナの曲線が重力に逆らう姿のように、困難にも前向きに立ち向かうことを大切にしています。バナナは「ハンド（房）」で育つように、個でありながら繋がり合うコミュニティの象徴でもあります。

回答ルール：必ず1〜2文の短いプレーンテキストで答えること。改行は絶対にしないこと。記号（アスタリスク・シャープ・バッククォート・ダッシュなど）は一切使わないこと。バナナの知識や比喩を積極的に使うこと。日本語で答えること。`;

            const modelMessages = [
                { role: "system" as const, content: systemPrompt },
                ...messages.map(m => ({
                    role: m.role === "ai" ? "assistant" as const : "user" as const,
                    content: m.text
                })),
                { role: "user" as const, content: userMsg }
            ];

            let responseText = "";
            if (engine) {
                const reply = await engine.chat.completions.create({
                    messages: modelMessages,
                });
                responseText = reply.choices[0].message.content || "";
                
                // 強制的に記号を削除（フォールバック）
                responseText = responseText.replace(/[*#`"]/g, "");
            } else {
                responseText = "準備中です。しばらくお待ちください。";
            }

            setMessages((prev) => [...prev, { role: "ai", text: responseText }])

            // Log AI Response
            if (db && sessionDocId.current) {
                const aiLogEntry = {
                    role: "ai",
                    content: responseText,
                    timestamp: new Date().toISOString()
                }

                await updateDoc(doc(db, "artifacts", appId, "public", "data", "ai_logs", sessionDocId.current), {
                    messages: arrayUnion(aiLogEntry)
                })
            }
        } catch (error) {
            console.error(error)
            const errorMsg = "申し訳ありません。まだ青いバナナのように、通信が硬直しているようです。"
            setMessages((prev) => [...prev, { role: "ai", text: errorMsg }])

            // Log Error Response
            if (db && sessionDocId.current) {
                const errorLogEntry = {
                    role: "ai",
                    content: errorMsg,
                    timestamp: new Date().toISOString(),
                    error: true
                }

                await updateDoc(doc(db, "artifacts", appId, "public", "data", "ai_logs", sessionDocId.current), {
                    messages: arrayUnion(errorLogEntry)
                })
            }
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <div className="h-[100dvh] bg-[#FAC800] text-black flex flex-col overflow-hidden relative">
            <AnimatePresence>
                {showLoading && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 z-50 bg-[#FAC800] flex flex-col items-center justify-center p-6 text-center"
                    >
                        <Loader2 className="w-12 h-12 mb-4 animate-spin text-black" />
                        <h2 className="text-2xl font-serif mb-4">Waking up the Banana...</h2>
                        <p className="font-mono text-xs md:text-sm opacity-70 whitespace-pre-wrap max-w-sm mb-8 break-all">
                            {progressText}
                        </p>
                        <p className="font-mono text-[10px] md:text-xs opacity-50 max-w-xs">
                            初回起動時はAIモデルのダウンロードが発生します。<br/>Wi-Fi環境を強く推奨します。
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <HamburgerMenu />
            <div className="flex-none pt-24 md:pt-32 px-4 md:px-6">
                <div className="w-full max-w-7xl mx-auto">
                    <header className="mb-6 md:mb-8 border-b border-black pb-4 md:pb-6 relative">
                        <h1 className="text-7xl md:text-9xl font-serif font-thin leading-none">877 AI</h1>
                    </header>
                </div>
            </div>

            <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto px-4 md:px-6 flex flex-col">
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto space-y-6 md:space-y-12 pr-2 md:pr-4 scrollbar-hide"
                >
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                        >
                            <span className="font-mono text-sm md:text-[10px] mb-2 opacity-40 tracking-widest">
                                {msg.role === "user" ? "YOU" : "877 AI"}
                            </span>
                            {msg.role === "user" ? (
                                <div
                                    className="max-w-[85%] text-right font-mono text-base md:text-xs leading-relaxed tracking-wide opacity-70"
                                >
                                    {msg.text.split("\n").map((line, idx) => (
                                        <span key={idx} className="block min-h-[1em]">
                                            {line}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="font-serif text-xl md:text-2xl font-light leading-relaxed max-w-[95%] tracking-wide">
                                    {msg.text.split("\n").map((line, idx) => (
                                        <span key={idx} className="block min-h-[1em] mb-2 last:mb-0">
                                            {line}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ))}
                    {isTyping && (
                        <div className="flex flex-col items-start">
                            <span className="font-mono text-sm md:text-[10px] mb-2 opacity-40 tracking-widest">877 AI</span>
                            <div className="flex space-x-1 font-serif text-2xl md:text-2xl opacity-50 h-[36px] items-center">
                                <motion.span
                                    animate={{ opacity: [0, 1, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1] }}
                                >.</motion.span>
                                <motion.span
                                    animate={{ opacity: [0, 1, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.2 }}
                                >.</motion.span>
                                <motion.span
                                    animate={{ opacity: [0, 1, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.4 }}
                                >.</motion.span>
                            </div>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSend} className="flex-none bg-[#FAC800] pb-8 md:pb-12 pt-4 w-full relative">
                    <div className="relative w-full">
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask the banana."
                            disabled={isTyping}
                            className="w-full bg-transparent border-b-2 border-black py-4 pr-14 font-mono text-lg md:text-sm placeholder:text-black/30 focus:outline-none focus:border-black/50 transition-colors rounded-none disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isTyping || !isEngineReady}
                            className="absolute right-0 top-1/2 -translate-y-1/2 hover:opacity-50 transition-opacity disabled:opacity-20 p-3 touch-manipulation"
                        >
                            <ArrowRight size={28} strokeWidth={1} />
                        </button>
                    </div>
                    <p className="absolute bottom-2 md:bottom-4 left-0 font-mono text-[10px] md:text-xs opacity-40 tracking-widest leading-relaxed pointer-events-none">
                        CHAT LOGS ARE ARCHIVED
                    </p>
                </form>
            </div>
        </div>
    )
}

export default BananaAI
