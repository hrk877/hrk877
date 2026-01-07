
const fs = require('fs');

async function debugHistory() {
    try {
        // Mocking the flow in weather.ts
        const timeRes = await fetch("https://www.jma.go.jp/bosai/amedas/data/latest_time.txt");
        const isoTime = await timeRes.text();
        const timestamp = isoTime.substring(0, 19).replace(/[-:T]/g, "");
        const dateStr = timestamp.substring(0, 8); // YYYYMMDD

        console.log(`Target Date: ${dateStr}`);
        const url = `https://www.jma.go.jp/bosai/amedas/data/point/47662/${dateStr}_temp.json`;
        console.log(`Fetching: ${url}`);

        const res = await fetch(url);
        if (!res.ok) {
            console.error(`Fetch Failed: ${res.status}`);
            return;
        }

        const data = await res.json();
        console.log(`Data keys: ${Object.keys(data).length}`);

        const temps = [];
        Object.values(data).forEach(v => {
            if (typeof v[0] === 'number') temps.push(v[0]);
        });

        if (temps.length > 0) {
            console.log(`Min: ${Math.min(...temps)}`);
            console.log(`Max: ${Math.max(...temps)}`);
        } else {
            console.log("No valid temps found");
        }

    } catch (e) {
        console.error(e);
    }
}
debugHistory();
