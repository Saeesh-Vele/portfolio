import type { Viewport } from "@/lib/sections";
import { clusters } from "./clusters";
import { graph } from "./graph";
import { horizon } from "./horizon";
import { noise } from "./noise";
import { pipeline } from "./pipeline";
import { podium } from "./podium";
import { stats } from "./stats";
import { surface } from "./surface";

/**
 * Optional per-particle data for formations whose particles do more than sit at a target.
 * `aux` is count * 4 floats; `aux.w` selects the behaviour in the particle shader:
 *   0        plain target (the default when a formation returns only positions)
 *   1..8     STATS column (index + 1): x = height within the column 0..1, y = random
 *   10       PIPELINE flow: x = curve parameter, y = angle round the tube, z = radius
 *   11..18   PIPELINE station (index + 11): x = start of its local loop on the curve,
 *            y / z as for flow; the target position is its place on the station ring
 *   20       GRAPH node: x = bitmask of the projects it belongs to, y = random, z = 1 for techs
 *   21       GRAPH edge: x = project bitmask, y = position along the edge 0..1,
 *            z = start node + 16 * end node (indices into uNode)
 *   30..33   CLUSTERS cluster (index + 30): the position is local to the cluster's shape,
 *            which the shader places in its on-screen box (see src/lib/clusterLayout.ts)
 *   40       PODIUM step (static)
 *   41       PODIUM numeral: x = how far it rises, y = random
 *   50       HORIZON terrain point (swells slowly in the shader)
 *   60       SURFACE burst: x = across the bar grid -0.5..0.5, y = front-to-back 0..1,
 *            z = random. The position is its burst offset in the grid's local units; the
 *            shader launches it from its bar's top (uSurface) as uBurst sweeps past its row
 */
export interface FormationData {
  positions: Float32Array;
  aux: Float32Array;
}

/**
 * A formation maps a particle count + viewport to target positions:
 * a Float32Array of length count * 3 (x, y, z per particle), in world units —
 * or a FormationData when it also needs per-particle shader data.
 */
export type Formation = (count: number, viewport: Viewport) => Float32Array | FormationData;

const registry = new Map<string, Formation>();

export function registerFormation(id: string, formation: Formation) {
  registry.set(id, formation);
}

export function getFormation(id: string): Formation {
  const formation = registry.get(id);
  if (!formation) throw new Error(`Unknown formation "${id}" — register it in formations/index.ts`);
  return formation;
}

// Adding a section = write a formation + register it here.
registerFormation("noise", noise);
registerFormation("surface", surface);
registerFormation("stats", stats);
registerFormation("pipeline", pipeline);
registerFormation("graph", graph);
registerFormation("clusters", clusters);
registerFormation("podium", podium);
registerFormation("horizon", horizon);
