// Removed 'use server' since this is only called on the server.

import { execSync } from 'child_process';
import { collection, query, orderBy, getDocs, limit, doc, getDoc, where, Timestamp } from "firebase/firestore";
import { db, appId } from "@/lib/firebase";
import { adminDb } from "@/lib/firebase-admin";
import { getAllUserEmails, EXCLUDED_EMAILS } from "@/app/lib/users";
import { getGA4Stats } from "@/app/lib/analytics";
import fs from 'fs';
import path from 'path';

export async function getDevelopmentStats() {
    
    let dailyStats: Record<string, { commits: number; posts: number; additions: number; deletions: number }> = {};
    let hourlyActivity = new Array(24).fill(0);
    let languages: Record<string, number> = {};

    // Load static cache fallback if available
    let cache: any = null;
    try {
        const cachePath = path.join(process.cwd(), 'app/data/stats-cache.json');
        if (fs.existsSync(cachePath)) {
            cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            dailyStats = { ...cache.dailyStats };
            hourlyActivity = [...cache.hourlyActivity];
            languages = { ...cache.languages };
            console.log("Stats: Loaded static cache from app/data/stats-cache.json");
        }
    } catch (e) {
        console.warn("Stats: Failed to load static cache:", e);
    }


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
        console.error("Failed to fetch recent git log (using cache if available):", error);
    }

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
        console.error("Failed to scan languages (using cache if available):", error);
    }

    // 3. Parallel Data Fetching (Firebase & GA4)
    let userCount = 0;
    let bananaCount = 0;
    let aiLogCount = 0;
    let journalCount = 0;
    let museumCount = 0;
    let demographics: { name: string, value: number }[] = [];
    let traffic: any = null;
    let postDocs: any[] = [];

    try {
        if (db) {
            const postsRef = collection(db, "artifacts", appId, "public", "data", "posts");
            const bananasRef = collection(db, "artifacts", appId, "public", "data", "banana_hand_posts");
            const aiLogsRef = collection(db, "artifacts", appId, "public", "data", "ai_logs");
            const museumRef = collection(db, "artifacts", appId, "public", "data", "museum_artworks");
            const userCountRef = doc(db, "counters", "user_count");

            const [
                postSnap,
                bananaSnap,
                aiLogSnap,
                museumSnap,
                userCountSnap,
                ga4Stats
            ] = await Promise.all([
                getDocs(query(postsRef, orderBy("createdAt", "asc"))),
                getDocs(query(bananasRef, limit(200))),
                getDocs(query(aiLogsRef, limit(200))),
                getDocs(query(museumRef, limit(200))),
                getDoc(userCountRef),
                getGA4Stats()
            ]);

            // Process Post Data
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

            bananaCount = bananaSnap.size;
            aiLogCount = aiLogSnap.size;
            museumCount = museumSnap.size;
            traffic = ga4Stats;

            if (userCountSnap.exists()) {
                userCount = userCountSnap.data().count || 0;
            } else if (adminDb) {
                // Fetch all users with emails using Admin SDK to bypass Firestore rules
                const usersSnapshot = await adminDb.collection("users").get();
                const emails: string[] = [];
                const EXCLUDED_EMAILS = ["miso.blye17@gmail.com"];

                usersSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.email && !data.isAnonymous && !EXCLUDED_EMAILS.includes(data.email)) {
                        emails.push(data.email);
                    }
                });

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
        console.error("Data fetch error in parallel:", error);
    }

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

    // User growth proxy (using journal posts for now as we don't have user creation dates in sortedDaily)
    let cumulativeUsers = 0;
    const userGrowthData = sortedDaily.map(d => {
        cumulativeUsers += d.posts; // Not accurate for "users", but good for activity growth
        return { date: d.date, total: cumulativeUsers, newUsers: d.posts };
    });

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
            userGrowth: userGrowthData
        },
        traffic
    };
}
