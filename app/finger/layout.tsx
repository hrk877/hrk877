import type { Metadata } from "next"

const BASE_URL = "https://877hand.vercel.app"

export const metadata: Metadata = {
  title: {
    absolute: "877hand｜Banana Hand",
  },
  description:
    "877fingerは、877handの中で言葉をバナナに託して共有するインタラクティブコンテンツです。",
  keywords: ["877finger", "877 finger", "877FINGER", "877hand"],
  alternates: {
    canonical: `${BASE_URL}/finger`,
  },
}

const fingerPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${BASE_URL}/finger#webpage`,
  url: `${BASE_URL}/finger`,
  name: "877finger",
  description:
    "877handの中で言葉をバナナに託して共有するインタラクティブコンテンツ。",
  isPartOf: {
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    url: BASE_URL,
    name: "877hand",
  },
  inLanguage: "ja",
}

export default function FingerLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(fingerPageSchema) }}
      />
      {children}
    </>
  )
}
