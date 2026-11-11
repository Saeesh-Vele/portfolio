import { create } from "zustand";
import { MAX_NODES, MAX_PROJECTS, MAX_STATIONS, MAX_STATS } from "@/lib/constants";
import type { Tier } from "@/lib/device";
import type { Viewport } from "@/lib/sections";
import type { Timeline } from "@/lib/timeline";

/**
 * Reactive site state. Changes here re-render subscribers, so only slow-changing values
 * belong in it. Anything that changes every frame goes in `frame` below.
 */
interface SiteState {
  /** Loader finished or skipped: the particle intro and text reveals may start. */
  loaded: boolean;
  reducedMotion: boolean;
  /** Null until the display font is ready and the viewport has been measured. */
  viewport: Viewport | null;
  tier: Tier;
  /** Null until the sections have been measured. */
  timeline: Timeline | null;
  setLoaded: (loaded: boolean) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setViewport: (viewport: Viewport, tier: Tier) => void;
  setTimeline: (timeline: Timeline) => void;
}

export const useSite = create<SiteState>((set) => ({
  loaded: false,
  reducedMotion: false,
  viewport: null,
  tier: "desktop",
  timeline: null,
  setLoaded: (loaded) => set({ loaded }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setViewport: (viewport, tier) => set({ viewport, tier }),
  setTimeline: (timeline) => set({ timeline }),
}));

/**
 * Per-frame scroll/rig values. Written by SiteRuntime (scroll + pointer events) and the
 * camera rig; read inside useFrame. Deliberately not React state.
 */
export const frame = {
  /** Raw global scroll progress 0..1, straight from Lenis / the scroll event. */
  target: 0,
  /** Damped progress the camera and the formation morph both follow. */
  progress: 0,
  /** Raw scroll position in px, used to derive velocity. */
  scrollY: 0,
  /** Smoothed scroll velocity mapped to 0..1 — drives uEnergy. */
  energy: 0,
  /** Pointer in normalised device coordinates (-1..1, y up). */
  pointerX: 0,
  pointerY: 0,
  /** 1 while a pointer is over the page, else 0. */
  pointerActive: 0,
  /**
   * STATS: 0..1 rise of each bar column, written by the same tween that drives its DOM
   * counter so the two stay in sync.
   */
  statsRise: new Float32Array(MAX_STATS),
  /** PIPELINE: 0..1 assembly of each station ring, written by the particle field. */
  stationLevels: new Float32Array(MAX_STATIONS),
  /** Screen position (0..1, origin top-left) of the current station's tag, and its opacity. */
  tag: { x: 0, y: 0, opacity: 0 },
  /** GRAPH: 0..1 focus of each project node, written by the particle field. */
  projectFocus: new Float32Array(MAX_PROJECTS),
  /**
   * GRAPH: per node (projects first, then techs) x, y (0..1 from top-left), opacity, and
   * pixels per world unit at the node's depth. Read by the DOM labels that follow the nodes.
   */
  nodes: new Float32Array(MAX_NODES * 4),
  /** Read by the ?debug=1 overlay only: what the particle field is currently rendering. */
  debug: { formation: "", dpr: 1, particles: 0 },
};
