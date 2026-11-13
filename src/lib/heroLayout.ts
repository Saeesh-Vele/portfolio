import type { Viewport } from "@/lib/sections";

/**
 * The hero camera rests here, looking at the origin. The DATA SURFACE stands on the z = 0
 * plane, placed from its DOM slot through this camera (see DataSurface.tsx), so its screen
 * position is exact while the camera is at rest.
 */
export const HERO_CAMERA = { distance: 10, fov: 35 } as const;

/** World-space size of the visible rectangle at `distance` from a camera with `fov`. */
export function visibleSize(viewport: Pick<Viewport, "aspect">, distance: number, fov: number) {
  const height = 2 * distance * Math.tan((fov * Math.PI) / 360);
  return { width: height * viewport.aspect, height };
}

/** Columns × rows of the DATA SURFACE's bar grid. */
export interface SurfaceGrid {
  cols: number;
  rows: number;
}

/**
 * Desktop 22 × 14, phones 14 × 10, and 12 × 8 on the lowest particle tier (weak phones, or a
 * desktop that adaptive quality has dropped all the way).
 */
export function surfaceGrid(isMobile: boolean, lowestTier: boolean): SurfaceGrid {
  if (lowestTier) return { cols: 12, rows: 8 };
  return isMobile ? { cols: 14, rows: 10 } : { cols: 22, rows: 14 };
}
