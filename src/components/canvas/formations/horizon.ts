import { AUX_KIND } from "@/lib/constants";
import { mulberry32 } from "@/lib/device";
import { HORIZON_VIEW, terrainHeight } from "@/lib/phase4Layout";
import type { Formation } from "./index";

const TERRAIN_SHARE = 0.93;
/** World spacing between grid lines. */
const GRID = 1.6;

/**
 * HORIZON — a terrain grid running to the horizon: points strung along grid lines in both
 * directions over a few long, low swells. The closing, calmest formation; the shader adds
 * only a very slow swell. A thin scatter of dust sits above it as sky.
 */
export const horizon: Formation = (count, viewport) => {
  const positions = new Float32Array(count * 3);
  const aux = new Float32Array(count * 4);
  const rand = mulberry32(0x5eed08);
  const [sx, sy, sz] = HORIZON_VIEW.start;
  const halfWidth = viewport.isMobile ? HORIZON_VIEW.halfWidth * 0.6 : HORIZON_VIEW.halfWidth;
  const terrainCount = Math.floor(count * TERRAIN_SHARE);

  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    let z: number;
    if (i < terrainCount) {
      // Denser near the camera, where the grid is actually resolved.
      const far = Math.pow(rand(), 1.7) * HORIZON_VIEW.depth;
      const across = (rand() * 2 - 1) * halfWidth;
      if (i % 2 === 0) {
        x = sx + Math.round(across / GRID) * GRID;
        z = sz - far;
      } else {
        x = sx + across;
        z = sz - Math.round(far / GRID) * GRID;
      }
      y = sy + terrainHeight(x, z);
      aux[i * 4 + 3] = AUX_KIND.horizon;
    } else {
      x = sx + (rand() * 2 - 1) * halfWidth;
      y = sy + 4 + rand() * 16;
      z = sz - 8 - rand() * 60;
    }
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return { positions, aux };
};
