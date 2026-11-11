import type { SectionDef } from "@/lib/sections";

/**
 * NUMBERS — placeholder for Phase 2. For now the particles land back in NOISE so the hero
 * exit can be tested. Phase 2 swaps `formation` for the bar-column formation and adds the
 * ~30° orbit keyframes.
 */
export const numbersSection: SectionDef = {
  id: "numbers",
  formation: "noise",
  hold: [0, 1],
  dim: 0.45,
  keyframes: () => [{ at: 0, position: [0, 0.4, -9], target: [0, 0, -22], fov: 40 }],
};
