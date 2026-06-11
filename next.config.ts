import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // kuromojiの辞書ファイル(.dat.gz)はfsで動的に読まれるため、
  // Vercelのファイルトレーシングに明示的に含めないと本番で404になる
  outputFileTracingIncludes: {
    "/api/talk/phonemize": ["./node_modules/kuromoji/dict/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["10.230.50.110:3000", "localhost:3000"],
    },
  },
  // SEO向けHTTPセキュリティヘッダー（検索エンジンの信頼スコアを上げる）
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
};

export default nextConfig;
