import type { CameraKeyframe, SectionDef, Vec3, Viewport } from "@/lib/sections";
import { STATS_VIEW } from "@/lib/statsLayout";

/** Viewport heights the About stage stays pinned for (desktop / mobile). */
export const ABOUT_CHAPTER = { length: 1.5, mobileLength: 1.2 } as const;

const ORBIT_DEGREES = 30;

/** Fraction of the section's scroll span during which its stage is pinned. */
function pinned(viewport: Viewport) {
  const length = viewport.isMobile ? ABOUT_CHAPTER.mobileLength : ABOUT_CHAPTER.length;
  return length / (1 + length);
}

/**
 * Camera on the orbit circle around the columns, `degrees` off the frontal view. `lift` moves
 * camera and target together, so the view never tilts. It is negative during the orbit: the
 * columns nearest the camera are magnified, and a lower eye line keeps their bases from
 * dropping below the band into the stats text.
 */
function orbit(degrees: number, lift: number): Vec3 {
  const angle = (degrees * Math.PI) / 180;
  const [cx, cy, cz] = STATS_VIEW.center;
  return [
    cx + Math.sin(angle) * STATS_VIEW.distance,
    cy + lift,
    cz + Math.cos(angle) * STATS_VIEW.distance,
  ];
}

const lifted = (lift: number): Vec3 => [
  STATS_VIEW.center[0],
  STATS_VIEW.center[1] + lift,
  STATS_VIEW.center[2],
];

const settled = (at: number): CameraKeyframe => ({
  at,
  position: orbit(0, 0),
  target: STATS_VIEW.center,
  fov: STATS_VIEW.fov,
});

/**
 * ABOUT — particles rain into six point-cloud columns (STATS). The camera orbits ~30° round
 * them over the first half of the pin, then settles square-on, where the columns line up
 * with the DOM stats grid, and holds there while the text is read.
 */
export const aboutSection: SectionDef = {
  id: "about",
  formation: "stats",
  // Formed slightly before the stage pins, so the columns can start raining as it arrives.
  hold: [-0.1, 0.6],
  dim: 0.15,
  keyframes: (viewport) => {
    const pin = pinned(viewport);
    return [
      {
        at: 0,
        position: orbit(ORBIT_DEGREES, -0.7),
        target: lifted(-0.7),
        fov: STATS_VIEW.fov + 4,
      },
      {
        at: pin * 0.26,
        position: orbit(ORBIT_DEGREES / 2, -0.3),
        target: lifted(-0.3),
        fov: STATS_VIEW.fov + 1.5,
      },
      // Repeated keyframes pin the spline: the middle stretch is perfectly still.
      settled(pin * 0.5),
      settled(pin * 0.54),
      settled(pin * 0.96),
      settled(pin),
    ];
  },
  reducedKeyframes: () => [settled(0)],
  anchor: (viewport) => pinned(viewport) * 0.62,
};
