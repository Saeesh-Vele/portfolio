import { AUX_KIND } from "@/lib/constants";
import { mulberry32 } from "@/lib/device";
import { HERO_CAMERA } from "@/lib/heroLayout";
import type { Formation } from "./index";

/** Share of particles that wait inside the DATA SURFACE's bars and burst out on scroll. */
const BURST_SHARE = 0.18;

function gaussian(rand: () => number) {
  const u = Math.max(rand(), 1e-6);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/**
 * SURFACE — the hero's field. Most particles are ambient depth: spread evenly over the
 * resting camera's view, from a few units in front of the surface to far behind it, so the
 * field reads as a deep, quiet volume behind the copy. The rest belong to the surface's bars
 * (aux.w = SURFACE burst): invisible while it stands, they launch from their bar's top as
 * the exit wave reaches its row and scatter upwards into the field (see place() in the
 * particle shader). Their position is the burst offset, in the grid's local units.
 */
export const surface: Formation = (count, viewport) => {
  const positions = new Float32Array(count * 3);
  const aux = new Float32Array(count * 4);
  const rand = mulberry32(0x5eed02);
  const burstCount = Math.floor(count * BURST_SHARE);
  const tanHalf = Math.tan((HERO_CAMERA.fov * Math.PI) / 360);

  for (let i = 0; i < count; i++) {
    const o = i * 3;
    if (i < burstCount) {
      // Mostly up (local +y, the bars' axis), with a lateral spray that widens with height.
      const up = 2.2 + Math.pow(rand(), 0.8) * 8;
      positions[o] = gaussian(rand) * (0.5 + up * 0.22);
      positions[o + 1] = up;
      positions[o + 2] = gaussian(rand) * (0.5 + up * 0.18);
      aux.set([rand() - 0.5, rand(), rand(), AUX_KIND.surfaceBurst], i * 4);
      continue;
    }
    // Ambient: uniform on screen at rest, mostly far back (10–44 units from the lens), where
    // the points are small and fade with distance: depth, not texture.
    const depth = 10 + Math.pow(rand(), 0.55) * 34;
    const halfH = depth * tanHalf * 1.15;
    positions[o] = (rand() * 2 - 1) * halfH * viewport.aspect;
    positions[o + 1] = (rand() * 2 - 1) * halfH;
    positions[o + 2] = HERO_CAMERA.distance - depth;
  }
  return { positions, aux };
};
