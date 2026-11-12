import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { hero, site } from "@/content/content";

/*
 * The share card (1200×630), rendered once at build time. A dot-matrix point cloud that is
 * raw noise on the left and settles into an ordered lattice on the right — the site's
 * "signal from noise" idea — under the name, role and tagline in the site's three faces.
 * Satori reads TTF/OTF/WOFF only, so it uses the `geist` package's static TTFs and a vendored
 * Instrument Serif italic (OFL, from google/fonts) instead of the site's subset woff2s.
 */

export const alt = site.ogAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#07090C";
const TEXT = "#E7E5E0";
const MUTED = "#8A8F98";
const GLACIER = "#8CCFDD";

// Literal paths, so file tracing stays scoped to these four files.
const fonts = Promise.all([
  readFile(join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf")),
  readFile(join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf")),
  readFile(join(process.cwd(), "node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.ttf")),
  readFile(join(process.cwd(), "src/app/og/InstrumentSerif-Italic.ttf")),
]);

/** Deterministic PRNG, so every build renders the same card. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The point cloud as one SVG: a 16px lattice, displaced by noise that fades out to the right. */
function pointCloud(width: number, height: number) {
  const random = mulberry32(50000);
  const spacing = 16;
  const circles: string[] = [];
  for (let y = spacing / 2; y < height; y += spacing) {
    for (let x = spacing / 2; x < width; x += spacing) {
      // 0 = raw noise, 1 = settled on the lattice.
      const order = smoothstep(width * 0.3, width * 0.82, x);
      const jitter = (1 - order) * spacing * 2.4;
      const px = x + (random() + random() - 1) * jitter;
      const py = y + (random() + random() - 1) * jitter;
      // Quieter behind the text block (bottom left), brighter where the lattice has formed.
      const behindText = 1 - smoothstep(width * 0.45, width * 0.72, px) * 0.85;
      const textBand = smoothstep(height * 0.38, height * 0.62, py) * behindText;
      const alpha = (0.16 + random() * 0.2 + order * 0.24) * (1 - textBand * 0.7);
      const lit = order > 0.85 && random() < 0.035;
      circles.push(
        lit
          ? `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="1.7" fill="${GLACIER}" fill-opacity="0.9"/>`
          : `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(0.9 + order * 0.35).toFixed(2)}" fill="${TEXT}" fill-opacity="${alpha.toFixed(3)}"/>`,
      );
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${circles.join("")}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export default async function Image() {
  const [semiBold, medium, mono, serif] = await fonts;
  const { width, height } = size;
  // The hero's tagline lines, run together on one line (a space where each line broke).
  const tagline = hero.taglineLines.flatMap((line, i) =>
    line.map((part, j) =>
      i < hero.taglineLines.length - 1 && j === line.length - 1
        ? { ...part, text: `${part.text} ` }
        : part,
    ),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          color: TEXT,
          padding: "56px 72px 64px",
          fontFamily: "Geist",
          position: "relative",
        }}
      >
        <img
          src={pointCloud(width, height)}
          width={width}
          height={height}
          alt=""
          style={{ position: "absolute", left: 0, top: 0 }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "Geist Mono",
            fontSize: 17,
            letterSpacing: 2,
            color: MUTED,
            textTransform: "uppercase",
          }}
        >
          <span>{hero.hud.topLeft}</span>
          <span>{hero.hud.bottomLeft}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontFamily: "Geist Mono",
              fontSize: 20,
              letterSpacing: 2.6,
              color: GLACIER,
              textTransform: "uppercase",
            }}
          >
            {site.role}
          </span>
          <span
            style={{
              marginTop: 18,
              fontSize: 132,
              fontWeight: 600,
              letterSpacing: -5.3,
              lineHeight: 1,
            }}
          >
            {site.name}
          </span>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 38,
              fontWeight: 500,
              letterSpacing: -0.8,
              color: MUTED,
            }}
          >
            {tagline.map((part) => (
              <span
                key={part.text}
                style={
                  part.emphasis
                    ? {
                        whiteSpace: "pre",
                        fontFamily: "Instrument Serif",
                        fontStyle: "italic",
                        fontWeight: 400,
                        fontSize: 44,
                        letterSpacing: -0.6,
                        color: TEXT,
                      }
                    : { whiteSpace: "pre" }
                }
              >
                {part.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: semiBold, weight: 600, style: "normal" },
        { name: "Geist", data: medium, weight: 500, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
        { name: "Instrument Serif", data: serif, weight: 400, style: "italic" },
      ],
    },
  );
}
