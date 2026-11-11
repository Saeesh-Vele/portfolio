import { HORIZON_VIEW } from "@/lib/phase4Layout";
import type { CameraKeyframe, SectionDef } from "@/lib/sections";

const view = (at: number, height: number, back: number, fov: number): CameraKeyframe => {
  const [x, y, z] = HORIZON_VIEW.start;
  return {
    at,
    position: [x, y + height, z + back],
    target: [x, y + 1.2, z - 34],
    fov,
  };
};

/**
 * CONTACT — the last section. The camera arrives low over the terrain, then pulls back and
 * up to the horizon view and stays there. It is the page's end, so only the first part of
 * its span is ever reached: everything happens on the way in.
 */
export const contactSection: SectionDef = {
  id: "contact",
  formation: "horizon",
  hold: [-0.5, 1],
  dim: 0.1,
  keyframes: () => [view(-0.75, 2.2, -4, 46), view(-0.05, 6.2, 9, 42), view(0.3, 6.6, 10, 42)],
  reducedKeyframes: () => [view(0, 6.2, 9, 42)],
};
