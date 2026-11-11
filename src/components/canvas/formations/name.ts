import { site } from "@/content/content";
import { mulberry32 } from "@/lib/device";
import { nameLayout } from "@/lib/nameLayout";
import type { Formation } from "./index";
import { noise } from "./noise";

/** Share of particles that form the letters; the rest are halo + ambient dust for depth. */
const NAME_SHARE = 0.7;
const HALO_SHARE = 0.08;

const FONT_PX = 220;
const LINE_HEIGHT = 0.9;
const SAMPLE_STEP = 2;

/** Box–Muller: gives the depth jitter a soft, sensor-like falloff. */
function gaussian(rand: () => number) {
  const u = Math.max(rand(), 1e-6);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Rasterises the name with the display font and returns the lit pixels + their bounds. */
function sampleText(lines: string[], fontFamily: string) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const font = `800 ${FONT_PX}px ${fontFamily}`;
  const spacing = `${-0.04 * FONT_PX}px`;
  const applyStyle = () => {
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    if ("letterSpacing" in ctx) ctx.letterSpacing = spacing;
  };

  applyStyle();
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const pad = FONT_PX * 0.25;
  canvas.width = Math.ceil(widest + pad * 2);
  canvas.height = Math.ceil(lines.length * FONT_PX * LINE_HEIGHT + pad * 2);
  // Resizing a canvas resets its context state.
  applyStyle();
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, pad + (i + 0.5) * FONT_PX * LINE_HEIGHT);
  });

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const xs: number[] = [];
  const ys: number[] = [];
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  for (let y = 0; y < height; y += SAMPLE_STEP) {
    for (let x = 0; x < width; x += SAMPLE_STEP) {
      if (data[(y * width + x) * 4 + 3] > 128) {
        xs.push(x);
        ys.push(y);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (xs.length === 0) return null;
  return { xs, ys, minX, maxX, minY, maxY };
}

/**
 * NAME — "SAEESH VELE" as a point cloud on the z = 0 plane. Sampled from an offscreen 2D
 * canvas in the display font, with depth jitter so it reads as a 3D scan, not flat text.
 * One line on wide screens, two on portrait.
 */
export const name: Formation = (count, viewport) => {
  const layout = nameLayout(viewport);
  const lines = layout.twoLines ? site.particleName.split(" ") : [site.particleName];
  const sample = typeof document === "undefined" ? null : sampleText(lines, viewport.fontFamily);
  if (!sample) return noise(count, viewport);

  const out = new Float32Array(count * 3);
  const rand = mulberry32(0x5eed02);

  const textWidth = sample.maxX - sample.minX;
  const textHeight = sample.maxY - sample.minY;
  const scale = Math.min(layout.maxWidth / textWidth, layout.maxHeight / textHeight);
  const centerX = (sample.minX + sample.maxX) / 2;
  const centerY = (sample.minY + sample.maxY) / 2;
  const halfWidth = (textWidth * scale) / 2;
  const halfHeight = (textHeight * scale) / 2;

  const nameCount = Math.floor(count * NAME_SHARE);
  const haloCount = Math.floor(count * HALO_SHARE);

  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    let z: number;

    if (i < nameCount) {
      const k = Math.floor(rand() * sample.xs.length);
      x = (sample.xs[k] + rand() * SAMPLE_STEP - centerX) * scale;
      y = -(sample.ys[k] + rand() * SAMPLE_STEP - centerY) * scale + layout.centerY;
      // Mostly a thin slab, with occasional returns from further off.
      z = gaussian(rand) * (rand() < 0.12 ? 0.6 : 0.09);
    } else if (i < nameCount + haloCount) {
      // Loose halo hugging the name: gives the letters volume as the camera moves.
      x = (rand() * 2 - 1) * halfWidth * 1.15;
      y = (rand() * 2 - 1) * halfHeight * 1.9 + layout.centerY;
      z = gaussian(rand) * 1.6;
    } else {
      // Ambient dust filling the space in front of and behind the name.
      x = (rand() * 2 - 1) * layout.visibleWidth * 1.3;
      y = (rand() * 2 - 1) * layout.visibleHeight * 1.1;
      z = 3 - rand() * 34;
    }

    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
};
