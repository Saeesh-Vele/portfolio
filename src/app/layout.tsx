import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CanvasRoot } from "@/components/canvas/CanvasRoot";
import { Cursor } from "@/components/ui/Cursor";
import { DebugGate } from "@/components/ui/DebugGate";
import { Loader } from "@/components/ui/Loader";
import { Nav } from "@/components/ui/Nav";
import { SectionHud } from "@/components/ui/SectionHud";
import { SiteRuntime } from "@/components/ui/SiteRuntime";
import { a11y, contact, site } from "@/content/content";
import { LOADER_SESSION_KEY } from "@/lib/constants";
import { siteUrl } from "@/lib/siteUrl";
import { geistMono, geistSans, instrumentSerif } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: site.title,
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name, url: siteUrl }],
  alternates: { canonical: "/" },
  // og:image / twitter:image come from opengraph-image.tsx and twitter-image.tsx.
  openGraph: {
    title: site.title,
    description: site.description,
    url: "/",
    siteName: site.name,
    locale: "en_IN",
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
};

/** schema.org Person. No phone number, by rule. */
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  jobTitle: site.role,
  url: siteUrl,
  description: site.personDescription,
  alumniOf: { "@type": "CollegeOrUniversity", name: site.college },
  address: {
    "@type": "PostalAddress",
    addressLocality: site.city,
    addressCountry: site.countryCode,
  },
  sameAs: [contact.linkedinHref, contact.githubHref],
};
// `<` escaped so the JSON can never close the script element.
const personJsonLdHtml = JSON.stringify(personJsonLd).replace(/</g, "\\u003c");

export const viewport: Viewport = {
  themeColor: "#07090C",
  colorScheme: "dark",
};

/**
 * Vercel Analytics + Speed Insights load their scripts from /_vercel/*, which only exists on
 * Vercel deployments (VERCEL=1 at build time). Elsewhere (`next start`) they would 404.
 */
const onVercel = process.env.VERCEL === "1";

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
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: prePaintScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: personJsonLdHtml }}
        />
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
        <SectionHud />
        <DebugGate />
        <Cursor />
        <div className="relative z-10">{children}</div>
        {onVercel ? (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        ) : null}
      </body>
    </html>
  );
}
