import { MetadataRoute } from 'next'

const BASE_URL = 'https://877hand.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date()

    return [
        // トップページ — 最高優先度
        {
            url: BASE_URL,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        // 主要コンテンツページ
        {
            url: `${BASE_URL}/museum`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/journal`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/ai`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/letter`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/shop`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        // LABコンテンツ
        {
            url: `${BASE_URL}/camera`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/spin`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/moon`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.4,
        },
        {
            url: `${BASE_URL}/finger`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.4,
        },
    ]
}
