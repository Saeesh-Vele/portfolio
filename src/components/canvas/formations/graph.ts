import { AUX_KIND } from "@/lib/constants";
import { mulberry32 } from "@/lib/device";
import { GRAPH_CENTER, workGraph } from "@/lib/workGraph";
import type { Formation } from "./index";

/**
 * Share of the field per group. The total particle count is fixed by the device tier, so
 * the graph is carved out of the same budget as every other formation.
 */
const PROJECT_SHARE = 0.4;
const TECH_SHARE = 0.1;
const EDGE_SHARE = 0.3;

function gaussian(rand: () => number) {
  const u = Math.max(rand(), 1e-6);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/**
 * GRAPH — featured projects as dense spherical clusters, shared technologies as small
 * clusters, and thin particle edges between each project and the techs it uses. Edge
 * particles drift from project to tech in the shader; every graph particle carries the set
 * of projects it belongs to (a bitmask), so focusing a project lights its node, its edges
 * and its techs while the rest dims (`uFocus`).
 */
export const graph: Formation = (count, viewport) => {
  const positions = new Float32Array(count * 3);
  const aux = new Float32Array(count * 4);
  const rand = mulberry32(0x5eed05);
  const g = workGraph(viewport.isMobile);

  const projectCount = Math.floor(count * PROJECT_SHARE);
  const techCount = g.techs.length ? Math.floor(count * TECH_SHARE) : 0;
  const edgeCount = g.edges.length ? Math.floor(count * EDGE_SHARE) : 0;

  const sphere = (radius: number): [number, number, number] => {
    // 60% on a thin shell, 40% filling it: reads as a solid body with a crisp outline.
    const r = rand() < 0.6 ? radius * (1 + gaussian(rand) * 0.025) : radius * Math.cbrt(rand());
    const z = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - z * z);
    return [Math.cos(a) * s * r, Math.sin(a) * s * r, z * r];
  };

  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    let z: number;

    if (i < projectCount) {
      const index = i % g.projects.length;
      const [px, py, pz] = g.projects[index].position;
      const [ox, oy, oz] = sphere(g.projectRadius);
      x = px + ox;
      y = py + oy;
      z = pz + oz;
      aux[i * 4] = 1 << index;
      aux[i * 4 + 1] = rand();
      aux[i * 4 + 3] = AUX_KIND.graphNode;
    } else if (i < projectCount + techCount) {
      const index = i % g.techs.length;
      const tech = g.techs[index];
      const [ox, oy, oz] = sphere(g.techRadius);
      x = tech.position[0] + ox;
      y = tech.position[1] + oy;
      z = tech.position[2] + oz;
      aux[i * 4] = tech.projects.reduce((mask, project) => mask | (1 << project), 0);
      aux[i * 4 + 1] = rand();
      aux[i * 4 + 2] = 1;
      aux[i * 4 + 3] = AUX_KIND.graphNode;
    } else if (i < projectCount + techCount + edgeCount) {
      const edge = g.edges[i % g.edges.length];
      const from = g.projects[edge.project].position;
      const to = g.techs[edge.tech].position;
      const t = rand();
      // A hair of scatter so the edge is a thread of points, not a ruled line.
      x = from[0] + (to[0] - from[0]) * t + gaussian(rand) * 0.02;
      y = from[1] + (to[1] - from[1]) * t + gaussian(rand) * 0.02;
      z = from[2] + (to[2] - from[2]) * t + gaussian(rand) * 0.02;
      aux[i * 4] = 1 << edge.project;
      aux[i * 4 + 1] = t;
      // Endpoints as indices into uNode: project, then tech (offset by the project count).
      aux[i * 4 + 2] = edge.project + 16 * (g.projects.length + edge.tech);
      aux[i * 4 + 3] = AUX_KIND.graphEdge;
    } else {
      // Ambient dust around the graph.
      x = GRAPH_CENTER[0] + (rand() * 2 - 1) * (viewport.isMobile ? 9 : 17);
      y = GRAPH_CENTER[1] + (rand() * 2 - 1) * 10;
      z = GRAPH_CENTER[2] + 8 - rand() * 26;
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return { positions, aux };
};
