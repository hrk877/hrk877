import { BetaAnalyticsDataClient } from '@google-analytics/data';

const propertyId = process.env.GA_PROPERTY_ID;
const clientEmail = process.env.GA_CLIENT_EMAIL;
// Handle escaped newlines from .env.local string
const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n');

let analyticsClient: BetaAnalyticsDataClient | null = null;
if (clientEmail && privateKey) {
    analyticsClient = new BetaAnalyticsDataClient({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
    });
}

export interface GA4Stats {
    activeUsers30d: number;
    pageViews30d: number;
    avgEngagementSeconds: number;
    realtimeUsers: number;
    dailyPageViews: { date: string; views: number }[];
    topPages: { title: string; path: string; views: number }[];
    trafficSources: { source: string; sessions: number }[];
    devices: { category: string; sessions: number }[];
    topCountries: { country: string; users: number }[];
}

export async function getGA4Stats(): Promise<GA4Stats | null> {
    if (!analyticsClient || !propertyId) {
        console.warn("GA4 credentials missing or invalid.");
        return null;
    }

    try {
        // 1. Basic metrics (Last 30 Days)
        const [basicResponse] = await analyticsClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            metrics: [
                { name: 'activeUsers' },
                { name: 'screenPageViews' },
                { name: 'userEngagementDuration' },
                { name: 'sessions' }
            ],
        });

        const activeUsers30d = basicResponse.rows?.[0]?.metricValues?.[0]?.value || '0';
        const pageViews30d = basicResponse.rows?.[0]?.metricValues?.[1]?.value || '0';
        const totalEngagement = parseFloat(basicResponse.rows?.[0]?.metricValues?.[2]?.value || '0');
        const totalSessions = parseInt(basicResponse.rows?.[0]?.metricValues?.[3]?.value || '1', 10);
        const avgEngagementSeconds = totalSessions > 0 ? (totalEngagement / totalSessions) : 0;

        // 2. Realtime Active Users (Last 30 Min)
        const [realtimeResponse] = await analyticsClient.runRealtimeReport({
            property: `properties/${propertyId}`,
            metrics: [{ name: 'activeUsers' }],
        }).catch(() => [null]); // Fallback if Realtime API isn't fully active yet
        
        const realtimeUsers = realtimeResponse?.rows?.[0]?.metricValues?.[0]?.value || '0';

        // 3. Traffic Sources
        const [sourcesResponse] = await analyticsClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            metrics: [{ name: 'sessions' }],
            orderBys: [{ desc: true, metric: { metricName: 'sessions' } }],
        });

        const trafficSources = sourcesResponse.rows?.map(row => ({
            source: row.dimensionValues?.[0]?.value || "Unknown",
            sessions: parseInt(row.metricValues?.[0]?.value || '0', 10)
        })) || [];

        // 4. Device Categories
        const [devicesResponse] = await analyticsClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [{ name: 'deviceCategory' }],
            metrics: [{ name: 'sessions' }],
            orderBys: [{ desc: true, metric: { metricName: 'sessions' } }],
        });

        const devices = devicesResponse.rows?.map(row => ({
            category: row.dimensionValues?.[0]?.value || "Unknown",
            sessions: parseInt(row.metricValues?.[0]?.value || '0', 10)
        })) || [];

        // 5. Geographic Locations
        const [countriesResponse] = await analyticsClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [{ name: 'country' }],
            metrics: [{ name: 'activeUsers' }],
            orderBys: [{ desc: true, metric: { metricName: 'activeUsers' } }],
            limit: 5,
        });

        const topCountries = countriesResponse.rows?.map(row => ({
            country: row.dimensionValues?.[0]?.value || "Unknown",
            users: parseInt(row.metricValues?.[0]?.value || '0', 10)
        })) || [];

        // 6. Daily Pageviews (Last 30 Days)
        const [dailyResponse] = await analyticsClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [{ name: 'date' }],
            metrics: [{ name: 'screenPageViews' }],
            orderBys: [{ desc: false, dimension: { dimensionName: 'date' } }]
        });

        const dailyPageViews = dailyResponse.rows?.map(row => {
            const dateStr = row.dimensionValues?.[0].value || "";
            const formattedDate = dateStr.length === 8 
                ? `${dateStr.substring(4,6)}/${dateStr.substring(6,8)}` 
                : dateStr;
            const views = parseInt(row.metricValues?.[0]?.value || '0', 10);
            return { date: formattedDate, views };
        }) || [];

        // 7. Top Pages (Last 30 Days)
        const [pagesResponse] = await analyticsClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [
                { name: 'pageTitle' },
                { name: 'pagePath' }
            ],
            metrics: [{ name: 'screenPageViews' }],
            orderBys: [{ desc: true, metric: { metricName: 'screenPageViews' } }],
            limit: 5,
        });

        const topPages = pagesResponse.rows?.map(row => ({
            title: row.dimensionValues?.[0]?.value || "Unknown",
            path: row.dimensionValues?.[1]?.value || "/",
            views: parseInt(row.metricValues?.[0]?.value || '0', 10)
        })) || [];

        return {
            activeUsers30d: parseInt(activeUsers30d, 10),
            pageViews30d: parseInt(pageViews30d, 10),
            avgEngagementSeconds,
            realtimeUsers: parseInt(realtimeUsers, 10),
            dailyPageViews,
            topPages,
            trafficSources,
            devices,
            topCountries
        };
    } catch (error) {
        console.error("Failed to fetch GA4 stats:", error);
        return null;
    }
}
