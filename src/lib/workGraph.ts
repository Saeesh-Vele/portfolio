import { featuredProjects } from "@/content/content";
import type { Vec3 } from "@/lib/sections";

/**
 * The WORK graph: featured projects and the technologies they share, as a bipartite graph.
 * Everything is derived from content.ts — a tech becomes a node when it appears in the
 * stacks of two or more featured projects. Shared by the GRAPH formation, the shader
 * uniforms, the camera keyframes and the DOM labels. Free of three.js (see CLAUDE.md).
 */

/** Centre of the graph in world space: beyond the end of the pipeline. */
export const GRAPH_CENTER: Vec3 = [2, 1, -128];
/** Mobile shows only the most-shared techs. */
const MOBILE_TECH_LIMIT = 5;

/**
 * Project slots, relative to the centre, by project order. They alternate left / right so
 * each case-study panel can sit on the node's outer side (see work.config.ts), and vary in
 * depth so the graph reads as a volume while the camera orbits.
 */
const PROJECT_SLOTS: Vec3[] = [
  [-5.4, 2.7, 1.4],
  [5.6, 2.9, -1.6],
  [-6.6, -0.3, -2.0],
  [6.6, 0.3, 1.8],
  [-4.8, -3.2, 0.9],
  [5.0, -3.0, -1.2],
  [-2.2, 4.6, -2.4],
  [2.4, -4.8, 2.2],
];

export interface GraphTech {
  name: string;
  /** Indices of the featured projects that use it. */
  projects: number[];
  position: Vec3;
}

export interface WorkGraph {
  /** One per featured project, in content order. */
  projects: { slug: string; title: string; position: Vec3 }[];
  techs: GraphTech[];
  /** project index → tech index. */
  edges: { project: number; tech: number }[];
  /** World radius of a project node / a tech node. */
  projectRadius: number;
  techRadius: number;
}

function build(mobile: boolean): WorkGraph {
  // Portrait screens: a tall, narrow arrangement.
  const sx = mobile ? 0.42 : 1;
  const sy = mobile ? 1.3 : 1;
  const place = ([x, y, z]: Vec3): Vec3 => [
    GRAPH_CENTER[0] + x * sx,
    GRAPH_CENTER[1] + y * sy,
    GRAPH_CENTER[2] + z,
  ];

  const projects = featuredProjects.map((project, index) => ({
    slug: project.slug,
    title: project.title,
    position: place(PROJECT_SLOTS[index % PROJECT_SLOTS.length]),
  }));

  // Tech → the projects that list it, in first-appearance order.
  const users = new Map<string, number[]>();
  featuredProjects.forEach((project, index) => {
    for (const tech of project.stack) {
      const list = users.get(tech) ?? [];
      if (!list.includes(index)) list.push(index);
      users.set(tech, list);
    }
  });
  let shared = [...users.entries()].filter(([, list]) => list.length >= 2);
  if (mobile) {
    // Stable sort: most shared first, ties keep first-appearance order.
    shared = [...shared].sort((a, b) => b[1].length - a[1].length).slice(0, MOBILE_TECH_LIMIT);
  }

  // Techs sit on an inner ring, ordered by the direction of the projects they connect, so
  // edges fan out rather than tangle. Alternating depth keeps neighbours apart.
  const withAngle = shared.map(([name, list]) => {
    const cx = list.reduce((sum, i) => sum + PROJECT_SLOTS[i][0], 0) / list.length;
    const cy = list.reduce((sum, i) => sum + PROJECT_SLOTS[i][1], 0) / list.length;
    return { name, projects: list, angle: Math.atan2(cy, cx) };
  });
  withAngle.sort((a, b) => a.angle - b.angle);
  const techs: GraphTech[] = withAngle.map(({ name, projects: list }, i) => {
    const angle = -Math.PI + ((i + 0.5) / withAngle.length) * Math.PI * 2;
    return {
      name,
      projects: list,
      position: place([Math.cos(angle) * 2.5, Math.sin(angle) * 1.5, i % 2 === 0 ? 1.1 : -1.1]),
    };
  });

  const edges = techs.flatMap((tech, techIndex) =>
    tech.projects.map((project) => ({ project, tech: techIndex })),
  );

  return {
    projects,
    techs,
    edges,
    projectRadius: mobile ? 0.62 : 0.85,
    techRadius: mobile ? 0.16 : 0.2,
  };
}

const cache = new Map<boolean, WorkGraph>();

export function workGraph(mobile: boolean): WorkGraph {
  let graph = cache.get(mobile);
  if (!graph) {
    graph = build(mobile);
    cache.set(mobile, graph);
  }
  return graph;
}
