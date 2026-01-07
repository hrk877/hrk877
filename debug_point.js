
const fs = require('fs');

async function checkPointData() {
    try {
        const timeRes = await fetch("https://www.jma.go.jp/bosai/amedas/data/latest_time.txt");
        const isoTime = await timeRes.text();
        const date = new Date(isoTime);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}${mm}${dd}`;

        const url = `https://www.jma.go.jp/bosai/amedas/data/point/47662/${dateStr}_temp.json`;
        console.log(`Fetching: ${url}`);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

        const data = await res.json();
        // format: { "20240106000000": [temp, type, error], ... }
        console.log("Keys count:", Object.keys(data).length);

        const temps = Object.values(data).map(v => v[0]);
        const min = Math.min(...temps);
        const max = Math.max(...temps);

        console.log(`Calculated Min: ${min}`);
        console.log(`Calculated Max: ${max}`);

    } catch (e) {
        console.error(e);
    }
}
checkPointData();
