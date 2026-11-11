import { heroSection } from "@/components/sections/hero.config";
import { numbersSection } from "@/components/sections/numbers.config";

export type Vec3 = [number, number, number];

export interface Viewport {
  /** CSS pixels. */
  width: number;
  height: number;
  aspect: number;
  isMobile: boolean;
  /** Resolved display font family, for formations that rasterise text. */
  fontFamily: string;
}

export interface CameraKeyframe {
  /**
   * Position inside the section's scroll span: 0 = the section's top is at the viewport top,
   * 1 = the next section's top is at the viewport top.
   */
  at: number;
  position: Vec3;
  target: Vec3;
  fov: number;
}

export interface SectionDef {
  /** Must match the `data-section` attribute on the section's root DOM element. */
  id: string;
  /** Name in the formations registry. */
  formation: string;
  /**
   * Fraction of the section's scroll span during which the formation is fully formed and
   * calm. The morph from the previous section runs between its hold end and this hold start.
   */
  hold: [number, number];
  /** 0..1 particle dimming while this section is being read. */
  dim: number;
  keyframes: (viewport: Viewport) => CameraKeyframe[];
}

/** Page order. Later phases append here. */
export const SECTIONS: SectionDef[] = [heroSection, numbersSection];
