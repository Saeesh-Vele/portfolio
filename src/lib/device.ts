import { MOBILE_BREAKPOINT } from "@/lib/constants";

/** `mobileHigh`: a phone that can afford more particles (see `capablePhone`). */
export type Tier = "mobile" | "mobileHigh" | "mid" | "desktop";

/**
 * Decided from viewport width + logical core count (see CLAUDE.md → Performance). Capable
 * phones start higher; adaptive quality is the safety net either way.
 */
export function deviceTier(width: number, cores: number, capable = false): Tier {
  if (width < MOBILE_BREAKPOINT) return capable || cores >= 6 ? "mobileHigh" : "mobile";
  if (cores <= 4) return "mid";
  return "desktop";
}

/** Ordered by particle count, lowest first. A cap is a position in this list. */
export const TIER_ORDER: readonly Tier[] = ["mobile", "mid", "mobileHigh", "desktop"];

export const isTier = (value: unknown): value is Tier =>
  typeof value === "string" && (TIER_ORDER as readonly string[]).includes(value);

/** Where adaptive quality drops to next. Phones and desktops have their own ladders. */
const NEXT_DOWN: Record<Tier, Tier> = {
  desktop: "mid",
  mid: "mobile",
  mobileHigh: "mobile",
  mobile: "mobile",
};

/** The tier one step down, or the same tier at the floor. */
export const lowerTier = (tier: Tier): Tier => NEXT_DOWN[tier];

/** `tier`, but never above `cap`. */
export const capTier = (tier: Tier, cap: Tier | null): Tier =>
  cap && TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(cap) ? cap : tier;

export const PARTICLE_COUNT: Record<Tier, number> = {
  mobile: 18_000,
  mid: 30_000,
  mobileHigh: 35_000,
  desktop: 60_000,
};

/**
 * A phone GPU that can afford `mobileHigh`. Recent Apple GPUs all report "Apple GPU", so on
 * iOS the screen's device-pixel width separates current phones (≥ 1170 px: iPhone 12 and
 * later) from older ones. On Android: Adreno 640+, Mali-G7x / G7xx and up, Xclipse,
 * Immortalis. Anything unknown is not capable.
 */
export function capablePhone(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(
      gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "",
    );
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    if (/apple gpu/i.test(renderer)) {
      return Math.min(screen.width, screen.height) * window.devicePixelRatio >= 1170;
    }
    const adreno = /adreno\D*(\d{3})/i.exec(renderer);
    if (adreno) return Number(adreno[1]) >= 640;
    return /mali-g(7\d|[7-9]\d\d)|xclipse|immortalis/i.test(renderer);
  } catch {
    return false;
  }
}

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
