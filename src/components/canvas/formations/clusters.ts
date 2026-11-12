import { capabilities } from "@/content/content";
import { AUX_KIND, MAX_CLUSTERS } from "@/lib/constants";
import { CLUSTER_ASPECT, CLUSTER_PITCH } from "@/lib/clusterLayout";
import { mulberry32 } from "@/lib/device";
import { CLUSTERS_VIEW } from "@/lib/phase4Layout";
import type { Formation } from "./index";

/** Share of the particles that make up the four shapes; the rest is far background dust. */
const CLUSTER_SHARE = 0.5;

type Rand = () => number;
type Point = [number, number, number];

function gaussian(rand: Rand) {
  const u = Math.max(rand(), 1e-6);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

const pick = (rand: Rand, n: number) => Math.min(n - 1, Math.floor(rand() * n));
const jitter = (rand: Rand, amount: number) => (rand() * 2 - 1) * amount;

/** Data — a 4 × 4 × 4 cubic lattice: nodes plus the edges between neighbours. */
function lattice(rand: Rand): Point {
  const n = 4;
  const at = (k: number) => -1 + (2 * k) / (n - 1);
  const p: Point = [at(pick(rand, n)), at(pick(rand, n)), at(pick(rand, n))];
  if (rand() < 0.4) {
    return [p[0] + gaussian(rand) * 0.03, p[1] + gaussian(rand) * 0.03, p[2] + gaussian(rand) * 0.03];
  }
  const axis = pick(rand, 3);
  p[axis] = rand() * 2 - 1;
  return [p[0] + jitter(rand, 0.01), p[1] + jitter(rand, 0.01), p[2] + jitter(rand, 0.01)];
}

/** AI — a small neural net: three layers of nodes, every node wired to the next layer. */
const NET_LAYERS = [4, 5, 3].map((size, layer) =>
  Array.from({ length: size }, (_, k): Point => [
    (layer - 1) * 1.6,
    (k - (size - 1) / 2) * 0.56,
    (k % 2 === 0 ? 0.24 : -0.24) * (layer === 1 ? -1 : 1),
  ]),
);
const NET_EDGES = [0, 1].flatMap((layer) =>
  NET_LAYERS[layer].flatMap((a) => NET_LAYERS[layer + 1].map((b): [Point, Point] => [a, b])),
);
const NET_NODES = NET_LAYERS.flat();

function net(rand: Rand): Point {
  if (rand() < 0.55) {
    const node = NET_NODES[pick(rand, NET_NODES.length)];
    const dir: Point = [gaussian(rand), gaussian(rand), gaussian(rand)];
    const length = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const r = 0.13 * (0.75 + 0.25 * rand());
    return [node[0] + (dir[0] / length) * r, node[1] + (dir[1] / length) * r, node[2] + (dir[2] / length) * r];
  }
  const [a, b] = NET_EDGES[pick(rand, NET_EDGES.length)];
  const t = rand();
  return [
    a[0] + (b[0] - a[0]) * t + jitter(rand, 0.008),
    a[1] + (b[1] - a[1]) * t + jitter(rand, 0.008),
    a[2] + (b[2] - a[2]) * t + jitter(rand, 0.008),
  ];
}

/** Web — four parallel planes stacked on y, each drawn as an outlined grid. */
function planes(rand: Rand): Point {
  const halfX = 1.3;
  const halfZ = 0.85;
  const y = (pick(rand, 4) - 1.5) * 0.75;
  const roll = rand();
  let x = (rand() * 2 - 1) * halfX;
  let z = (rand() * 2 - 1) * halfZ;
  if (roll < 0.3) {
    // Outline.
    if (rand() < halfX / (halfX + halfZ)) z = rand() < 0.5 ? -halfZ : halfZ;
    else x = rand() < 0.5 ? -halfX : halfX;
  } else if (roll < 0.8) {
    // Grid lines.
    if (rand() < 0.5) x = -halfX + (2 * halfX * pick(rand, 7)) / 6;
    else z = -halfZ + (2 * halfZ * pick(rand, 5)) / 4;
  }
  return [x + jitter(rand, 0.006), y + jitter(rand, 0.004), z + jitter(rand, 0.006)];
}

/** Cloud & data stores — a hollow spherical shell with a few latitude and meridian rings. */
function shell(rand: Rand): Point {
  const roll = rand();
  let p: Point;
  if (roll < 0.55) {
    p = [gaussian(rand), gaussian(rand), gaussian(rand)];
  } else if (roll < 0.8) {
    const y = [-0.6, 0, 0.6][pick(rand, 3)];
    const r = Math.sqrt(1 - y * y);
    const a = rand() * Math.PI * 2;
    p = [Math.cos(a) * r, y, Math.sin(a) * r];
  } else {
    const meridian = (pick(rand, 4) * Math.PI) / 4;
    const a = rand() * Math.PI * 2;
    p = [Math.cos(a) * Math.cos(meridian), Math.sin(a), Math.cos(a) * Math.sin(meridian)];
  }
  const length = Math.hypot(p[0], p[1], p[2]) || 1;
  const r = 1 + jitter(rand, 0.012);
  return [(p[0] / length) * r, (p[1] / length) * r, (p[2] / length) * r];
}

/** One shape per capability column, in column order: Data, AI, Web, Cloud & data stores. */
const SHAPES = [lattice, net, planes, shell];

/**
 * CLUSTERS — one distinct shape per capability column. Cluster positions are NOT world
 * positions: they are local to the shape, normalised so that the shape, turned about its
 * vertical axis and tilted by CLUSTER_PITCH, always fits a box of half-height 1 and
 * half-width CLUSTER_ASPECT. The shader places that box in front of the camera where the DOM
 * says the cluster belongs (`uClusterBox`) and slides it out of the merged mass
 * (`uClusterHome`) as `uSpread[cluster]` runs 0 → 1. The remaining particles are plain,
 * distant dust behind everything.
 */
export const clusters: Formation = (count, viewport) => {
  const positions = new Float32Array(count * 3);
  const aux = new Float32Array(count * 4);
  const rand = mulberry32(0x5eed06);
  const groups = Math.min(capabilities.columns.length, MAX_CLUSTERS, SHAPES.length);
  const clusterCount = Math.floor(count * CLUSTER_SHARE);
  const [cx, cy, cz] = CLUSTERS_VIEW.center;

  const cosP = Math.cos(CLUSTER_PITCH);
  const sinP = Math.sin(CLUSTER_PITCH);
  /** Per shape: tallest it gets once tilted, and widest it gets at any turn. */
  const tall = new Float32Array(groups);
  const wide = new Float32Array(groups);

  for (let i = 0; i < count; i++) {
    if (i < clusterCount) {
      const group = i % groups;
      const [x, y, z] = SHAPES[group](rand);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      aux[i * 4 + 3] = AUX_KIND.cluster + group;
      const radial = Math.hypot(x, z);
      tall[group] = Math.max(tall[group], Math.abs(y) * cosP + radial * sinP);
      wide[group] = Math.max(wide[group], radial);
    } else {
      // Dust, well behind the clusters: small and faint by the shader's depth falloff.
      const depth = 14 + rand() * 18;
      positions[i * 3] = cx + (rand() * 2 - 1) * (viewport.isMobile ? 12 : 30);
      positions[i * 3 + 1] = cy + (rand() * 2 - 1) * 14;
      positions[i * 3 + 2] = cz - depth;
    }
  }

  for (let i = 0; i < clusterCount; i++) {
    const group = i % groups;
    const scale = Math.min(1 / tall[group], CLUSTER_ASPECT / wide[group]);
    positions[i * 3] *= scale;
    positions[i * 3 + 1] *= scale;
    positions[i * 3 + 2] *= scale;
  }
  return { positions, aux };
};
