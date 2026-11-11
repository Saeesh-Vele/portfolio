import { CLUSTERS_VIEW } from "@/lib/phase4Layout";
import type { CameraKeyframe, SectionDef, Vec3 } from "@/lib/sections";

const view = (at: number, back: number, lift: number): CameraKeyframe => {
  const [x, y, z] = CLUSTERS_VIEW.center;
  return {
    at,
    position: [x, y + lift, z + CLUSTERS_VIEW.distance + back] as Vec3,
    target: [x, y, z],
    fov: CLUSTERS_VIEW.fov,
  };
};

/** 0..1 separation of the clusters over the section's approach (`at` < 0 = still scrolling in). */
export function clusterSpread(at: number): number {
  const t = Math.min(1, Math.max(0, (at + 0.75) / 0.7));
  return t * t * (3 - 2 * t);
}

/**
 * CAPABILITIES — a normal-flow section. The camera eases in square-on to the four clusters
 * as they pull apart, then barely moves while the columns are read.
 */
export const skillsSection: SectionDef = {
  id: "skills",
  formation: "clusters",
  hold: [-0.5, 0.7],
  dim: 0.5,
  keyframes: () => [view(-0.8, 7, 1.6), view(-0.05, 0, 0), view(0.6, -0.6, 0)],
  reducedKeyframes: () => [view(0, 0, 0)],
};
