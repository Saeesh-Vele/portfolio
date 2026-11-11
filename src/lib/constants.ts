/** sessionStorage flag: the loader has already played in this tab session. */
export const LOADER_SESSION_KEY = "sv:loader-played";

/** Mirrors the design tokens in globals.css for use inside WebGL. */
export const COLORS = {
  bg: "#07090C",
  text: "#E7E5E0",
  glacier: "#8CCFDD",
} as const;

export const MOBILE_BREAKPOINT = 768;

/** Sizes of the per-column / per-station uniform arrays in the particle shader. */
export const MAX_STATS = 8;
export const MAX_STATIONS = 8;

/**
 * Values of `aux.w`, the per-particle behaviour selector read by the particle shader
 * (see FormationData in formations/index.ts). Column / station index is added to the base.
 */
export const AUX_KIND = { statsColumn: 1, flow: 10, station: 11 } as const;
