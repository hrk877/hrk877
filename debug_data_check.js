
const fs = require('fs');

async function checkData() {
    try {
        // 1. AMeDAS
        const timeRes = await fetch("https://www.jma.go.jp/bosai/amedas/data/latest_time.txt");
        const isoTime = await timeRes.text();
        const timestamp = isoTime.substring(0, 19).replace(/[-:T]/g, "");
        const mapRes = await fetch(`https://www.jma.go.jp/bosai/amedas/data/map/${timestamp}.json`);
        const amedasData = await mapRes.json();
        const tokyoAmedas = amedasData["47662"];

        // 2. Forecast
        const forecastRes = await fetch("https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json");
        const forecastData = await forecastRes.json();
        const latest = forecastData[0];
        const tempSeries = latest.timeSeries.find(ts => ts.areas?.[0]?.temps);

        const debugOut = {
            amedas_tokyo: tokyoAmedas,
            forecast_temps: tempSeries
        };

        console.log(JSON.stringify(debugOut, null, 2));
    } catch (e) {
        console.error(e);
    }
}
checkData();
