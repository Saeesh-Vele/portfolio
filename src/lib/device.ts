import { MOBILE_BREAKPOINT } from "@/lib/constants";

export type Tier = "mobile" | "mid" | "desktop";

/** Decided from viewport width + logical core count (see CLAUDE.md → Performance). */
export function deviceTier(width: number, cores: number): Tier {
  if (width < MOBILE_BREAKPOINT) return "mobile";
  if (cores <= 4) return "mid";
  return "desktop";
}

export const PARTICLE_COUNT: Record<Tier, number> = {
  mobile: 18_000,
  mid: 30_000,
  desktop: 60_000,
};

/** Seeded PRNG so formations are identical between rebuilds. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
