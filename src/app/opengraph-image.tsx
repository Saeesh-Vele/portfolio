import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { hero, queries, site } from "@/content/content";

/*
 * The share card (1200×630), rendered once at build time. The hero in still form: the query
 * line, the name in the hero's style (Saeesh in Geist, Vele in Instrument Serif italic, in
 * the accent) and the tagline on the left; on the right a small isometric render of the DATA
 * SURFACE's bar grid — graphite bars on a dark plate with a hairline accent edge, the
 * tallest few capped in glacier. Satori reads TTF/OTF/WOFF only, so it uses the `geist`
 * package's static TTFs and a vendored Instrument Serif italic (OFL, from google/fonts)
 * instead of the site's subset woff2s.
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
  readFile(join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-Black.ttf")),
  readFile(join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf")),
  readFile(join(process.cwd(), "node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.ttf")),
  readFile(join(process.cwd(), "src/app/og/InstrumentSerif-Italic.ttf")),
]);

/** The hero surface's view: tilted 35° toward the viewer, turned -30° (see DataSurface). */
const PITCH = (35 * Math.PI) / 180;
const YAW = (-30 * Math.PI) / 180;

/** Local (x, y, z) → [screen x, screen y, depth] (orthographic, larger depth = nearer). */
function project(x: number, y: number, z: number, scale: number, ox: number, oy: number) {
  const x1 = x * Math.cos(YAW) + z * Math.sin(YAW);
  const z1 = -x * Math.sin(YAW) + z * Math.cos(YAW);
  const y2 = y * Math.cos(PITCH) - z1 * Math.sin(PITCH);
  const z2 = y * Math.sin(PITCH) + z1 * Math.cos(PITCH);
  return [ox + x1 * scale, oy - y2 * scale, z2] as const;
}

/** A still "render" of the bar grid as one SVG, painted back to front. */
function barGrid(width: number, height: number) {
  const cols = 14;
  const rows = 9;
  const scale = 27;
  const ox = width / 2 + 10;
  const oy = height * 0.6;
  const foot = 0.74;
  const poly = (points: (readonly [number, number, number])[], fill: string, extra = "") =>
    `<polygon points="${points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}" fill="${fill}"${extra}/>`;
  const p = (x: number, y: number, z: number) => project(x, y, z, scale, ox, oy);

  // Heights: the same kind of field as the live surface (a drift plus a travelling wave).
  const heights: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = c / (cols - 1);
      const nz = r / (rows - 1);
      const v =
        0.42 +
        0.22 * Math.sin(nx * 5.1 + nz * 2.3) * Math.cos(nz * 3.7 - nx * 1.3) +
        0.16 * Math.sin((nx * 1.25 - nz * 0.45) * Math.PI * 2 + 1.1);
      heights.push(0.22 + 3.2 * Math.pow(Math.min(1, Math.max(0, v)), 1.3));
    }
  }
  const sorted = [...heights].sort((a, b) => a - b);
  const q90 = sorted[Math.floor(sorted.length * 0.9)];
  const top = sorted[sorted.length - 1];

  const shapes: string[] = [];
  // Plate: top face with the hairline accent edge, then its front and right sides.
  const m = 0.75;
  const [x0, x1, z0, z1, t] = [-cols / 2 - m, cols / 2 + m + 0.9, -rows / 2 - m, rows / 2 + m + 0.9, 0.34];
  shapes.push(poly([p(x0, -t, z1), p(x1, -t, z1), p(x1, 0, z1), p(x0, 0, z1)], "#090B0F"));
  shapes.push(poly([p(x1, -t, z0), p(x1, -t, z1), p(x1, 0, z1), p(x1, 0, z0)], "#0B0E12"));
  shapes.push(
    poly([p(x0, 0, z0), p(x1, 0, z0), p(x1, 0, z1), p(x0, 0, z1)], "#0D1117", ` stroke="${GLACIER}" stroke-opacity="0.55" stroke-width="1"`),
  );
  // Time-axis ticks along the front edge.
  for (let c = 0; c < cols; c++) {
    const x = c - (cols - 1) / 2;
    const [ax, ay] = p(x, 0, rows / 2 + 0.25);
    const [bx, by] = p(x, 0, rows / 2 + 0.45);
    shapes.push(`<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${MUTED}" stroke-opacity="0.45" stroke-width="1"/>`);
  }

  const bars = heights.map((h, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = c - (cols - 1) / 2;
    const z = (rows - 1) / 2 - r;
    return { h, x, z, depth: p(x, h / 2, z)[2] };
  });
  bars.sort((a, b) => a.depth - b.depth);
  for (const { h, x, z } of bars) {
    const [a, b, c, d] = [x - foot / 2, x + foot / 2, z - foot / 2, z + foot / 2];
    const lit = h >= q90 ? 0.4 + 0.6 * ((h - q90) / Math.max(top - q90, 1e-3)) : 0;
    shapes.push(poly([p(a, 0, d), p(b, 0, d), p(b, h, d), p(a, h, d)], "#161B22"));
    shapes.push(poly([p(b, 0, c), p(b, 0, d), p(b, h, d), p(b, h, c)], "#1E252F"));
    shapes.push(poly([p(a, h, c), p(b, h, c), p(b, h, d), p(a, h, d)], "#2A323D"));
    if (lit > 0) {
      shapes.push(poly([p(a, h, c), p(b, h, c), p(b, h, d), p(a, h, d)], GLACIER, ` fill-opacity="${lit.toFixed(2)}"`));
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${shapes.join("")}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export default async function Image() {
  const [black, medium, mono, serif] = await fonts;
  const motif = { width: 560, height: 470 };

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
          padding: "52px 72px 60px",
          fontFamily: "Geist",
          position: "relative",
        }}
      >
        <img
          src={barGrid(motif.width, motif.height)}
          width={motif.width}
          height={motif.height}
          alt=""
          style={{ position: "absolute", right: 24, top: 96 }}
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
          <span style={{ fontFamily: "Geist Mono", fontSize: 21, letterSpacing: 1.4, color: MUTED }}>
            {`${queries.prompt} ${hero.query}`}
          </span>
          <span style={{ marginTop: 8, fontFamily: "Geist Mono", fontSize: 21, letterSpacing: 1.4, color: TEXT }}>
            {`${" ".repeat(queries.prompt.length + 1)}${hero.roles[0]}`}
          </span>
          <span
            style={{
              marginTop: 26,
              fontSize: 128,
              fontWeight: 900,
              letterSpacing: -5.8,
              lineHeight: 0.9,
            }}
          >
            {hero.name.first}
          </span>
          <span
            style={{
              fontFamily: "Instrument Serif",
              fontStyle: "italic",
              fontSize: 142,
              letterSpacing: -2.5,
              lineHeight: 0.9,
              color: GLACIER,
            }}
          >
            {hero.name.last}
          </span>
          <span
            style={{
              marginTop: 26,
              fontSize: 32,
              fontWeight: 500,
              letterSpacing: -0.6,
              color: TEXT,
            }}
          >
            {hero.tagline}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: black, weight: 900, style: "normal" },
        { name: "Geist", data: medium, weight: 500, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
        { name: "Instrument Serif", data: serif, weight: 400, style: "italic" },
      ],
    },
  );
}
