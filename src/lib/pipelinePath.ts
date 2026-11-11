import type { Vec3 } from "@/lib/sections";

/**
 * The EXPERIENCE pipeline: one gently curving path through 3D space, shared by the PIPELINE
 * formation (tube + station rings), the particle shader (flow along the path, via a data
 * texture) and the camera keyframes (the camera rides along it).
 *
 * Deliberately free of three.js so section configs can use it without pulling three into
 * the initial bundle.
 */

/** Control points. It starts just behind the STATS columns and heads away from the hero. */
const CONTROL_POINTS: Vec3[] = [
  [0, -0.6, -36],
  [-3.5, 0.3, -46],
  [2.5, 1.0, -57],
  [4.5, -0.2, -69],
  [-2.0, 0.5, -80],
  [-4.5, 1.4, -91],
  [1.0, 0.6, -102],
];

/** Portrait screens see a narrow slice, so the sideways sweep is tightened. */
const NARROW_SWEEP = 0.55;

export const PATH_SAMPLES = 128;

export interface PipelinePath {
  samples: number;
  /** World-space length of the path. */
  length: number;
  /** `samples` points, evenly spaced by arc length. xyz per sample. */
  positions: Float32Array;
  tangents: Float32Array;
  /** Parallel-transported frame: twist-free normals/binormals for the tube cross-section. */
  normals: Float32Array;
  binormals: Float32Array;
}

export interface PathFrame {
  position: Vec3;
  tangent: Vec3;
  normal: Vec3;
  binormal: Vec3;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (a: Vec3): Vec3 => {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};

/** Uniform Catmull-Rom through `points`, with the end tangents extrapolated. */
function catmullRom(points: Vec3[], t: number): Vec3 {
  const segments = points.length - 1;
  const scaled = Math.min(Math.max(t, 0), 1) * segments;
  const i = Math.min(Math.floor(scaled), segments - 1);
  const f = scaled - i;
  const p1 = points[i];
  const p2 = points[i + 1];
  const p0 = points[i - 1] ?? (p1.map((v, k) => 2 * v - p2[k]) as Vec3);
  const p3 = points[i + 2] ?? (p2.map((v, k) => 2 * v - p1[k]) as Vec3);
  const f2 = f * f;
  const f3 = f2 * f;
  return [0, 1, 2].map(
    (k) =>
      0.5 *
      (2 * p1[k] +
        (p2[k] - p0[k]) * f +
        (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f2 +
        (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * f3),
  ) as Vec3;
}

function build(narrow: boolean): PipelinePath {
  const points = CONTROL_POINTS.map(
    ([x, y, z]): Vec3 => [narrow ? x * NARROW_SWEEP : x, y, z],
  );

  // Dense pass → cumulative length → resample evenly by arc length.
  const DENSE = 2048;
  const dense: Vec3[] = [];
  const lengths = new Float32Array(DENSE + 1);
  for (let i = 0; i <= DENSE; i++) {
    dense.push(catmullRom(points, i / DENSE));
    if (i > 0) {
      const d = sub(dense[i], dense[i - 1]);
      lengths[i] = lengths[i - 1] + Math.hypot(d[0], d[1], d[2]);
    }
  }
  const total = lengths[DENSE];

  const samples = PATH_SAMPLES;
  const positions = new Float32Array(samples * 3);
  const tangents = new Float32Array(samples * 3);
  const normals = new Float32Array(samples * 3);
  const binormals = new Float32Array(samples * 3);

  let cursor = 0;
  for (let s = 0; s < samples; s++) {
    const wanted = (s / (samples - 1)) * total;
    while (cursor < DENSE - 1 && lengths[cursor + 1] < wanted) cursor++;
    const span = lengths[cursor + 1] - lengths[cursor];
    const f = span > 0 ? (wanted - lengths[cursor]) / span : 0;
    for (let k = 0; k < 3; k++) {
      positions[s * 3 + k] = dense[cursor][k] + (dense[cursor + 1][k] - dense[cursor][k]) * f;
    }
  }

  const point = (s: number): Vec3 => [positions[s * 3], positions[s * 3 + 1], positions[s * 3 + 2]];
  let normal: Vec3 = [0, 1, 0];
  for (let s = 0; s < samples; s++) {
    const tangent = normalize(sub(point(Math.min(s + 1, samples - 1)), point(Math.max(s - 1, 0))));
    // Parallel transport: carry the previous normal along, re-projected off the tangent.
    const along = dot(normal, tangent);
    normal = normalize([
      normal[0] - tangent[0] * along,
      normal[1] - tangent[1] * along,
      normal[2] - tangent[2] * along,
    ]);
    const binormal = cross(tangent, normal);
    for (let k = 0; k < 3; k++) {
      tangents[s * 3 + k] = tangent[k];
      normals[s * 3 + k] = normal[k];
      binormals[s * 3 + k] = binormal[k];
    }
  }

  return { samples, length: total, positions, tangents, normals, binormals };
}

const cache = new Map<boolean, PipelinePath>();

/** The path for wide (`narrow = false`) or portrait (`narrow = true`) screens. Memoised. */
export function pipelinePath(narrow: boolean): PipelinePath {
  let path = cache.get(narrow);
  if (!path) {
    path = build(narrow);
    cache.set(narrow, path);
  }
  return path;
}

/**
 * Point + frame at arc-length parameter `u`. Outside 0..1 the path continues in a straight
 * line along its end tangent, so the camera can sit before the start or past the end.
 */
export function pathFrame(path: PipelinePath, u: number): PathFrame {
  const last = path.samples - 1;
  const scaled = Math.min(Math.max(u, 0), 1) * last;
  const i = Math.min(Math.floor(scaled), last - 1);
  const f = scaled - i;
  const read = (array: Float32Array): Vec3 =>
    [0, 1, 2].map((k) => array[i * 3 + k] + (array[(i + 1) * 3 + k] - array[i * 3 + k]) * f) as Vec3;

  const tangent = normalize(read(path.tangents));
  const position = read(path.positions);
  const overshoot = (u < 0 ? u : u > 1 ? u - 1 : 0) * path.length;
  if (overshoot !== 0) {
    for (let k = 0; k < 3; k++) position[k] += tangent[k] * overshoot;
  }
  return {
    position,
    tangent,
    normal: normalize(read(path.normals)),
    binormal: normalize(read(path.binormals)),
  };
}

/** Where station `index` of `count` sits on the path (arc-length parameter). */
export function stationU(index: number, count: number): number {
  return (index + 0.5) / count;
}

/** Station ring radius, and the stretch of path (in u) its particles loop over before assembling. */
export const STATION = { radius: 1, loopBefore: 0.1, loopSpan: 0.11 } as const;
/** Tube radius of the flow. */
export const TUBE_RADIUS = 0.3;
