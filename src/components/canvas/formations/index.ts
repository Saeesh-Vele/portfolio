import type { Viewport } from "@/lib/sections";
import { name } from "./name";
import { noise } from "./noise";

/**
 * A formation maps a particle count + viewport to target positions:
 * a Float32Array of length count * 3 (x, y, z per particle), in world units.
 */
export type Formation = (count: number, viewport: Viewport) => Float32Array;

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
