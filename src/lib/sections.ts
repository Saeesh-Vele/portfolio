import { contactSection } from "@/components/sections/contact.config";
import { recognitionSection } from "@/components/sections/recognition.config";
import { skillsSection } from "@/components/sections/skills.config";
import { workSection } from "@/components/sections/work.config";
import { heroSection } from "@/components/sections/hero.config";
import { aboutSection } from "@/components/sections/about.config";
import { experienceSection } from "@/components/sections/experience.config";

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

/** A formation held fully formed over part of a section's scroll span. */
export interface FormationHoldDef {
  /** Name in the formations registry. */
  formation: string;
  hold: [number, number];
  /** 0..1 particle dimming while it is held. */
  dim: number;
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
  /**
   * Further formations held later in the same span, in order (e.g. the hero dissolving back
   * to noise after the name). Each morphs in from the hold before it.
   */
  extraHolds?: FormationHoldDef[];
  /**
   * Camera keyframes used instead of `keyframes` with prefers-reduced-motion, where the
   * camera snaps between keyframes and chapters are not pinned. Usually one static view.
   */
  reducedKeyframes?: (viewport: Viewport) => CameraKeyframe[];
  /** Where in the span (0..1) nav links land. Defaults to 0, the section's top. */
  anchor?: (viewport: Viewport) => number;
}

/** Page order. Later phases append here. */
export const SECTIONS: SectionDef[] = [
  heroSection,
  aboutSection,
  experienceSection,
  workSection,
  skillsSection,
  recognitionSection,
  contactSection,
];
