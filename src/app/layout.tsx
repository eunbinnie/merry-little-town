import type { Metadata, Viewport } from "next";
import { Gowun_Batang, Pixelify_Sans } from "next/font/google";
import { COPY } from "@/constants/copy";
import "./globals.css";

// Korean glyphs come from unicode-range chunks fetched on demand; only latin is preloaded.
const gowun = Gowun_Batang({
  variable: "--font-gowun",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

const pixelify = Pixelify_Sans({
  variable: "--font-pixelify",
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: COPY.meta.title,
  description: COPY.meta.description,
  openGraph: {
    title: COPY.meta.title,
    description: COPY.meta.description,
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: COPY.meta.title,
    description: COPY.meta.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a101d",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${gowun.variable} ${pixelify.variable}`}>
      <body>{children}</body>
    </html>
  );
}
