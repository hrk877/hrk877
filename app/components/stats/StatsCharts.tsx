"use client"

import { useState, useEffect } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
} from "recharts"

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return isMobile;
}

function useMounted() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return mounted;
}

const COLORS = ['#000000', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)'];

interface StatsData {
    daily: any[]
    growth: any[]
    hourly: any[]
    languages: any[]
    community: {
        demographics: any[]
        userGrowth: any[]
        [key: string]: any
    }
    traffic?: {
        activeUsers30d: number;
        pageViews30d: number;
        avgEngagementSeconds: number;
        realtimeUsers: number;
        dailyPageViews: { date: string; views: number }[];
        topPages: { title: string; path: string; views: number }[];
        trafficSources: { source: string; sessions: number }[];
        devices: { category: string; sessions: number }[];
        topCountries: { country: string; users: number }[];
    } | null;
}

// 1. GA4 Traffic Dashboard
export function TrafficDashboard({ data }: { data: StatsData }) {
    const isMobile = useIsMobile();
    const mounted = useMounted();
    
    if (!data.traffic || data.traffic.dailyPageViews.length === 0) return null;

    return (
        <div className="space-y-12">
            <h3 className="font-mono text-xs md:text-[10px] tracking-[0.4em] opacity-40 uppercase text-center mb-8">
                SITE TRAFFIC (GA4)
            </h3>
            
            {/* Dense Header Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                <div className="border border-black p-4 bg-black text-[#FAC800]">
                    <div className="font-mono text-[9px] tracking-[0.3em] opacity-60 mb-2">REALTIME USERS</div>
                    <div className="text-3xl font-mono">{data.traffic.realtimeUsers}</div>
                </div>
                <div className="border border-black/10 p-4 bg-black/5">
                    <div className="font-mono text-[9px] tracking-[0.3em] opacity-40 mb-2">AVG ENGAGEMENT</div>
                    <div className="text-3xl font-mono">{formatTime(data.traffic.avgEngagementSeconds)}</div>
                </div>
                <div className="border border-black/10 p-4 bg-black/5">
                    <div className="font-mono text-[9px] tracking-[0.3em] opacity-40 mb-2">30D ACTIVE USERS</div>
                    <div className="text-3xl font-mono">{data.traffic.activeUsers30d.toLocaleString()}</div>
                </div>
                <div className="border border-black/10 p-4 bg-black/5">
                    <div className="font-mono text-[9px] tracking-[0.3em] opacity-40 mb-2">TOTAL PAGEVIEWS</div>
                    <div className="text-3xl font-mono">{data.traffic.pageViews30d.toLocaleString()}</div>
                </div>
            </div>

            {/* Chart & Tables Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                
                {/* Left: Main Chart (Span 8) */}
                <div className="md:col-span-8 bg-black/5 p-4 md:p-6 border border-black/10 flex flex-col items-center">
                    <h4 className="font-mono text-[10px] tracking-[0.2em] opacity-50 uppercase mb-6 self-start">TRAFFIC TREND (30D)</h4>
                    <div className="h-[200px] md:h-[250px] w-full max-w-[calc(100vw-4rem)] md:max-w-none">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.traffic.dailyPageViews} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#000000" 
                                    fontSize={9} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickMargin={12}
                                    interval={mounted && isMobile ? 6 : 2}
                                />
                                <YAxis hide width={0} />
                                <Tooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} contentStyle={{ backgroundColor: "#FAC800", border: "1px solid #000000", borderRadius: "0", fontFamily: "monospace", fontSize: "12px" }} />
                                <Bar dataKey="views" name="PAGE VIEWS" fill="#000000" radius={[2, 2, 0, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right: Top Pages (Span 4) */}
                <div className="md:col-span-4 p-4 border border-black/10 bg-black/5">
                    <h4 className="font-mono text-[10px] tracking-[0.2em] opacity-50 uppercase mb-4 border-b border-black/10 pb-2">TOP ROUTES</h4>
                    <div className="space-y-3">
                        {data.traffic.topPages.map((page, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] md:text-xs font-mono">
                                <div className="truncate pr-2 border-l-2 border-black/20 pl-2">
                                    <span className="truncate block max-w-[150px] md:max-w-none" title={page.title}>{page.title || page.path}</span>
                                </div>
                                <div className="opacity-60">{page.views.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Tables */}
                <div className="md:col-span-4 p-4 border border-black/10 bg-black/5">
                    <h4 className="font-mono text-[10px] tracking-[0.2em] opacity-50 uppercase mb-4 border-b border-black/10 pb-2">TRAFFIC SOURCES</h4>
                    <div className="space-y-3">
                        {data.traffic.trafficSources.map((src, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] md:text-xs font-mono">
                                <span className="truncate max-w-[100px]">{src.source}</span>
                                <div className="w-16 h-1 bg-black/10 rounded-full mx-2 overflow-hidden flex-shrink-0">
                                    <div className="h-full bg-black/40" style={{ width: `${Math.max(5, (src.sessions / Math.max(...data.traffic!.trafficSources.map(s => s.sessions))) * 100)}%` }}></div>
                                </div>
                                <span className="opacity-60 w-8 text-right font-mono">{src.sessions}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-4 p-4 border border-black/10 bg-black/5">
                    <h4 className="font-mono text-[10px] tracking-[0.2em] opacity-50 uppercase mb-4 border-b border-black/10 pb-2">DEVICES</h4>
                    <div className="space-y-3">
                        {data.traffic.devices.map((dev, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] md:text-xs font-mono">
                                <span className="truncate uppercase">{dev.category}</span>
                                <div className="w-16 h-1 bg-black/10 rounded-full mx-2 overflow-hidden flex-shrink-0">
                                    <div className="h-full bg-black/40" style={{ width: `${Math.max(5, (dev.sessions / Math.max(...data.traffic!.devices.map(d => d.sessions))) * 100)}%` }}></div>
                                </div>
                                <span className="opacity-60 w-8 text-right font-mono">{dev.sessions}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-4 p-4 border border-black/10 bg-black/5">
                    <h4 className="font-mono text-[10px] tracking-[0.2em] opacity-50 uppercase mb-4 border-b border-black/10 pb-2">TOP REGIONS</h4>
                    <div className="space-y-3">
                        {data.traffic.topCountries.map((geo, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] md:text-xs font-mono">
                                <span className="truncate">{geo.country}</span>
                                <div className="w-16 h-1 bg-black/10 rounded-full mx-2 overflow-hidden flex-shrink-0">
                                    <div className="h-full bg-black/40" style={{ width: `${Math.max(5, (geo.users / Math.max(...data.traffic!.topCountries.map(g => g.users))) * 100)}%` }}></div>
                                </div>
                                <span className="opacity-60 w-8 text-right font-mono">{geo.users}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// 2. Community Growth Chart
export function CommunityGrowthChart({ data }: { data: StatsData }) {
    if (!data.community.userGrowth || data.community.userGrowth.length === 0) return null;

    return (
        <div className="space-y-6 pt-12 md:pt-16 border-t border-black/10 flex flex-col items-center">
            <h3 className="font-mono text-xs md:text-[10px] tracking-[0.4em] opacity-40 uppercase text-center mb-4">
                COMMUNITY GROWTH (USERS)
            </h3>
            <div className="h-[300px] md:h-[400px] w-full max-w-[calc(100vw-4rem)] md:max-w-none">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.community.userGrowth} margin={{ top: 20, right: 20, left: 20, bottom: 30 }}>
                        <defs>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#000000" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis 
                            dataKey="date" 
                            stroke="#000000" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false} 
                            padding={{ left: 10, right: 10 }} 
                            tickMargin={18} 
                        />
                        <YAxis hide width={0} />
                        <Tooltip cursor={{ strokeOpacity: 0.1 }} contentStyle={{ backgroundColor: "#FAC800", border: "1px solid #000000", borderRadius: "0px", fontFamily: "monospace", fontSize: "14px" }} />
                        <Area type="monotone" dataKey="total" name="TOTAL USERS" stroke="#000000" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2.5} />
                        <Area type="step" dataKey="newUsers" name="NEW USERS" stroke="rgba(0,0,0,0.3)" fill="none" strokeWidth={1.5} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

// 3. GitHub Developer Charts
export function DevCharts({ data }: { data: StatsData }) {
    const isMobile = useIsMobile();
    const mounted = useMounted();

    return (
        <div className="w-full h-full flex flex-col items-center py-4">
            <h3 className="font-mono text-[10px] tracking-[0.4em] opacity-40 uppercase text-center w-full mb-4">
                TECH STACK DISTRIBUTION
            </h3>
            
            <div className="flex-grow w-full relative min-h-0 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ bottom: 20 }}>
                        <Pie
                            data={data.languages}
                            cx="50%"
                            cy="45%"
                            innerRadius={isMobile ? 55 : 65}
                            outerRadius={isMobile ? 80 : 105}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.languages.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#FAC800",
                                border: "1px solid #000000",
                                borderRadius: "0px",
                                fontFamily: "monospace",
                                fontSize: "12px",
                                textTransform: "uppercase"
                            }}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            align="center"
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{
                                paddingTop: "10px",
                                fontFamily: "monospace",
                                fontSize: "11px",
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return "0s";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}
