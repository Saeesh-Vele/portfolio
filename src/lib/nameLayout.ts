import type { Viewport } from "@/lib/sections";

/** The hero camera starts here, looking at the name on the z = 0 plane. */
export const HERO_CAMERA = { distance: 10, fov: 35 } as const;

/** World-space size of the visible rectangle at `distance` from a camera with `fov`. */
export function visibleSize(viewport: Viewport, distance: number, fov: number) {
  const height = 2 * distance * Math.tan((fov * Math.PI) / 360);
  return { width: height * viewport.aspect, height };
}

export interface NameLayout {
  twoLines: boolean;
  /** Max world width/height the name may occupy. */
  maxWidth: number;
  maxHeight: number;
  /** World y of the name's centre (the DOM hero text sits below it). */
  centerY: number;
  visibleWidth: number;
  visibleHeight: number;
}

/**
 * Where the particle name sits on screen. Shared by the NAME formation and the hero camera
 * keyframes so the camera always pushes through the middle of the name.
 */
export function nameLayout(viewport: Viewport): NameLayout {
  const { width, height } = visibleSize(viewport, HERO_CAMERA.distance, HERO_CAMERA.fov);
  const twoLines = viewport.aspect < 0.95;
  const centerFromTop = twoLines ? 0.3 : 0.37;
  return {
    twoLines,
    maxWidth: width * (twoLines ? 0.84 : 0.8),
    maxHeight: height * (twoLines ? 0.27 : 0.21),
    centerY: (0.5 - centerFromTop) * height,
    visibleWidth: width,
    visibleHeight: height,
  };
}
