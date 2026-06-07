import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/providers/AuthProvider";
import GlobalStyles from "./components/ui/GlobalStyles";
import { GoogleAnalytics } from '@next/third-parties/google'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://877hand.vercel.app"

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "877hand｜Banana Hand",
    template: "%s | 877hand",
  },
  description:
    "BANANAHAND（バナナハンド）こと877handは、フィリピンのバナナ農家とつながるクリエイティブブランド。バナナ素材のプロダクト・ミュージアム・AIなど、バナナの新たな可能性を体験できます。",
  keywords: [
    "BANANAHAND",
    "バナナハンド",
    "banana hand",
    "877hand",
    "バナナ ブランド",
    "banana brand",
    "バナナ クリエイティブ",
    "バナナ プロダクト",
    "フィリピン バナナ",
    "バナナペーパー",
    "Bananatex",
    "バナナ ミュージアム",
    "877",
    "hrk877",
  ],
  authors: [{ name: "877hand" }],
  creator: "877hand",
  publisher: "877hand",
  category: "creative brand",

  alternates: {
    canonical: BASE_URL,
  },

  verification: {
    google: "X6UWVQfbAQAaVvacVXVXUs9C87v60eB8kr1YSoTLAtE",
  },

  openGraph: {
    title: "877hand｜Banana Hand",
    description:
      "BANANAHAND（バナナハンド）こと877handは、フィリピンのバナナ農家とつながるクリエイティブブランド。バナナ素材・ミュージアム・AIなど新たな体験を。",
    url: BASE_URL,
    siteName: "877hand｜Banana Hand",
    images: [
      {
        url: "/ogp-image.png",
        width: 1200,
        height: 630,
        alt: "877hand — BANANAHAND バナナのクリエイティブブランド",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "877hand｜Banana Hand",
    description:
      "BANANAHAND（バナナハンド）こと877hand。フィリピンのバナナ農家とつながるクリエイティブブランド。",
    images: ["/ogp-image.png"],
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "877hand",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#FAC800",
}

// JSON-LD 構造化データ
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "877hand",
  alternateName: ["BANANAHAND", "バナナハンド", "banana hand"],
  url: BASE_URL,
  logo: `${BASE_URL}/ogp-image.png`,
  image: `${BASE_URL}/ogp-image.png`,
  description:
    "フィリピンのバナナ農家とつながるクリエイティブブランド。バナナ素材のプロダクト・ミュージアム・AIなど、バナナの新たな可能性を体験できます。",
  foundingDate: "2024",
  sameAs: ["https://www.instagram.com/877hand/"],
}

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "877hand | BANANAHAND",
  alternateName: ["BANANAHAND", "バナナハンド"],
  url: BASE_URL,
  description:
    "BANANAHAND（バナナハンド）こと877hand — フィリピンのバナナ農家とつながるクリエイティブブランド",
  inLanguage: "ja",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/journal?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* JSON-LD 構造化データ — Next.js推奨: bodyに置く */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <AuthProvider>
          <GlobalStyles />
          {children}
        </AuthProvider>
        <GoogleAnalytics gaId="G-0MVZWEGNWC" />
      </body>
    </html>
  );
}
