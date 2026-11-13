/** sessionStorage flag: the loader has already played in this tab session. */
export const LOADER_SESSION_KEY = "sv:loader-played";
/** sessionStorage: the particle tier adaptive quality dropped to. Never raised again. */
export const QUALITY_SESSION_KEY = "sv:tier-cap";

/** Mirrors the design tokens in globals.css for use inside WebGL. */
export const COLORS = {
  bg: "#07090C",
  text: "#E7E5E0",
  glacier: "#8CCFDD",
} as const;

export const MOBILE_BREAKPOINT = 768;
/**
 * When the hero lays the DATA SURFACE beside the copy (the `desk:` variant in globals.css):
 * from 1100px, or from 768px in a landscape window. Otherwise it stacks.
 */
export const HERO_SIDE_BY_SIDE = "(min-width: 1100px), (min-width: 768px) and (orientation: landscape)";

/** Sizes of the per-column / per-station uniform arrays in the particle shader. */
export const MAX_STATS = 8;
export const MAX_STATIONS = 8;
/** GRAPH: project nodes that can be focused, and total nodes (projects + techs). */
export const MAX_PROJECTS = 8;
export const MAX_NODES = 16;

/**
 * Values of `aux.w`, the per-particle behaviour selector read by the particle shader
 * (see FormationData in formations/index.ts). Column / station index is added to the base.
 */
export const AUX_KIND = {
  statsColumn: 1,
  flow: 10,
  station: 11,
  graphNode: 20,
  graphEdge: 21,
  cluster: 30,
  podium: 40,
  podiumNumeral: 41,
  horizon: 50,
  surfaceBurst: 60,
} as const;

/** CLUSTERS: number of capability clusters the shader can focus. */
export const MAX_CLUSTERS = 4;
