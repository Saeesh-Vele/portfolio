import { stats as statsContent } from "@/content/content";
import { AUX_KIND } from "@/lib/constants";
import { mulberry32 } from "@/lib/device";
import { STATS_VIEW, statSlots, statsPlaneSize } from "@/lib/statsLayout";
import type { Formation } from "./index";

/** Share of particles in the columns; then a faint floor grid; the rest is ambient dust. */
const COLUMN_SHARE = 0.62;
const FLOOR_SHARE = 0.06;
/** World height of one stacked layer of points. */
const LAYER = 0.085;

/**
 * STATS — one point-cloud bar per stat, standing on the plane the settled camera faces, each
 * aligned to its stat in the DOM grid (see statsLayout.ts). Bars are built from stacked
 * layers; the shader rains each layer in from above as that column's counter runs
 * (`uRise`), bottom layer first. Heights are decorative and deliberately not to any scale.
 */
export const stats: Formation = (count, viewport) => {
  const positions = new Float32Array(count * 3);
  const aux = new Float32Array(count * 4);
  const rand = mulberry32(0x5eed03);

  const slots = statSlots(viewport, statsContent.length);
  const plane = statsPlaneSize(viewport);
  const [cx, cy, cz] = STATS_VIEW.center;
  const columnCount = Math.floor(count * COLUMN_SHARE);
  const floorCount = Math.floor(count * FLOOR_SHARE);
  const floorY = slots[0].base;

  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    let z: number;

    if (i < columnCount) {
      const column = i % slots.length;
      const slot = slots[column];
      const depth = slot.width;
      const layers = Math.max(4, Math.round(slot.height / LAYER));
      const layer = Math.floor(rand() * layers);

      let u = rand();
      let v = rand();
      // Most points sit on the faces so the bar reads as a scanned solid, not a fog.
      if (rand() < 0.6) {
        const side = Math.floor(rand() * 4);
        if (side === 0) u = 0;
        else if (side === 1) u = 1;
        else if (side === 2) v = 0;
        else v = 1;
      }
      x = cx + slot.x + u * slot.width;
      y = cy + slot.base + ((layer + 0.5) / layers) * slot.height + (rand() - 0.5) * 0.012;
      // Front face on the plane the DOM maps onto; the rest of the bar recedes behind it.
      z = cz - v * depth;

      aux[i * 4] = (layer + 0.5) / layers;
      aux[i * 4 + 1] = rand();
      aux[i * 4 + 3] = AUX_KIND.statsColumn + column;
    } else if (i < columnCount + floorCount) {
      // Floor grid receding behind the columns: grounds them while the camera orbits.
      const step = 0.6;
      const halfX = Math.max(plane.width * 0.75, 4);
      x = cx + Math.round(((rand() * 2 - 1) * halfX) / step) * step;
      y = cy + floorY;
      z = cz - Math.round((rand() * 16) / step) * step;
    } else {
      // Ambient dust, kept behind the columns' plane so nothing drifts over the numbers.
      x = cx + (rand() * 2 - 1) * Math.max(plane.width * 1.4, 9);
      y = cy + (rand() * 2 - 1) * 8;
      z = cz - 2 - rand() * 26;
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return { positions, aux };
};
