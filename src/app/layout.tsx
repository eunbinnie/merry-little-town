import type { Metadata, Viewport } from "next";
import { Gowun_Batang, Nanum_Pen_Script, Pixelify_Sans } from "next/font/google";
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

// Handwriting for the Christmas card (SIL Open Font License 1.1). next/font
// downloads it at build time and serves it from this origin, so the card
// export canvas can use it without tainting.
const pen = Nanum_Pen_Script({
  variable: "--font-pen",
  weight: "400",
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
  // Android: the keyboard shrinks the layout, so the card editor stays above it
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // In-app browsers (KakaoTalk etc.) inject attributes on <html>/<body> before hydration.
    // suppressHydrationWarning only covers these two elements' own attributes, not children.
    <html
      lang="ko"
      className={`${gowun.variable} ${pixelify.variable} ${pen.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
