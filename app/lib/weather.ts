export interface WeatherForecast {
    date: string;
    label: string;
    weather: string;
    tempMin: string;
    tempMax: string;
    rainChance: string;
    isRaining: boolean; // Forecast based
    currentTemp?: string; // Real-time
    isRainingNow?: boolean; // Real-time
}

async function fetchAmedasHistory(dateStr: string) {
    // dateStr: YYYYMMDD
    try {
        // Tokyo Kitanomaru: 47662
        const url = `https://www.jma.go.jp/bosai/amedas/data/point/47662/${dateStr}_temp.json`;
        const res = await fetch(url, { next: { revalidate: 300 } }); // Cache for 5 mins
        if (!res.ok) return null;

        const data = await res.json();
        // data: { "20240106000000": [temp, flag, flag], ... }

        const temps: number[] = [];
        Object.values(data).forEach((v: any) => {
            if (typeof v[0] === 'number') temps.push(v[0]);
        });

        if (temps.length === 0) return null;

        return {
            min: Math.min(...temps),
            max: Math.max(...temps)
        };
    } catch (e) {
        console.error("AMeDAS History fetch failed", e);
        return null; // Fail gracefully
    }
}

async function fetchAmedasData() {
    try {
        const timeRes = await fetch("https://www.jma.go.jp/bosai/amedas/data/latest_time.txt", { next: { revalidate: 60 } });
        if (!timeRes.ok) return null;
        const isoTime = await timeRes.text();
        const timestamp = isoTime.substring(0, 19).replace(/[-:T]/g, "");

        const mapRes = await fetch(`https://www.jma.go.jp/bosai/amedas/data/map/${timestamp}.json`, { next: { revalidate: 60 } });
        if (!mapRes.ok) return null;
        const data = await mapRes.json();

        const station = data["47662"] || data["44132"];

        // Format Date for History
        // Use the date from the timestamp (server time) to ensure we get "Today's" history relative to JMA
        // timestamp: YYYYMMDDHHmmss
        const dateStr = timestamp.substring(0, 8);
        const history = await fetchAmedasHistory(dateStr);

        if (station) {
            return {
                temp: station.temp ? station.temp[0] : null,
                precipitation: station.precipitation10m ? station.precipitation10m[0] : 0,
                history // Pass history up
            };
        }
        return null;
    } catch (error) {
        console.error("AMeDAS fetch failed:", error);
        return null;
    }
}

export async function fetchWeatherForecast(): Promise<WeatherForecast | null> {
    try {
        const [forecastRes, amedasData] = await Promise.all([
            fetch("https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json", { next: { revalidate: 3600 } }),
            fetchAmedasData()
        ]);

        // ... (Forecast Parsing Logic stays for Weather Text & Rain Chance)
        if (!forecastRes.ok) throw new Error("Weather forecast fetch failed");
        const data = await forecastRes.json();
        const latest = data[0];
        const weekly = data[1]; // Weekly - used? maybe not needed if AMeDAS works.

        const getArea = (ts: any) => ts.areas.find((a: any) => a.area.code === "130010") || ts.areas[0];

        const now = new Date();
        const jstOffset = 9 * 60 * 60 * 1000;
        const jstDate = new Date(now.getTime() + jstOffset);
        const todayStr = jstDate.toISOString().split("T")[0];

        let weather = "-";
        let rain = "-";

        // 1. Weather Text
        const weatherSeries = latest.timeSeries.find((ts: any) => ts.areas?.[0]?.weathers);
        if (weatherSeries) {
            const area = getArea(weatherSeries);
            if (area?.weathers) {
                let idx = weatherSeries.timeDefines.findIndex((t: string) => t.startsWith(todayStr));
                if (idx === -1) idx = 0;
                if (area.weathers[idx]) weather = area.weathers[idx];
            }
        }

        // 2. Rain Chance
        const popSeries = latest.timeSeries.find((ts: any) => ts.areas?.[0]?.pops);
        if (popSeries) {
            const area = getArea(popSeries);
            if (area?.pops) {
                const indices = popSeries.timeDefines
                    .map((t: string, i: number) => t.startsWith(todayStr) ? i : -1)
                    .filter((i: number) => i !== -1);

                if (indices.length > 0) {
                    const pops = indices.map((i: number) => parseInt(area.pops[i] || "0"));
                    const maxPop = Math.max(...pops);
                    rain = `${maxPop}%`;
                } else if (area.pops.length > 0) {
                    rain = `${area.pops[0]}%`;
                }
            }
        }

        // 3. Temps - Revert to Forecast with Smart Fallback (History file unavailable)
        let min = "-";
        let max = "-";
        const tempSeries = latest.timeSeries.find((ts: any) => ts.areas?.[0]?.temps);
        if (tempSeries) {
            const area = getArea(tempSeries);
            if (area?.temps) {
                const indices = tempSeries.timeDefines
                    .map((t: string, i: number) => t.startsWith(todayStr) ? i : -1)
                    .filter((i: number) => i !== -1);

                if (indices.length > 0) {
                    const temps = indices.map((i: number) => parseFloat(area.temps[i]));
                    if (temps.length === 1) {
                        max = temps[0].toString();
                    } else if (temps.length >= 2) {
                        const sorted = [...temps].sort((a, b) => a - b);
                        min = sorted[0].toString();
                        max = sorted[sorted.length - 1].toString();
                        if (min === max) min = "-";
                    }
                }
            }
        }

        // Smart Min Correction for missing data
        // If Min is missing ("-") and we have current temp, use it (rounded to integer)
        if (min === "-" && amedasData?.temp !== undefined && amedasData?.temp !== null) {
            const currentHour = new Date().getHours();
            // Assuming early morning checks
            if (currentHour < 12) { // Relaxed to noon to ensure coverage
                min = Math.round(amedasData.temp).toString();
            }
        }

        // Ensure Max is also valid if missing? (Less likely for JMA)
        // Ensure integers
        if (min !== "-") min = Math.round(parseFloat(min)).toString();
        if (max !== "-") max = Math.round(parseFloat(max)).toString();

        // Translation Map
        const weatherTranslation: { [key: string]: string } = {
            "晴れ": "SUNNY",
            "くもり": "CLOUDY",
            "雨": "RAIN",
            "雪": "SNOW",
            "晴時々くもり": "SUN / CLOUD",
            "晴のちくもり": "SUN > CLOUD",
            "晴時々雨": "SUN / RAIN",
            "晴のち雨": "SUN > RAIN",
            "くもり時々晴": "CLOUD / SUN",
            "くもりのち晴": "CLOUD > SUN",
            "くもり時々雨": "CLOUD / RAIN",
            "くもりのち雨": "CLOUD > RAIN",
            "雨時々くもり": "RAIN / CLOUD",
            "雨のちくもり": "RAIN > CLOUD",
            "雨時々晴": "RAIN / SUN",
            "雨のち晴": "RAIN > SUN",
            "大雨": "HEAVY RAIN",
            "暴風雨": "STORM",
            "雷雨": "THUNDERSTORM"
        };

        let englishWeather = weather;
        englishWeather = englishWeather.replace(/　/g, " ");
        for (const [jp, en] of Object.entries(weatherTranslation)) {
            if (englishWeather.includes(jp)) {
                englishWeather = en;
                break;
            }
        }

        const isRainingForecast = weather.includes("雨") || (parseInt(rain) >= 50);

        return {
            date: todayStr,
            label: "TODAY",
            weather: englishWeather,
            tempMin: min,
            tempMax: max,
            rainChance: rain,
            isRaining: isRainingForecast,
            currentTemp: amedasData?.temp !== null ? `${Math.round(amedasData!.temp)}` : undefined, // Round current temp too
            isRainingNow: amedasData ? (amedasData.precipitation > 0) : undefined
        };

    } catch (error) {
        console.error("Weather fetch failed:", error);
        return null;
    }
}
