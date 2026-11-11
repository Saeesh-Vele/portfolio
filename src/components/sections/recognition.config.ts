import { PODIUM_VIEW } from "@/lib/phase4Layout";
import type { CameraKeyframe, SectionDef, Viewport } from "@/lib/sections";

/**
 * Desktop: the camera looks straight ahead from left of the podium, which puts the podium in
 * the right half of the frame and leaves the left for the text. Mobile: centred.
 */
const view = (viewport: Viewport, at: number, back: number, lift: number): CameraKeyframe => {
  const [x, y, z] = PODIUM_VIEW.base;
  const aside = viewport.isMobile ? 0 : -3.5;
  const distance = (viewport.isMobile ? 19 : 13.5) + back;
  return {
    at,
    position: [x + aside, y + 2.6 + lift, z + distance],
    target: [x + aside, y + (viewport.isMobile ? 0.2 : 1.7), z],
    fov: viewport.isMobile ? 50 : 40,
  };
};

/** 0..1 rise of the numeral onto the third step as the section scrolls in. */
export function numeralLift(at: number): number {
  const t = Math.min(1, Math.max(0, (at + 0.62) / 0.6));
  return t * t * (3 - 2 * t);
}

/**
 * RECOGNITION — a normal-flow section. The camera drifts down and in on the podium while the
 * numeral rises, then settles.
 */
export const recognitionSection: SectionDef = {
  id: "recognition",
  formation: "podium",
  hold: [-0.5, 0.6],
  dim: 0.2,
  keyframes: (viewport) => [
    view(viewport, -0.8, 5, 2.2),
    view(viewport, -0.02, 0, 0),
    view(viewport, 0.6, -0.4, 0),
  ],
  reducedKeyframes: (viewport) => [view(viewport, 0, 0, 0)],
};
