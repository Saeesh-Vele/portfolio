import { mulberry32 } from "@/lib/device";
import type { Formation } from "./index";

/**
 * NOISE — raw, unstructured data. A uniform random volume the camera can sit inside:
 * it surrounds the path beyond the hero (z from +4 back to -34).
 */
export const noise: Formation = (count, viewport) => {
  const out = new Float32Array(count * 3);
  const rand = mulberry32(0x5eed01);
  // Narrow (portrait) screens see a thinner slice, so tighten the volume to keep density.
  const halfX = 16 * Math.min(1.8, Math.max(0.55, viewport.aspect)) * 0.6;
  for (let i = 0; i < count; i++) {
    out[i * 3] = (rand() * 2 - 1) * halfX;
    out[i * 3 + 1] = (rand() * 2 - 1) * 10;
    out[i * 3 + 2] = 4 - rand() * 38;
  }
  return out;
};
