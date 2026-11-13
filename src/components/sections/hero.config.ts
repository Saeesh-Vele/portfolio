import { heroCamera } from "@/lib/heroLayout";
import type { SectionDef } from "@/lib/sections";

/** Viewport heights the hero stays pinned for while the surface sinks and the camera leaves. */
export const HERO_CHAPTER_LENGTH = 1.5;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Hero span (`at`) over which the DATA SURFACE sinks and its particles burst out. */
const EXIT = { start: 0.03, end: 0.33 } as const;

/**
 * The exit wave, shared by the bars (DataSurface) and the burst particles (particle shader):
 * the bar at front-to-back position v (0 = front edge) starts sinking at `e = v * STAGGER`
 * and is gone `DURATION` later. Its particles launch at the same moment.
 */
export const SURFACE_WAVE = { stagger: 0.5, duration: 0.25 } as const;

/** Hero span position → 0..1 progress of the surface's exit. 0 at rest, 1 once it is gone. */
export function heroExit(at: number | null): number {
  if (at === null) return 0;
  return clamp01((at - EXIT.start) / (EXIT.end - EXIT.start));
}

/** 0..1 sink of the bar row at front-to-back position `v` for exit progress `e`. */
export const barSink = (v: number, e: number) =>
  smoothstep(v * SURFACE_WAVE.stagger, v * SURFACE_WAVE.stagger + SURFACE_WAVE.duration, e);

/**
 * 0..1 fade of the plate, its edge and labels. It runs while the back rows are still
 * sinking (the last row is down at e = 0.75), so the burst reads against open space and a
 * half-faded plate never lingers like a sheet of glass.
 */
export const plateFade = (e: number) => smoothstep(0.28, 0.58, e);

/** True once nothing of the surface is left to draw: the last row is down, the plate gone. */
export const surfaceGone = (e: number) => e >= SURFACE_WAVE.stagger + SURFACE_WAVE.duration + 0.03;

/** Hero copy opacity at pin progress `p`: readable at rest, gone early in the exit. */
export const heroCopyOpacity = (p: number) => 1 - smoothstep(0.02, 0.24, p);

/**
 * HERO — the DATA SURFACE (a lit bar-grid object, DataSurface.tsx) beside the name, over an
 * ambient particle depth field (SURFACE formation). Scrolling sinks the bars front to back
 * while particles burst from their tops (uBurst); the camera then pushes forward into the
 * noise and on to STATS.
 */
export const heroSection: SectionDef = {
  id: "hero",
  formation: "surface",
  hold: [0, 0.4],
  // The field is depth behind the copy, not the subject: kept quiet while the hero is read.
  dim: 0.7,
  // After the burst the particles are raw noise again, before the next section claims them.
  extraHolds: [{ formation: "noise", hold: [0.58, 0.64], dim: 0 }],
  keyframes: (viewport) => {
    const { distance, fov } = heroCamera(viewport.isMobile);
    return [
      { at: 0, position: [0, 0, distance], target: [0, 0, 0], fov },
      // Repeated: the camera is perfectly still while the hero is read.
      { at: 0.02, position: [0, 0, distance], target: [0, 0, 0], fov },
      // A slow creep while the surface sinks, then forward through the burst into the noise.
      { at: 0.3, position: [0.3, 0.25, distance - 1.6], target: [0.6, 0.4, 0], fov: fov + 2 },
      { at: 0.56, position: [0, 0.6, -3.5], target: [0, 0.3, -14], fov: 44 },
    ];
  },
  reducedKeyframes: (viewport) => {
    const { distance, fov } = heroCamera(viewport.isMobile);
    return [{ at: 0, position: [0, 0, distance], target: [0, 0, 0], fov }];
  },
};
