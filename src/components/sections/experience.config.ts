import { experienceChronological } from "@/content/content";
import { pathFrame, pipelinePath, STATION, stationU } from "@/lib/pipelinePath";
import type { CameraKeyframe, SectionDef, Vec3, Viewport } from "@/lib/sections";

/**
 * Viewport heights the Experience stage stays pinned for: 5 stations × 0.8 on desktop,
 * 5 × 0.6 on mobile.
 */
export const EXPERIENCE_CHAPTER = { length: 4, mobileLength: 3 } as const;

export const STATION_COUNT = experienceChronological.length;

/**
 * Station timing, in pin progress q (0 = stage pins, 1 = pin ends). The camera arrives at
 * station k at `arrive`, creeps forward until `leave` (time to read the panel), then travels.
 */
const FIRST_ARRIVAL = 0.08;
const STATION_STEP = (0.92 - FIRST_ARRIVAL) / STATION_COUNT + 0.016;
const STATION_HOLD = STATION_STEP * 0.54;

export function stationWindow(index: number) {
  const arrive = FIRST_ARRIVAL + index * STATION_STEP;
  return { arrive, leave: arrive + STATION_HOLD };
}

/** Section-span position → pin progress q. */
export function experienceQ(at: number, viewport: Viewport): number {
  const length = viewport.isMobile ? EXPERIENCE_CHAPTER.mobileLength : EXPERIENCE_CHAPTER.length;
  return (at * (1 + length)) / length;
}

const toAt = (q: number, viewport: Viewport) => {
  const length = viewport.isMobile ? EXPERIENCE_CHAPTER.mobileLength : EXPERIENCE_CHAPTER.length;
  return (q * length) / (1 + length);
};

/** Which station's panel is showing at pin progress q (-1 before the first). */
export function activeStation(q: number): number {
  if (q < FIRST_ARRIVAL * 0.4) return -1;
  let index = 0;
  for (let k = 0; k < STATION_COUNT - 1; k++) {
    // Hand over halfway through the travel to the next station.
    if (q > (stationWindow(k).leave + stationWindow(k + 1).arrive) / 2) index = k + 1;
  }
  return index;
}

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 0..1 assembly of each station ring: forms on approach and stays formed once passed. */
export function stationLevels(q: number, out: Float32Array) {
  for (let k = 0; k < STATION_COUNT; k++) {
    const { arrive } = stationWindow(k);
    out[k] = smoothstep(arrive - STATION_STEP * 0.5, arrive - STATION_STEP * 0.06, q);
  }
}

/** Panels alternate: even stations sit left of the path (ring on the right), odd ones right. */
export const panelSide = (index: number): "left" | "right" => (index % 2 === 0 ? "left" : "right");

const add = (a: Vec3, b: Vec3, scale: number): Vec3 => [
  a[0] + b[0] * scale,
  a[1] + b[1] * scale,
  a[2] + b[2] * scale,
];
/** Horizontal right-hand vector for a camera travelling along `tangent`. */
const rightOf = (tangent: Vec3): Vec3 => {
  const length = Math.hypot(tangent[2], tangent[0]) || 1;
  return [-tangent[2] / length, 0, tangent[0] / length];
};
const UP: Vec3 = [0, 1, 0];

/**
 * Per-station aim corrections (desktop). `aside` = how far to the panel's side of the ring the
 * camera aims, in ring radii (default 1.3); `lift` = vertical aim offset. Station 4's path
 * curls back across the frame further on, so it aims wider and lower to keep the far tube
 * out from behind its panel.
 */
const DESKTOP_FRAMING: Record<number, { aside: number; lift: number }> = {
  3: { aside: 1.8, lift: -0.4 },
};

/**
 * EXPERIENCE — the camera rides the pipeline, slightly above and behind the point it is
 * looking at. At each station it slows to a creep with the ring off to one side (desktop) or
 * centred in the scene area above the bottom sheet (mobile), clear of that station's panel.
 */
export const experienceSection: SectionDef = {
  id: "experience",
  formation: "pipeline",
  // Released as the pin ends, so the morph into the next section runs while it scrolls in.
  hold: [0.01, 0.78],
  dim: 0.2,
  keyframes: (viewport) => {
    const path = pipelinePath(viewport.isMobile);
    const mobile = viewport.isMobile;
    const fov = mobile ? 54 : 42;
    /** World distance the camera trails behind what it frames. */
    const back = mobile ? 7.4 : 5.8;
    const height = mobile ? 0.7 : 0.95;
    const du = (distance: number) => distance / path.length;

    const atStation = (index: number, q: number, creep: number): CameraKeyframe => {
      const u = stationU(index, STATION_COUNT);
      const station = pathFrame(path, u);
      const rig = pathFrame(path, u - du(back - creep));
      const side = mobile ? 0 : panelSide(index) === "left" ? 1 : -1;
      const position = add(add(rig.position, UP, height), rightOf(rig.tangent), side * 0.55);
      // Desktop: aim away from the ring so it sits off-centre, beside its panel. Mobile: aim
      // at the ring itself; the view shift (src/lib/sheetShift.ts) centres it in the scene
      // area above the bottom sheet, whatever the sheet's and the viewport's heights.
      const framing = mobile ? undefined : DESKTOP_FRAMING[index];
      const target = mobile
        ? station.position
        : add(
            add(station.position, rightOf(station.tangent), -side * STATION.radius * (framing?.aside ?? 1.3)),
            UP,
            framing?.lift ?? 0,
          );
      return { at: toAt(q, viewport), position, target, fov };
    };

    const between = (index: number, q: number): CameraKeyframe => {
      const u = (stationU(index, STATION_COUNT) + stationU(index + 1, STATION_COUNT)) / 2;
      const rig = pathFrame(path, u - du(back));
      return {
        at: toAt(q, viewport),
        position: add(rig.position, UP, height + 0.3),
        target: pathFrame(path, u + du(1.5)).position,
        fov: fov + 3,
      };
    };

    const start = pathFrame(path, -du(mobile ? 8 : 6));
    const keyframes: CameraKeyframe[] = [
      {
        at: 0,
        position: add(start.position, UP, 1.7),
        target: pathFrame(path, du(5)).position,
        fov: fov + 2,
      },
    ];
    for (let k = 0; k < STATION_COUNT; k++) {
      const { arrive, leave } = stationWindow(k);
      keyframes.push(atStation(k, arrive, 0), atStation(k, leave, 0.55));
      if (k < STATION_COUNT - 1) {
        keyframes.push(between(k, (leave + stationWindow(k + 1).arrive) / 2));
      }
    }
    keyframes.push(atStation(STATION_COUNT - 1, 1, 0.85));
    return keyframes;
  },
  // Static view from high on the left, aimed so the whole pipeline stays in the right half
  // of the frame, clear of the timeline list.
  reducedKeyframes: (viewport) => {
    const path = pipelinePath(viewport.isMobile);
    const from = pathFrame(path, 0);
    const aim = pathFrame(path, 0.1);
    return [
      {
        at: 0,
        position: add(add(from.position, UP, 5), rightOf(from.tangent), viewport.isMobile ? 0 : -4),
        target: add(aim.position, rightOf(aim.tangent), viewport.isMobile ? 0 : -2),
        fov: viewport.isMobile ? 58 : 46,
      },
    ];
  },
  anchor: (viewport) => toAt(stationWindow(0).arrive + STATION_HOLD * 0.25, viewport),
};
