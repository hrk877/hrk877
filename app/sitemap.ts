import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://877hand.vercel.app'

    // 主な固定ページ
    const routes = [
        '',
        '/museum',
        '/ai',
        '/journal',
        '/letter',
        '/habit',
        '/camera',
        '/shop',
        '/training',
        '/spin',
        '/moon',
        '/finger',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }))

    return routes
}
