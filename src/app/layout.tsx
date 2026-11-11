import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import { CanvasRoot } from "@/components/canvas/CanvasRoot";
import { Loader } from "@/components/ui/Loader";
import { Nav } from "@/components/ui/Nav";
import { SiteRuntime } from "@/components/ui/SiteRuntime";
import { a11y, site } from "@/content/content";
import { LOADER_SESSION_KEY } from "@/lib/constants";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: site.title,
  description: site.description,
  openGraph: {
    title: site.title,
    description: site.description,
    type: "website",
    // TODO(saeesh): add an OG image (see content.ts → site.ogImage).
    images: site.ogImage ? [site.ogImage] : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#07090C",
  colorScheme: "dark",
};

/**
 * Runs before first paint. On repeat visits in the same session (or with reduced motion) the
 * loader is skipped and text reveals start immediately, without waiting for hydration.
 */
const prePaintScript = `try{if(sessionStorage.getItem(${JSON.stringify(
  LOADER_SESSION_KEY,
)})==="1"||matchMedia("(prefers-reduced-motion: reduce)").matches){var d=document.documentElement;d.dataset.loader="skip";d.dataset.loaded="true"}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable} antialiased`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: prePaintScript }} />
        <noscript>
          <style>{`.reveal-line>span{transform:none!important}.fade-in{opacity:1!important}.loader{display:none!important}`}</style>
        </noscript>
        <a
          href="#main"
          className="label sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-bg focus:px-3 focus:py-2 focus:text-text"
        >
          {a11y.skipToContent}
        </a>
        <CanvasRoot />
        <SiteRuntime />
        <Loader />
        <Nav />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
