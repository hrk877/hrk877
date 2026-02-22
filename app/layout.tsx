import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/providers/AuthProvider";
import GlobalStyles from "./components/ui/GlobalStyles";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// メタデータをここに集約します
export const metadata: Metadata = {
  title: "877hand | バナナハンド",
  description: "バナナの力で世界を曲げるクリエイティブスペース『877hand（バナナハンド）』。ミュージアム、AI対話、手紙など、バナナの新たな可能性を体験してください。",
  keywords: ["877hand", "バナナハンド", "banana hand", "バナナ", "banana", "creative space", "AI", "museum", "877"],
  verification: {
    google: "X6UWVQfbAQAaVvacVXVXUs9C87v60eB8kr1YSoTLAtE",
  },
  // ★★★ 本番環境のURLをここに設定してください（例: https://877hand.vercel.app）
  metadataBase: new URL("https://877hand.vercel.app"),

  // OGP (Open Graph Protocol) と Twitterカードの設定
  openGraph: {
    title: "877hand | バナナハンド",
    description: "バナナの力で世界を曲げるクリエイティブスペース『877hand（バナナハンド）』。",
    url: "/",
    siteName: "877hand",
    images: [
      {
        url: "/ogp-image.png", // public/ogp-image.png
        width: 1200,
        height: 630,
        alt: "877hand",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "877hand | バナナハンド",
    description: "バナナの力で世界を曲げるクリエイティブスペース『877hand（バナナハンド）』。",
    images: ["/ogp-image.png"], // public/ogp-image.png
  },

  // アイコンとマニフェストの設定
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
  manifest: "/manifest.json",

  // iOS Safari用の設定
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "877hand",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAC800",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // <head>タグはNext.jsが自動生成するため削除します
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <GlobalStyles />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
