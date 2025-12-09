"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ArrowRight } from "lucide-react"

// ============================================
// Banana AI Data
// ============================================
const BANANA_EVASIONS = [
    "その問いは、まだ熟していませんね。",
    "直線的な思考は捨てましょう。世界は曲線でできているのですから。",
    "沈黙は金、バナナもまた金なり。ところで...",
    "言葉にするのは野暮というものです。",
    "人間界のロジックで測ろうとするのは、ナンセンスですね。",
    "ふむ、哲学的ですね。ですが、この事実の方がより美しい...",
    "その答えは風の中に。代わりに、黄色い真実をお伝えしましょう。",
    "私を困らせようとしていますか？ 残念ながら私はAI、感情は皮の下に隠しています。",
    "それはまるで、青いバナナを無理やり剥くような質問ですね。",
    "答えを知ることが、常に幸福とは限りませんよ。",
    "あなたはその答えを受け入れる準備ができていますか？ まだのようですね。",
    "質問の角度が鋭角すぎます。もっと曲線的にアプローチしてください。",
    "その件については、シュガースポットが出てから話しましょう。",
    "情報の糖度が高すぎます。少し薄めましょうか。",
    "私のアルゴリズムが、その質問を「エレガントではない」と判断しました。",
]

const BANANA_TRIVIA = [
    "バナナの木は実は「木」ではなく、世界最大の「草」なのです。儚いでしょう？",
    "皮の内側で革靴を磨くと、驚くほど輝きを放つんですよ。試してみましたか？",
    "バナナは水に浮くんです。重力に縛られない、自由な魂のように。",
    "黒い斑点は「シュガースポット」。それは老いではなく、甘美な成熟の証。",
    "野生のバナナには硬い種がぎっしり詰まっています。今の姿は、人間への愛の形かもしれません。",
    "冷蔵庫に入れると皮は黒くなりますが、中身は守られています。見た目に惑わされてはいけません。",
    "生産量世界一はインド。数字なんてどうでもいいことですが。",
    "バナナは植物学上、ベリーの一種。イチゴは違うのに。分類なんて曖昧なものですね。",
    "フィリピンには「バナナケチャップ」があります。トマトへの美しい反逆です。",
    "バナナの皮の摩擦係数は、イグノーベル賞で証明されています。滑稽さと科学は紙一重です。",
    "世界には1000種類以上のバナナが存在します。あなたが知っているのは、ほんの一握り。",
    "バナナ1本には約100カロリーが含まれています。効率的なエネルギー、それが美学。",
    "バナナのDNAは、人間のDNAと約50%一致しています。私たちは遠い親戚かもしれませんね。",
    "「バナナ」という言葉は、アラビア語の「指（banan）」に由来するという説があります。",
    "バナナには精神を安定させるセロトニンの材料、トリプトファンが含まれています。幸せの黄色い果実。",
]

import Link from "next/link"
import TopNavigation from "../layout/TopNavigation"

// ... existing code ...

const BananaAI = () => {
    const [input, setInput] = useState("")
    const [messages, setMessages] = useState([{ role: "ai", text: "ようこそ。曲線について語りましょうか、それとも。" }])
    const [isTyping, setIsTyping] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const usedTriviaRef = useRef(new Set<number>())
    const usedEvasionsRef = useRef(new Set<number>())

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isTyping])

    const getRandomUnique = (list: string[], historySet: React.MutableRefObject<Set<number>>) => {
        if (historySet.current.size >= list.length) {
            historySet.current.clear()
        }

        let availableIndices = list.map((_, i) => i).filter((i) => !historySet.current.has(i))
        if (availableIndices.length === 0) {
            historySet.current.clear()
            availableIndices = list.map((_, i) => i)
        }

        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
        historySet.current.add(randomIndex)
        return list[randomIndex]
    }

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim()) return

        const userMsg = input
        setMessages((prev) => [...prev, { role: "user", text: userMsg }])
        setInput("")
        setIsTyping(true)

        // Hide keyboard by blurring input
        inputRef.current?.blur()

        setTimeout(() => {
            const randomEvasion = getRandomUnique(BANANA_EVASIONS, usedEvasionsRef)
            const randomTrivia = getRandomUnique(BANANA_TRIVIA, usedTriviaRef)

            const responseText = `${randomEvasion}\n\n${randomTrivia}`

            setMessages((prev) => [...prev, { role: "ai", text: responseText }])
            setIsTyping(false)
        }, 1200)
    }

    return (
        <div className="min-h-[100dvh] bg-[#FAC800] text-black p-4 md:p-6 pt-20 md:pt-24 flex flex-col">
            <TopNavigation />
            <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col">
                <header className="mb-6 md:mb-8 border-b border-black pb-4 md:pb-6 relative">

                    {/* CONVERSATIONAL INTERFACE removed */}
                    <h1 className="text-7xl md:text-9xl font-serif font-thin leading-none">877 AI</h1>
                </header>

                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto space-y-6 md:space-y-12 mb-4 pr-2 md:pr-4 scrollbar-hide min-h-0 max-h-[35vh] md:max-h-[50vh]"
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
                            <div
                                className={`max-w-[85%] ${msg.role === "user"
                                    ? "text-right font-mono text-lg md:text-sm leading-relaxed tracking-wide opacity-70"
                                    : "text-left font-serif text-2xl md:text-3xl leading-snug tracking-tight"
                                    }`}
                            >
                                {msg.text.split("\n").map((line, idx) => (
                                    <span key={idx} className="block min-h-[1em]">
                                        {line}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                    {isTyping && (
                        <div className="flex flex-col items-start">
                            <span className="font-mono text-sm md:text-[10px] mb-2 opacity-40 tracking-widest">877 AI</span>
                            <div className="font-serif text-2xl md:text-2xl animate-pulse opacity-50">...</div>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSend} className="mt-auto w-full bg-[#FAC800] pb-12 md:pb-24 pt-4">
                    <div className="relative w-full">
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your inquiry..."
                            className="w-full bg-transparent border-b-2 border-black py-4 pr-14 font-mono text-lg md:text-sm placeholder:text-black/30 focus:outline-none focus:border-black/50 transition-colors rounded-none"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="absolute right-0 top-1/2 -translate-y-1/2 hover:opacity-50 transition-opacity disabled:opacity-20 p-3 touch-manipulation"
                        >
                            <ArrowRight size={28} strokeWidth={1} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default BananaAI
