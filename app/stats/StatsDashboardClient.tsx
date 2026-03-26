"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../components/providers/AuthProvider"
import HamburgerMenu from "../components/navigation/HamburgerMenu"
import { TrafficDashboard, CommunityGrowthChart, DevCharts } from "../components/stats/StatsCharts"

export default function StatsDashboardClient({ data }: { data: any }) {
    const { isAdmin, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !isAdmin) {
            router.replace("/")
        }
    }, [isAdmin, loading, router])

    if (loading) {
        return (
            <main className="min-h-screen bg-[#FAC800] flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-black/20 border-t-black animate-spin"></div>
            </main>
        )
    }

    if (!isAdmin) return null

    const totalCommits = data.growth[data.growth.length - 1]?.commits || 0;
    const currentLoc = data.growth[data.growth.length - 1]?.loc || 0;
    const totalPosts = data.community.journal;

    return (
        <main className="min-h-screen bg-[#FAC800] text-black p-4 md:p-6 pt-24 md:pt-32 pb-20 relative font-serif overflow-x-hidden">
            <HamburgerMenu color="black" />

            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start mb-12 md:mb-20 border-b border-black pb-4 md:pb-6 relative z-10">
                    <div>
                        <h1 className="text-7xl md:text-9xl font-thin leading-none mb-4 md:mb-8">
                            STATS
                        </h1>
                        <p className="font-mono text-[10px] md:text-xs tracking-[0.4em] opacity-40 uppercase">
                            877 PROJECT DASHBOARD & METRICS
                        </p>
                    </div>
                    
                    <div className="mt-8 md:mt-0 md:text-right">
                        <div className="font-mono text-[10px] tracking-[0.2em] opacity-60 mb-2 uppercase">ENVIRONMENT</div>
                        <div className="flex flex-wrap md:justify-end gap-x-4 gap-y-1 text-[10px] md:text-xs font-mono tracking-wider opacity-80">
                            <span>NEXT.JS 16</span>
                            <span>TURBOPACK</span>
                            <span>FIREBASE</span>
                            <span>GEMINI 2.0</span>
                            <span className="text-black/30">•</span>
                            <span>VERCEL</span>
                        </div>
                    </div>
                </header>

                <div className="max-w-5xl mx-auto space-y-24 md:space-y-32">
                    
                    {/* 1. SITE TRAFFIC (GA4) - Priority #1 */}
                    <section>
                        <TrafficDashboard data={data} />
                    </section>
                    
                    {/* 2. COMMUNITY & INTERACTION METRICS - Priority #2 */}
                    <section className="border-t border-black pt-16 space-y-16">
                        <div className="flex flex-col md:flex-row justify-between items-baseline mb-12">
                            <h2 className="text-4xl md:text-6xl font-thin tracking-tight uppercase">
                                COMMUNITY & <br className="hidden md:block" />INTERACTIONS
                            </h2>
                            <p className="font-mono text-[10px] tracking-[0.3em] opacity-40 mt-4 md:mt-0">
                                LIVE DATA FROM FIRESTORE
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            <div className="bg-black/5 p-8 border border-black/10 flex flex-col justify-between aspect-square">
                                <div className="text-[10px] font-mono tracking-[0.4em] opacity-40 uppercase">COMMUNITY MEMBERS</div>
                                <div className="text-7xl md:text-8xl font-thin font-mono">{data.community.users}</div>
                                <div className="text-xs font-mono opacity-60">Registered explorers in the 877 ecosystem.</div>
                            </div>
                            
                            <div className="bg-black/5 p-8 border border-black/10 flex flex-col justify-between aspect-square">
                                <div className="text-[10px] font-mono tracking-[0.4em] opacity-40 uppercase">TOTAL HERITAGE</div>
                                <div className="text-7xl md:text-8xl font-thin font-mono">{data.community.totalArtifacts}</div>
                                <div className="text-xs font-mono opacity-60">Collective assets: Bananas, AI logs, Museum works, and Journal entries.</div>
                            </div>

                            <div className="bg-black/5 p-8 border border-black/10 flex flex-col justify-between aspect-square">
                                <div className="text-[10px] font-mono tracking-[0.4em] opacity-40 uppercase">ENGAGEMENT RATIO</div>
                                <div className="text-7xl md:text-8xl font-thin font-mono">{data.community.engagement}</div>
                                <div className="text-xs font-mono opacity-60">Average interactions per user across the ecosystem.</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pt-16 mt-16 border-t border-black/10">
                            <div className="space-y-4">
                                <div className="text-4xl md:text-5xl font-thin font-mono">{data.community.bananas}</div>
                                <div className="text-[10px] font-mono tracking-[0.4em] opacity-40 uppercase">BANANA DROPS</div>
                            </div>
                            <div className="space-y-4">
                                <div className="text-4xl md:text-5xl font-thin font-mono">{data.community.aiLogs}</div>
                                <div className="text-[10px] font-mono tracking-[0.4em] opacity-40 uppercase">AI DIALOGUES</div>
                            </div>
                            <div className="space-y-4">
                                <div className="text-4xl md:text-5xl font-thin font-mono">{data.community.museum}</div>
                                <div className="text-[10px] font-mono tracking-[0.4em] opacity-40 uppercase">MUSEUM PIECES</div>
                            </div>
                            <div className="space-y-4">
                                <div className="text-4xl md:text-5xl font-thin font-mono">{data.community.journal}</div>
                                <div className="text-[10px] font-mono tracking-[0.4em] opacity-40 uppercase">JOURNAL POSTS</div>
                            </div>
                        </div>

                        <CommunityGrowthChart data={data} />
                    </section>

                    {/* 3. CORE DEVELOPMENT METRICS - Priority #3 */}
                    <section className="border-t border-black pt-16 space-y-16">
                        <div className="flex flex-col md:flex-row justify-between items-baseline mb-12">
                            <h2 className="text-4xl md:text-6xl font-thin tracking-tight uppercase">
                                DEVELOPMENT <br className="hidden md:block" />ACTIVITY
                            </h2>
                            <p className="font-mono text-[10px] tracking-[0.3em] opacity-40 mt-4 md:mt-0">
                                GITHUB SYSTEM LOGS
                            </p>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 text-center border-b border-black/10 pb-16">
                            <div className="space-y-2">
                                <div className="text-3xl md:text-6xl font-extralight font-mono leading-none tracking-tighter">
                                    {totalCommits}
                                </div>
                                <div className="text-[10px] tracking-[0.4em] opacity-40">COMMITS</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-3xl md:text-6xl font-extralight font-mono leading-none tracking-tighter">
                                    {currentLoc.toLocaleString()}
                                </div>
                                <div className="text-[10px] tracking-[0.4em] opacity-40">LINES OF CODE</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-3xl md:text-6xl font-extralight font-mono leading-none tracking-tighter">
                                    {totalPosts}
                                </div>
                                <div className="text-[10px] tracking-[0.4em] opacity-40">JOURNAL</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-3xl md:text-6xl font-extralight font-mono leading-none tracking-tighter">
                                    {data.daily.length}
                                </div>
                                <div className="text-[10px] tracking-[0.4em] opacity-40">DAYS ACTIVE</div>
                            </div>
                        </div>

                        <DevCharts data={data} />
                    </section>
                </div>
            </div>

            <div className="fixed inset-0 pointer-events-none opacity-[0.03] select-none z-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }} />
        </main>
    )
}
