import type { Viewport } from "@/lib/sections";
import { graph } from "./graph";
import { name } from "./name";
import { noise } from "./noise";
import { pipeline } from "./pipeline";
import { stats } from "./stats";

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
registerFormation("name", name);
registerFormation("stats", stats);
registerFormation("pipeline", pipeline);
registerFormation("graph", graph);
