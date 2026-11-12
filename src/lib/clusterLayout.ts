import { MAX_CLUSTERS } from "@/lib/constants";

/**
 * CLUSTERS ↔ DOM alignment (three-free). The capability clusters live in the empty band
 * between the heading and the columns. The DOM measures that band every frame and this turns
 * it into one box per cluster, in viewport pixels; the particle field places each cluster
 * shape inside its box, in front of the camera. A shape is authored to fit a box of
 * half-height 1 and half-width CLUSTER_ASPECT (see formations/clusters.ts), so a cluster can
 * never reach the heading above the band or the column text below it.
 */

/** Fixed tilt of every cluster shape toward the viewer, in radians. */
export const CLUSTER_PITCH = 0.32;
/** Widest a shape may be: its half-width in units of its half-height. */
export const CLUSTER_ASPECT = 1.7;
/** Share of a box the shape fills; the rest is margin for drift and pointer scatter. */
const FILL = 0.8;
/** Phones' 2 × 2: the cells are already separated by the gap between them, so fill more. */
const FILL_GRID = 0.9;
/**
 * The widest the current four shapes actually get (half-width / half-height, at any turn):
 * they are about as wide as they are tall (≈ 1.03, see formations/clusters.ts). The 2 × 2
 * uses this rather than the CLUSTER_ASPECT bound so the shapes can fill their cells.
 */
const GRID_ASPECT = 1.1;
/** Narrow screens: a band at least this tall (px) holds the clusters 2 × 2, else in a row. */
const TWO_ROWS_MIN = 150;

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Shape scale (its half-height in px) that fits a box. */
const fit = (width: number, height: number, fill = FILL, aspect = CLUSTER_ASPECT) =>
  fill * Math.max(0, Math.min(height / 2, width / 2 / aspect));

/**
 * Writes `boxes` (per cluster: centre x, centre y, scale — all px) and `home` (the same for
 * the merged mass the clusters separate from).
 *
 * `columns`: the x-extent of each capability column when they sit side by side (desktop), so
 * each cluster is centred above its column. Null on narrow screens, where the band is split
 * 2 × 2, or into a row whose active cluster (`activity` 0..1) takes more of the width.
 */
export function layoutClusters(
  band: Box,
  columns: { left: number; width: number }[] | null,
  activity: ArrayLike<number>,
  boxes: Float32Array,
  home: Float32Array,
) {
  const n = MAX_CLUSTERS;
  let largest = 0;
  const put = (
    i: number,
    left: number,
    top: number,
    width: number,
    height: number,
    grid = false,
  ) => {
    const scale = grid ? fit(width, height, FILL_GRID, GRID_ASPECT) : fit(width, height);
    boxes[i * 3] = left + width / 2;
    boxes[i * 3 + 1] = top + height / 2;
    boxes[i * 3 + 2] = scale;
    largest = Math.max(largest, scale);
  };

  if (columns && columns.length >= n) {
    for (let i = 0; i < n; i++) put(i, columns[i].left, band.top, columns[i].width, band.height);
  } else if (band.height >= TWO_ROWS_MIN) {
    const w = band.width / 2;
    const h = band.height / 2;
    for (let i = 0; i < n; i++) {
      put(i, band.left + (i % 2) * w, band.top + Math.floor(i / 2) * h, w, h, true);
    }
  } else {
    let total = 0;
    for (let i = 0; i < n; i++) total += 1 + 1.6 * (activity[i] ?? 0);
    let left = band.left;
    for (let i = 0; i < n; i++) {
      const w = (band.width * (1 + 1.6 * (activity[i] ?? 0))) / total;
      put(i, left, band.top, w, band.height);
      left += w;
    }
  }

  home[0] = band.left + band.width / 2;
  home[1] = band.top + band.height / 2;
  home[2] = Math.min(fit(band.width, band.height), largest * 1.3);
}
