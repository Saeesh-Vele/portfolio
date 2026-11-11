import { HERO_CAMERA, nameLayout } from "@/lib/nameLayout";
import type { SectionDef } from "@/lib/sections";

/** Viewport heights the hero stays pinned for while the camera travels. */
export const HERO_CHAPTER_LENGTH = 1.6;

/**
 * HERO — particles hold the NAME formation, then the camera pushes straight through it
 * (the name sits on z = 0) while the particles start scattering back to noise.
 */
export const heroSection: SectionDef = {
  id: "hero",
  formation: "name",
  hold: [0, 0.3],
  dim: 0,
  keyframes: (viewport) => {
    const { centerY } = nameLayout(viewport);
    return [
      { at: 0, position: [0, 0, HERO_CAMERA.distance], target: [0, 0, 0], fov: HERO_CAMERA.fov },
      // Through the name and out the other side.
      { at: 0.52, position: [0, centerY, -3.5], target: [0, centerY * 0.5, -14], fov: 44 },
    ];
  },
};
