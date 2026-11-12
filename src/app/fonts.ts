import localFont from "next/font/local";
import { Instrument_Serif } from "next/font/google";

/*
 * All three faces appear above the fold (hero, loader, nav, HUD), so all three are
 * preloaded; nothing else is. Geist and Geist Mono are the `geist` package's variable fonts
 * subset to the characters the site uses (scripts/subset-fonts.sh): ~33 KB each instead of
 * ~70 KB. Instrument Serif is the Google latin subset. All swap: text paints immediately.
 */

export const geistSans = localFont({
  src: "./fonts/Geist-Variable.subset.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  preload: true,
});

export const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.subset.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "Roboto Mono",
    "Menlo",
    "Monaco",
    "Liberation Mono",
    "DejaVu Sans Mono",
    "Courier New",
    "monospace",
  ],
});

export const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
  preload: true,
});
