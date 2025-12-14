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
  title: "hrk.877",
  description: "A creative space bending the world with the power of bananas. Explore the museum, chat with Banana AI, and send a letter.",
  // ★★★ 本番環境のURLをここに設定してください（例: https://hrk877.vercel.app）
  metadataBase: new URL("https://hrk877.vercel.app"),

  // OGP (Open Graph Protocol) と Twitterカードの設定
  openGraph: {
    title: "hrk.877",
    description: "A creative space bending the world with the power of bananas.",
    url: "/",
    siteName: "hrk.877",
    images: [
      {
        url: "/ogp-image.png", // public/ogp-image.png
        width: 1200,
        height: 630,
        alt: "hrk.877",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "hrk.877",
    description: "A creative space bending the world with the power of bananas.",
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
    title: "hrk.877",
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
