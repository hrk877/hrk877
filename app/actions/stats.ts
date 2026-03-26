'use server';

import { execSync } from 'child_process';
import { collection, query, orderBy, getDocs, limit, doc, getDoc, where, Timestamp } from "firebase/firestore";
import { db, appId } from "@/lib/firebase";
import { getAllUserEmails } from "@/app/lib/users";
import { getGA4Stats } from "@/app/lib/analytics";
import fs from 'fs';
import path from 'path';

export async function getDevelopmentStats() {
    console.log("Starting getDevelopmentStats with appId:", appId);
    
    const dailyStats: Record<string, { commits: number; posts: number; additions: number; deletions: number }> = {};
    const hourlyActivity = new Array(24).fill(0);
    const languages: Record<string, number> = {};

    // 1. Get Detailed Git Metrics
    try {
        const gitLog = execSync('git log --numstat --format="%ad %H" --date=iso', { encoding: 'utf8' });
        const lines = gitLog.split('\n');
        
        let currentDate = "";
        lines.forEach(line => {
            if (!line.trim()) return;

            if (line.match(/^\d{4}-\d{2}-\d{2}/)) {
                const parts = line.split(' ');
                currentDate = parts[0];
                const time = parts[1];
                const hour = parseInt(time.split(':')[0]);
                hourlyActivity[hour] += 1;
                
                if (!dailyStats[currentDate]) {
                    dailyStats[currentDate] = { commits: 0, posts: 0, additions: 0, deletions: 0 };
                }
                dailyStats[currentDate].commits += 1;
            } else {
                const parts = line.split(/\s+/);
                if (parts.length >= 3) {
                    const adds = parseInt(parts[0]) || 0;
                    const dels = parseInt(parts[1]) || 0;
                    if (currentDate) {
                        dailyStats[currentDate].additions += adds;
                        dailyStats[currentDate].deletions += dels;
                    }
                }
            }
        });
    } catch (error) {
        console.error("Failed to fetch git log:", error);
    }

    // 2. Language Distribution
    try {
        const scanDir = (dir: string) => {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const fullPath = path.join(dir, file);
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    if (file !== 'node_modules' && file !== '.next' && file !== '.git') scanDir(fullPath);
                } else {
                    const ext = path.extname(file).toLowerCase();
                    if (ext) languages[ext] = (languages[ext] || 0) + stats.size;
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
    let userGrowth: { date: string, newUsers: number, total: number }[] = [];

    try {
        if (db) {
            // Journal Posts
            const postsRef = collection(db, "artifacts", appId, "public", "data", "posts");
            const postSnap = await getDocs(query(postsRef, orderBy("createdAt", "asc")));
            journalCount = postSnap.size;
            postSnap.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.createdAt) {
                    const date = data.createdAt.toDate().toISOString().substring(0, 10);
                    if (!dailyStats[date]) {
                        dailyStats[date] = { commits: 0, posts: 0, additions: 0, deletions: 0 };
                    }
                    dailyStats[date].posts += 1;
                }
            });

            // Community & Interactions
            // 1. Bananas
            const bananasRef = collection(db, "artifacts", appId, "public", "data", "banana_hand_posts");
            const bananaSnap = await getDocs(query(bananasRef, limit(200)));
            bananaCount = bananaSnap.size;

            // 2. AI Logs
            const aiLogsRef = collection(db, "artifacts", appId, "public", "data", "ai_logs");
            const aiLogSnap = await getDocs(query(aiLogsRef, limit(200)));
            aiLogCount = aiLogSnap.size;

            // 3. Museum
            const museumRef = collection(db, "artifacts", appId, "public", "data", "museum_artworks");
            const museumSnap = await getDocs(query(museumRef, limit(200)));
            museumCount = museumSnap.size;

            // 4. Users (Counter)
            const userCountSnap = await getDoc(doc(db, "counters", "user_count"));
            if (userCountSnap.exists()) {
                userCount = userCountSnap.data().count || 0;
            } else {
                const emails = await getAllUserEmails();
                userCount = emails.length;
            }

            // 5. Users Demographics and Growth
            const usersSnap = await getDocs(collection(db, "public_users"));
            const demographicsMap: Record<string, number> = {};
            const growthMap: Record<string, number> = {};



            usersSnap.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.country) {
                    demographicsMap[data.country] = (demographicsMap[data.country] || 0) + 1;
                }
                if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                    // Convert to JST (UTC+9) and group by month (YYYY-MM)
                    const jstDate = new Date(data.createdAt.toDate().getTime() + 9 * 60 * 60 * 1000);
                    const monthKey = jstDate.toISOString().substring(0, 7);
                    growthMap[monthKey] = (growthMap[monthKey] || 0) + 1;
                }
            });

            demographics = Object.entries(demographicsMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);
            
            // Fill in missing months between min and max
            const sortedMonthKeys = Object.keys(growthMap).sort();
            if (sortedMonthKeys.length > 0) {
                const minMonth = sortedMonthKeys[0];
                const maxMonth = sortedMonthKeys[sortedMonthKeys.length - 1];
                
                let current = new Date(minMonth + "-01");
                const last = new Date(maxMonth + "-01");
                
                while (current <= last) {
                    const key = current.toISOString().substring(0, 7);
                    if (!growthMap[key]) growthMap[key] = 0;
                    // Move to next month
                    current.setMonth(current.getMonth() + 1);
                }
            }

            let cumulativeUsers = 0;
            userGrowth = Object.keys(growthMap)
                .sort()
                .map((monthKey) => {
                    const newUsers = growthMap[monthKey];
                    cumulativeUsers += newUsers;
                    return { 
                        date: monthKey.substring(2).replace('-', '/'), // YY/MM format
                        newUsers, 
                        total: cumulativeUsers 
                    };
                });
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
        cumulativeLoc += (d.additions - d.deletions);
        return { date: d.date, commits: cumulativeCommits, loc: cumulativeLoc };
    });

    const langChartData = Object.entries(languages)
        .map(([ext, size]) => ({ name: ext.replace('.', '').toUpperCase(), value: size }))
        .sort((a, b) => b.value - a.value);

    // Engagement = (Bananas + AI Logs + Journal) / Users (if available)
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
            demographics,
            userGrowth
        },
        traffic
    };
}
