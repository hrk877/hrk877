const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function generateStats() {
    console.log("Generating development stats cache...");
    
    let dailyStats = {};
    let hourlyActivity = new Array(24).fill(0);

    // 1. Git Metrics
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
                    dailyStats[currentDate] = { commits: 0, additions: 0, deletions: 0 };
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
        console.log("Git logs parsed successfully.");
    } catch (error) {
        console.error("Failed to fetch git log:", error.message);
    }

    // 2. Language Distribution
    const languages = {};
    try {
        const mapping = {
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.css': 'CSS',
            '.scss': 'CSS',
            '.html': 'HTML'
        };

        const scanDir = (dir) => {
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
        console.log("Language distribution scanned.");
    } catch (error) {
        console.error("Failed to scan languages:", error.message);
    }

    const result = {
        dailyStats,
        hourlyActivity,
        languages,
        lastUpdated: new Date().toISOString()
    };

    const outputPath = path.join(process.cwd(), 'app/data/stats-cache.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`Cache saved to ${outputPath}`);
}

generateStats();
