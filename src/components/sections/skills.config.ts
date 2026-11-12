import { CLUSTERS_VIEW } from "@/lib/phase4Layout";
import type { CameraKeyframe, SectionDef, Vec3, Viewport } from "@/lib/sections";

/** Pinned length of the chapter, in viewport heights. Phones step through the columns. */
export const SKILLS_CHAPTER = { length: 1.5, mobileLength: 2.2 } as const;

const view = (at: number, back: number): CameraKeyframe => {
  const [x, y, z] = CLUSTERS_VIEW.center;
  return {
    at,
    position: [x, y, z + CLUSTERS_VIEW.distance + back] as Vec3,
    target: [x, y, z],
    fov: CLUSTERS_VIEW.fov,
  };
};

/** Fraction of the scroll span during which the stage is pinned. */
const pinned = (viewport: Viewport) => {
  const length = viewport.isMobile ? SKILLS_CHAPTER.mobileLength : SKILLS_CHAPTER.length;
  return length / (1 + length);
};

const ramp = (value: number, from: number, to: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/*
 * Everything below takes `p`, the 0..1 progress through the pinned distance. The heading has
 * the stage to itself first; then each column arrives in turn and its cluster leaves the
 * merged mass just ahead of it. Desktop: the columns accumulate side by side. Phones: one
 * column at a time, each leaving before the next arrives.
 */
const start = (i: number, mobile: boolean) => (mobile ? 0.1 + i * 0.21 : 0.14 + i * 0.11);
const MOBILE_FADE = 0.07;

/** 0..1 arrival of column `i`. */
export function columnReveal(p: number, i: number, mobile: boolean): number {
  const a = start(i, mobile);
  return ramp(p, a, a + (mobile ? MOBILE_FADE : 0.16));
}

/** 0..1 departure of column `i` (phones only: it makes room for the next one). */
export function columnExit(p: number, i: number, count: number, mobile: boolean): number {
  if (!mobile || i >= count - 1) return 0;
  const next = start(i + 1, true);
  return ramp(p, next - MOBILE_FADE, next);
}

/**
 * 0..1 separation of cluster `i` from the merged mass into its own shape. Desktop: each
 * leaves just ahead of its column. Phones: all four separate together (slightly staggered)
 * as the first panel arrives, so the 2 × 2 is complete while the panels step through it and
 * the panel being read lights its own shape.
 */
export function clusterSpread(p: number, i: number, mobile: boolean): number {
  if (mobile) {
    const a = start(0, true) - 0.08 + i * 0.02;
    return ramp(p, a, a + 0.14);
  }
  const a = start(i, false);
  return ramp(p, a - 0.04, a + 0.15);
}

/**
 * CAPABILITIES — a short pinned chapter. The clusters are placed in screen space from the
 * DOM (see `src/lib/clusterLayout.ts`), so the camera only creeps forward: the far dust
 * drifts while the heading, the clusters and the columns stay put.
 */
export const skillsSection: SectionDef = {
  id: "skills",
  formation: "clusters",
  hold: [-0.25, 0.72],
  dim: 0.3,
  keyframes: () => [view(-0.45, 3), view(0, 1), view(0.6, 0), view(0.95, -0.5)],
  reducedKeyframes: () => [view(0, 0)],
  // Desktop: every column is in. Phones: the first column.
  anchor: (viewport) => pinned(viewport) * (viewport.isMobile ? 0.2 : 0.72),
};
