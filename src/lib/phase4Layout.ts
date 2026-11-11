import type { Vec3 } from "@/lib/sections";

/**
 * World placement of the three closing moments, shared by their formations and camera
 * keyframes. Each sits further down -z than the last, beyond the WORK graph.
 */

/** CLUSTERS: the point the four clusters separate from, and the camera's distance from it. */
export const CLUSTERS_VIEW = { center: [0, 0.6, -172] as Vec3, distance: 14, fov: 40 } as const;

/** Cluster centres relative to CLUSTERS_VIEW.center: a row on wide screens, 2 × 2 on portrait. */
export function clusterOffsets(mobile: boolean): Vec3[] {
  return mobile
    ? [
        [-1.15, 2.2, 0.4],
        [1.15, 2.4, -0.5],
        [-1.15, -0.5, -0.4],
        [1.15, -0.3, 0.5],
      ]
    : [
        // Raised into the band between the heading and the columns, one above each column.
        [-5.7, 2.1, 0.5],
        [-1.9, 2.4, -0.6],
        [1.9, 2.0, 0.6],
        [5.7, 2.3, -0.4],
      ];
}

/** PODIUM: centre of the podium's base. Steps are `step` wide and deep. */
export const PODIUM_VIEW = {
  base: [0, -1.9, -206] as Vec3,
  step: 2,
  /** Heights of the 1st / 2nd / 3rd steps. 2nd is on the left, 3rd on the right. */
  heights: [2.5, 1.75, 1.1],
  numeralHeight: 2.3,
} as const;

/** HORIZON: where the terrain starts (nearest edge), its floor level and extent. */
export const HORIZON_VIEW = {
  start: [0, -3, -234] as Vec3,
  halfWidth: 46,
  depth: 110,
} as const;

/** Static terrain height at (x, z): a few long, low swells. */
export function terrainHeight(x: number, z: number): number {
  return (
    Math.sin(x * 0.11 + 1.3) * Math.cos(z * 0.09) * 0.9 +
    Math.sin(x * 0.05 - z * 0.07) * 0.7 +
    Math.cos(z * 0.031 + 0.6) * 0.5
  );
}
