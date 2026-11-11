import type { SectionDef, Vec3, Viewport } from "@/lib/sections";

/** Measured DOM extent of a section, in document pixels. */
export interface SectionSpan {
  id: string;
  top: number;
  height: number;
}

interface FormationHold {
  name: string;
  /** Global scroll progress (0..1) where the formation is fully formed. */
  start: number;
  end: number;
  dim: number;
}

/** Everything the 3D scene needs to turn global scroll progress into camera + formation. */
export interface Timeline {
  /** Global progress of each camera keyframe, ascending. */
  stops: number[];
  positions: Vec3[];
  targets: Vec3[];
  fovs: number[];
  holds: FormationHold[];
  /** Global progress of each section's span start/end. Not clamped: may exceed 0..1. */
  spans: { id: string; start: number; end: number }[];
}

export interface FormationState {
  from: string;
  to: string;
  progress: number;
  dim: number;
}

/** Shortest scroll distance a morph between two formations may be squeezed into. */
const MIN_MORPH_VIEWPORTS = 0.45;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Builds the timeline from section configs plus their measured DOM spans, so a section's
 * height can change without any other section's config needing to know.
 */
export function buildTimeline(
  sections: SectionDef[],
  spans: SectionSpan[],
  maxScroll: number,
  viewport: Viewport,
  reducedMotion = false,
): Timeline {
  const toProgress = (px: number) => (maxScroll > 0 ? clamp01(px / maxScroll) : 0);
  const timeline: Timeline = {
    stops: [],
    positions: [],
    targets: [],
    fovs: [],
    holds: [],
    spans: [],
  };

  for (const section of sections) {
    const span = spans.find((s) => s.id === section.id);
    if (!span) continue;

    timeline.spans.push({
      id: section.id,
      start: maxScroll > 0 ? span.top / maxScroll : 0,
      end: maxScroll > 0 ? (span.top + span.height) / maxScroll : 0,
    });

    const keyframes =
      reducedMotion && section.reducedKeyframes
        ? section.reducedKeyframes(viewport)
        : section.keyframes(viewport);
    for (const keyframe of keyframes) {
      const stop = toProgress(span.top + keyframe.at * span.height);
      const last = timeline.stops[timeline.stops.length - 1];
      // Keyframes that collapse onto the previous stop (e.g. past the end of the page) are
      // unreachable; dropping them keeps the stops strictly ascending.
      if (last !== undefined && stop - last < 1e-4) continue;
      timeline.stops.push(stop);
      timeline.positions.push(keyframe.position);
      timeline.targets.push(keyframe.target);
      timeline.fovs.push(keyframe.fov);
    }

    const holds = [
      { formation: section.formation, hold: section.hold, dim: section.dim },
      ...(section.extraHolds ?? []),
    ];
    for (const { formation, hold, dim } of holds) {
      timeline.holds.push({
        name: formation,
        start: toProgress(span.top + hold[0] * span.height),
        end: toProgress(span.top + hold[1] * span.height),
        dim,
      });
    }
  }

  // Holds are authored per section, in units of that section's height, so on some viewports
  // one can run past the start of the next. Pull it back to leave room for the morph.
  const gap = maxScroll > 0 ? (viewport.height * MIN_MORPH_VIEWPORTS) / maxScroll : 0;
  for (let i = 0; i < timeline.holds.length - 1; i++) {
    const hold = timeline.holds[i];
    const next = timeline.holds[i + 1];
    if (next.start - hold.end < gap) hold.end = Math.max(hold.start, next.start - gap);
  }

  return timeline;
}

/**
 * Global progress → position inside one section's scroll span (the `at` used by keyframes).
 * Below 0 before the section, above 1 after it. Returns null if the section isn't measured.
 */
export function sectionAt(timeline: Timeline, id: string, progress: number): number | null {
  const span = timeline.spans.find((s) => s.id === id);
  if (!span || span.end - span.start < 1e-6) return null;
  return (progress - span.start) / (span.end - span.start);
}

/** Index of the keyframe segment containing `progress`, plus the 0..1 position inside it. */
export function locate(timeline: Timeline, progress: number): { index: number; local: number } {
  const { stops } = timeline;
  const n = stops.length;
  if (n < 2 || progress <= stops[0]) return { index: 0, local: 0 };
  if (progress >= stops[n - 1]) return { index: n - 2, local: 1 };
  let index = 0;
  while (index < n - 2 && progress > stops[index + 1]) index++;
  const span = stops[index + 1] - stops[index];
  return { index, local: span > 0 ? (progress - stops[index]) / span : 0 };
}

/** Global progress → parameter on the camera splines (uniform by keyframe index). */
export function cameraParam(timeline: Timeline, progress: number): number {
  const n = timeline.stops.length;
  if (n < 2) return 0;
  const { index, local } = locate(timeline, progress);
  return (index + local) / (n - 1);
}

/** Index of the keyframe closest to `progress` (reduced motion snaps to this). */
export function nearestKeyframe(timeline: Timeline, progress: number): number {
  let best = 0;
  let bestDistance = Infinity;
  timeline.stops.forEach((stop, i) => {
    const distance = Math.abs(stop - progress);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

/** Global progress → which two formations to morph between, and how far along. */
export function formationAt(timeline: Timeline, progress: number): FormationState {
  const { holds } = timeline;
  if (holds.length === 0) return { from: "noise", to: "noise", progress: 0, dim: 0 };
  if (holds.length === 1) {
    return { from: holds[0].name, to: holds[0].name, progress: 0, dim: holds[0].dim };
  }
  for (let i = 0; i < holds.length - 1; i++) {
    const a = holds[i];
    const b = holds[i + 1];
    if (progress < b.start || i === holds.length - 2) {
      const span = b.start - a.end;
      const t = span > 1e-6 ? clamp01((progress - a.end) / span) : progress >= b.start ? 1 : 0;
      return { from: a.name, to: b.name, progress: t, dim: a.dim + (b.dim - a.dim) * t };
    }
  }
  const last = holds[holds.length - 1];
  return { from: last.name, to: last.name, progress: 0, dim: last.dim };
}
