import { featuredProjects } from "@/content/content";
import type { CameraKeyframe, SectionDef, Vec3, Viewport } from "@/lib/sections";
import { GRAPH_CENTER, workGraph } from "@/lib/workGraph";

/** Viewport heights the Work stage stays pinned for: overview + 6 case studies + pull-back. */
export const WORK_CHAPTER = { length: 7.5, mobileLength: 5.5 } as const;

export const PROJECT_COUNT = featuredProjects.length;

/**
 * Stop timing, in pin progress q. Overview until the first dive; at stop k the camera
 * arrives at `arrive`, creeps until `leave` (time to read the case study), then moves on.
 * After the last stop it pulls back to the whole graph.
 */
const FIRST_ARRIVAL = 0.15;
const LAST_LEAVE = 0.875;
const STOP_STEP = (LAST_LEAVE - FIRST_ARRIVAL) / (PROJECT_COUNT - 0.38);
const STOP_HOLD = STOP_STEP * 0.62;

export function projectStop(index: number) {
  const arrive = FIRST_ARRIVAL + index * STOP_STEP;
  return { arrive, leave: arrive + STOP_HOLD };
}

const chapterLength = (viewport: Viewport) =>
  viewport.isMobile ? WORK_CHAPTER.mobileLength : WORK_CHAPTER.length;

/** Section-span position → pin progress q. */
export function workQ(at: number, viewport: Viewport): number {
  const length = chapterLength(viewport);
  return (at * (1 + length)) / length;
}

const toAt = (q: number, viewport: Viewport) => {
  const length = chapterLength(viewport);
  return (q * length) / (1 + length);
};

/** Span position a click on project `index`'s node scrolls to: just inside its hold. */
export function projectAt(index: number, viewport: Viewport): number {
  return toAt(projectStop(index).arrive + STOP_HOLD * 0.3, viewport);
}

/** Which case study is showing at pin progress q (-1 during the overview and pull-back). */
export function activeProject(q: number): number {
  if (q < FIRST_ARRIVAL - STOP_STEP * 0.3) return -1;
  if (q > projectStop(PROJECT_COUNT - 1).leave + STOP_STEP * 0.12) return -1;
  let index = 0;
  for (let k = 0; k < PROJECT_COUNT - 1; k++) {
    if (q > (projectStop(k).leave + projectStop(k + 1).arrive) / 2) index = k + 1;
  }
  return index;
}

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 0..1 focus of each project node: up on approach, down as the camera leaves. */
export function projectFocus(q: number, out: Float32Array) {
  out.fill(0);
  for (let k = 0; k < PROJECT_COUNT; k++) {
    const { arrive, leave } = projectStop(k);
    out[k] =
      smoothstep(arrive - STOP_STEP * 0.3, arrive - STOP_STEP * 0.04, q) *
      (1 - smoothstep(leave + STOP_STEP * 0.02, leave + STOP_STEP * 0.24, q));
  }
}

/**
 * The panel sits on the node's outer side: nodes left of the graph's centre get the panel
 * on the left, with the node (and its edges, which run inwards) on the right.
 */
export function workPanelSide(index: number, viewport: Viewport): "left" | "right" {
  const node = workGraph(viewport.isMobile).projects[index];
  return node.position[0] < GRAPH_CENTER[0] ? "left" : "right";
}

const add = (a: Vec3, b: Vec3, scale = 1): Vec3 => [
  a[0] + b[0] * scale,
  a[1] + b[1] * scale,
  a[2] + b[2] * scale,
];

/**
 * WORK — the camera starts on the whole graph, orbiting slowly, then dives to each featured
 * project in turn (node off to one side on desktop, in the upper half on mobile, clear of
 * its case study), and finally pulls back out to the whole graph.
 */
export const workSection: SectionDef = {
  id: "work",
  formation: "graph",
  // Released a little before the stage scrolls away (the pin ends at ~0.88 of the span).
  hold: [0, 0.9],
  dim: 0.1,
  keyframes: (viewport) => {
    const mobile = viewport.isMobile;
    const graph = workGraph(mobile);
    const fov = mobile ? 54 : 42;
    const overviewDistance = mobile ? 25 : 19.5;
    // Far enough back that the node's edges and nearest tech nodes share the frame with it.
    const diveDistance = mobile ? 8.6 : 9;

    const overview = (q: number, degrees: number, lift: number): CameraKeyframe => {
      const angle = (degrees * Math.PI) / 180;
      return {
        at: toAt(q, viewport),
        position: add(GRAPH_CENTER, [
          Math.sin(angle) * overviewDistance,
          lift,
          Math.cos(angle) * overviewDistance,
        ]),
        target: GRAPH_CENTER,
        fov,
      };
    };

    const atProject = (index: number, q: number, creep: number): CameraKeyframe => {
      const node = graph.projects[index].position;
      // +1: node on the right of the frame (panel left). 0 on mobile: node centred, high.
      const side = mobile ? 0 : workPanelSide(index, viewport) === "left" ? 1 : -1;
      return {
        at: toAt(q, viewport),
        position: add(node, [side * 0.5, 0.45, diveDistance - creep]),
        // Aim just past the node towards the panel: the node lands beside the panel's inner
        // edge, with its edges running on into the free half of the frame.
        target: mobile ? add(node, [0, -1.9, 0]) : add(node, [-side * 0.75, -0.1, 0]),
        fov,
      };
    };

    // Between two nodes the camera backs out a little: the calm → energy → calm beat.
    const between = (index: number, q: number): CameraKeyframe => {
      const a = graph.projects[index].position;
      const b = graph.projects[index + 1].position;
      const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      return {
        at: toAt(q, viewport),
        position: add(mid, [0, 0.6, mobile ? 13 : 12.5]),
        target: mid,
        fov: fov + 3,
      };
    };

    const keyframes: CameraKeyframe[] = [
      overview(0, -24, 2.2),
      overview(FIRST_ARRIVAL * 0.4, -10, 1.4),
      overview(FIRST_ARRIVAL * 0.72, 2, 0.9),
    ];
    for (let k = 0; k < PROJECT_COUNT; k++) {
      const { arrive, leave } = projectStop(k);
      keyframes.push(atProject(k, arrive, 0), atProject(k, leave, 0.4));
      if (k < PROJECT_COUNT - 1) keyframes.push(between(k, (leave + projectStop(k + 1).arrive) / 2));
    }
    keyframes.push(overview(0.955, 8, 1.2), overview(1, 0, 0.8));
    return keyframes;
  },
  reducedKeyframes: (viewport) => [
    {
      at: 0,
      position: add(GRAPH_CENTER, [0, 0.8, viewport.isMobile ? 25 : 19.5]),
      target: GRAPH_CENTER,
      fov: viewport.isMobile ? 54 : 42,
    },
  ],
  anchor: (viewport) => toAt(FIRST_ARRIVAL * 0.5, viewport),
};
