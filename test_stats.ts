import { getDevelopmentStats } from "./app/actions/stats";
getDevelopmentStats().then(stats => {
    console.log("Total Days with Activity:", stats.daily.length);
    console.log("Total Commits calculated:", stats.growth[stats.growth.length-1].commits);
    console.log("Stats summary:", JSON.stringify({
        dailyCount: stats.daily.length,
        totalCommits: stats.growth[stats.growth.length-1].commits,
        growthSample: stats.growth.slice(-5)
    }, null, 2));
}).catch(console.error);
