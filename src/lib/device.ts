import { MOBILE_BREAKPOINT } from "@/lib/constants";

export type Tier = "mobile" | "mid" | "desktop";

/** Decided from viewport width + logical core count (see CLAUDE.md → Performance). */
export function deviceTier(width: number, cores: number): Tier {
  if (width < MOBILE_BREAKPOINT) return "mobile";
  if (cores <= 4) return "mid";
  return "desktop";
}

/** Lowest first. Adaptive quality only ever moves down this list. */
export const TIER_ORDER: readonly Tier[] = ["mobile", "mid", "desktop"];

export const isTier = (value: unknown): value is Tier =>
  typeof value === "string" && (TIER_ORDER as readonly string[]).includes(value);

/** The tier one step down, or the same tier at the floor. */
export const lowerTier = (tier: Tier): Tier => TIER_ORDER[Math.max(0, TIER_ORDER.indexOf(tier) - 1)];

/** `tier`, but never above `cap`. */
export const capTier = (tier: Tier, cap: Tier | null): Tier =>
  cap && TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(cap) ? cap : tier;

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
