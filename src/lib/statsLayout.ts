import type { Vec3, Viewport } from "@/lib/sections";

/**
 * Shared geometry of the STATS moment. The settled camera looks straight down -z at a plane
 * `distance` away, so screen pixels map linearly onto that plane — which is how the particle
 * columns line up with the DOM stats grid.
 */
export const STATS_VIEW = {
  /** Centre of the columns' plane; the camera orbits around it. */
  center: [0, 0, -30] as Vec3,
  distance: 12,
  fov: 36,
} as const;

/** Decorative heights (fraction of the band). Gently staggered: this is NOT a chart. */
const HEIGHT_STAGGER = [0.66, 0.84, 0.74, 0.94, 0.7, 0.88, 0.78, 0.9];

/** DOM hooks set by the About section. */
export const STATS_DOM = {
  stage: "[data-stats-stage]",
  band: "[data-stats-band]",
  cell: "[data-stat-cell]",
} as const;

/** One column's footprint on the stats plane, in world units. */
export interface StatSlot {
  /** Left edge and width. */
  x: number;
  width: number;
  /** World y of the column's base, and its full height. */
  base: number;
  height: number;
}

/** World size of the visible rectangle on the stats plane. */
export function statsPlaneSize(viewport: Viewport) {
  const height = 2 * STATS_VIEW.distance * Math.tan((STATS_VIEW.fov * Math.PI) / 360);
  return { width: height * viewport.aspect, height };
}

/** Evenly spaced columns, used when the DOM grid can't be measured. */
function fallbackSlots(viewport: Viewport, count: number): StatSlot[] {
  const plane = statsPlaneSize(viewport);
  const span = plane.width * 0.84;
  const cell = span / count;
  return Array.from({ length: count }, (_, i) => ({
    x: -span / 2 + i * cell,
    width: cell * 0.42,
    base: -plane.height * 0.22,
    height: plane.height * 0.34 * HEIGHT_STAGGER[i % HEIGHT_STAGGER.length],
  }));
}

/**
 * One slot per stat, measured from the DOM: each column stands in the band above the stats
 * grid, on the left edge of its stat's cell. When several cells share a grid column (the
 * mobile layout wraps to rows) their columns sit side by side inside that cell.
 */
export function statSlots(viewport: Viewport, count: number): StatSlot[] {
  if (typeof document === "undefined") return fallbackSlots(viewport, count);
  const stage = document.querySelector<HTMLElement>(STATS_DOM.stage);
  const band = stage?.querySelector<HTMLElement>(STATS_DOM.band);
  const cells = stage ? Array.from(stage.querySelectorAll<HTMLElement>(STATS_DOM.cell)) : [];
  if (!stage || !band || cells.length !== count) return fallbackSlots(viewport, count);

  const stageRect = stage.getBoundingClientRect();
  const bandRect = band.getBoundingClientRect();
  if (stageRect.width === 0 || bandRect.height < 8) return fallbackSlots(viewport, count);

  const plane = statsPlaneSize(viewport);
  const unitsPerPx = plane.height / viewport.height;
  const toWorldX = (px: number) => (px - stageRect.left - stageRect.width / 2) * unitsPerPx;
  const toWorldY = (px: number) => (viewport.height / 2 - (px - stageRect.top)) * unitsPerPx;

  const rects = cells.map((cell) => cell.getBoundingClientRect());
  const lefts = rects.map((rect) => Math.round(rect.left));
  const base = toWorldY(bandRect.bottom);
  const maxHeight = Math.max(bandRect.height * 0.92, 24) * unitsPerPx;

  return rects.map((rect, i) => {
    const sharing = lefts.filter((left) => left === lefts[i]).length;
    const order = lefts.slice(0, i).filter((left) => left === lefts[i]).length;
    const width = rect.width * (sharing === 1 ? 0.4 : 0.32);
    const step = sharing === 1 ? 0 : (rect.width - width) / (sharing - 1) / 1.35;
    return {
      x: toWorldX(rect.left + order * step),
      width: width * unitsPerPx,
      base,
      height: maxHeight * HEIGHT_STAGGER[i % HEIGHT_STAGGER.length],
    };
  });
}
