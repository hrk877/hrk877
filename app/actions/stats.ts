'use server';

import { execSync } from 'child_process';
import { collection, query, orderBy, getDocs, limit, doc, getDoc, where, Timestamp } from "firebase/firestore";
import { db, appId } from "@/lib/firebase";
import { getAllUserEmails, EXCLUDED_EMAILS } from "@/app/lib/users";
import { getGA4Stats } from "@/app/lib/analytics";
import fs from 'fs';
import path from 'path';

export async function getDevelopmentStats() {
    console.log("Starting getDevelopmentStats with appId:", appId);
    
    let dailyStats: Record<string, { commits: number; posts: number; additions: number; deletions: number }> = {};
    let hourlyActivity = new Array(24).fill(0);

    // 1. Get Recent Git Metrics from live log (Source of Truth for what's in repo)
    try {
        const gitLog = execSync('git log --numstat --format="%ad %H" --date=iso', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
        const lines = gitLog.split('\n');
        
        let currentDate = "";
        lines.forEach(line => {
            if (!line.trim()) return;

            if (line.match(/^\d{4}-\d{2}-\d{2}/)) {
                const parts = line.split(' ');
                currentDate = parts[0];
                const time = parts[1];
                
                if (!dailyStats[currentDate]) {
                    dailyStats[currentDate] = { commits: 0, posts: 0, additions: 0, deletions: 0 };
                }
                dailyStats[currentDate].commits += 1;

                if (time) {
                    const hour = parseInt(time.split(':')[0]);
                    hourlyActivity[hour] += 1;
                }
            } else {
                const parts = line.split(/\s+/);
                if (parts.length >= 3) {
                    const adds = parseInt(parts[0]) || 0;
                    const dels = parseInt(parts[1]) || 0;
                    if (currentDate && dailyStats[currentDate]) {
                        dailyStats[currentDate].additions += adds;
                        dailyStats[currentDate].deletions += dels;
                    }
                }
            }
        });
    } catch (error) {
        console.error("Failed to fetch recent git log:", error);
    }

    const languages: Record<string, number> = {};

    // 2. Language Distribution (Source Code only)
    try {
        const mapping: Record<string, string> = {
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.css': 'CSS',
            '.scss': 'CSS',
            '.html': 'HTML'
        };

        const scanDir = (dir: string) => {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const fullPath = path.join(dir, file);
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    if (file !== 'node_modules' && file !== '.next' && file !== '.git' && file !== 'public') scanDir(fullPath);
                } else {
                    const ext = path.extname(file).toLowerCase();
                    if (mapping[ext]) {
                        const lang = mapping[ext];
                        languages[lang] = (languages[lang] || 0) + stats.size;
                    }
                }
            });
        };
        scanDir(process.cwd());
    } catch (error) {
        console.error("Failed to scan languages:", error);
    }

    // 3. Firebase & Community Stats
    let userCount = 0;
    let bananaCount = 0;
    let aiLogCount = 0;
    let journalCount = 0;
    let museumCount = 0;
    let demographics: { name: string, value: number }[] = [];

    try {
        if (db) {
            // Journal Posts
            const postsRef = collection(db, "artifacts", appId, "public", "data", "posts");
            const postSnap = await getDocs(query(postsRef, orderBy("createdAt", "asc")));
            journalCount = postSnap.size;
            postSnap.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.createdAt) {
                    const jsDate = data.createdAt.toDate();
                    const date = jsDate.toISOString().substring(0, 10);
                    if (!dailyStats[date]) {
                        dailyStats[date] = { commits: 0, posts: 0, additions: 0, deletions: 0 };
                    }
                    dailyStats[date].posts += 1;
                }
            });

            // Community & Interactions
            const bananasRef = collection(db, "artifacts", appId, "public", "data", "banana_hand_posts");
            const bananaSnap = await getDocs(query(bananasRef, limit(200)));
            bananaCount = bananaSnap.size;

            const aiLogsRef = collection(db, "artifacts", appId, "public", "data", "ai_logs");
            const aiLogSnap = await getDocs(query(aiLogsRef, limit(200)));
            aiLogCount = aiLogSnap.size;

            const museumRef = collection(db, "artifacts", appId, "public", "data", "museum_artworks");
            const museumSnap = await getDocs(query(museumRef, limit(200)));
            museumCount = museumSnap.size;

            const emails = await getAllUserEmails();

            const userCountSnap = await getDoc(doc(db, "counters", "user_count"));
            if (userCountSnap.exists()) {
                userCount = userCountSnap.data().count || 0;
            } else {
                userCount = emails.length;
                const demographicsMap: Record<string, number> = {};
                emails.forEach(email => {
                    const domain = email.split('@')[1];
                    demographicsMap[domain] = (demographicsMap[domain] || 0) + 1;
                });
                demographics = Object.entries(demographicsMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value).slice(0, 5);
            }
        }
    } catch (error) {
        console.error("Firebase fetch error:", error);
    }

    // 6. Google Analytics Data
    const traffic = await getGA4Stats();

    // 4. Processing
    const sortedDaily = Object.entries(dailyStats)
        .map(([date, values]) => ({
            date,
            ...values,
            totalActivity: values.commits + values.posts
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    let cumulativeCommits = 0;
    let cumulativeLoc = 0;
    const growthData = sortedDaily.map(d => {
        cumulativeCommits += d.commits;
        // cumulativeLoc is additions - deletions, representing current state
        cumulativeLoc += (d.additions - d.deletions);
        return { date: d.date, commits: cumulativeCommits, loc: Math.max(0, cumulativeLoc) };
    });

    const langChartData = Object.entries(languages)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const engagementRatio = userCount > 0 ? ((bananaCount + aiLogCount + journalCount) / userCount).toFixed(1) : "0.0";

    return {
        daily: sortedDaily,
        growth: growthData,
        hourly: hourlyActivity.map((count, hour) => ({ hour: `${hour}:00`, count })),
        languages: langChartData.slice(0, 6),
        community: {
            users: userCount,
            bananas: bananaCount,
            aiLogs: aiLogCount,
            journal: journalCount,
            museum: museumCount,
            engagement: engagementRatio,
            totalArtifacts: bananaCount + aiLogCount + journalCount + museumCount,
            demographics
        },
        traffic
    };
}
