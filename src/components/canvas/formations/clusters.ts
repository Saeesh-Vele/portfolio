import { capabilities } from "@/content/content";
import { AUX_KIND, MAX_CLUSTERS } from "@/lib/constants";
import { mulberry32 } from "@/lib/device";
import { clusterOffsets, CLUSTERS_VIEW } from "@/lib/phase4Layout";
import type { Formation } from "./index";

const CLUSTER_SHARE = 0.78;

function gaussian(rand: () => number) {
  const u = Math.max(rand(), 1e-6);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/**
 * CLUSTERS — one soft particle cluster per capability column (Data / AI / Web / Cloud). The
 * positions here are the separated state; each particle also carries the offset back to the
 * shared centre, and the shader slides along it (`uSpread`), so scrolling in pulls one mass
 * apart into four. `uClusterFocus` brightens the cluster whose column is hovered.
 */
export const clusters: Formation = (count, viewport) => {
  const positions = new Float32Array(count * 3);
  const aux = new Float32Array(count * 4);
  const rand = mulberry32(0x5eed06);
  const offsets = clusterOffsets(viewport.isMobile);
  const groups = Math.min(capabilities.columns.length, MAX_CLUSTERS, offsets.length);
  const clusterCount = Math.floor(count * CLUSTER_SHARE);
  const radius = viewport.isMobile ? 0.62 : 0.8;
  const [cx, cy, cz] = CLUSTERS_VIEW.center;

  for (let i = 0; i < count; i++) {
    if (i < clusterCount) {
      const group = i % groups;
      const [ox, oy, oz] = offsets[group];
      // Dense core with a loose halo: a cloud, not a ball.
      const spread = rand() < 0.7 ? radius * 0.55 : radius * 1.25;
      positions[i * 3] = cx + ox + gaussian(rand) * spread;
      positions[i * 3 + 1] = cy + oy + gaussian(rand) * spread * 0.85;
      positions[i * 3 + 2] = cz + oz + gaussian(rand) * spread;
      // Merged, the four clouds overlap around the centre (not quite on top of each other).
      aux[i * 4] = -ox * 0.9;
      aux[i * 4 + 1] = -oy * 0.9;
      aux[i * 4 + 2] = -oz;
      aux[i * 4 + 3] = AUX_KIND.cluster + group;
    } else {
      positions[i * 3] = cx + (rand() * 2 - 1) * (viewport.isMobile ? 8 : 16);
      positions[i * 3 + 1] = cy + (rand() * 2 - 1) * 9;
      positions[i * 3 + 2] = cz + 6 - rand() * 24;
    }
  }
  return { positions, aux };
};
