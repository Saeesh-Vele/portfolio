"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "@/lib/constants";
import { frame, useSite } from "@/store/site";

/**
 * One faint time series. `depth` 0 = nearest: brighter, faster, larger, more scroll
 * parallax. `style` 0 = smooth, 1 = spiky (bursts over a quiet baseline), 2 = stepped.
 */
interface Trace {
  y: number;
  amp: number;
  speed: number;
  alpha: number;
  style: number;
  seed: number;
  depth: number;
}

/** 6 traces, 3–8% opacity, staggered in depth. y / amp in viewport heights from the top. */
const TRACES: Trace[] = [
  { y: 0.16, amp: 0.05, speed: 2.4, alpha: 0.05, style: 0, seed: 11, depth: 0.55 },
  { y: 0.3, amp: 0.07, speed: 3.6, alpha: 0.08, style: 1, seed: 23, depth: 0.1 },
  { y: 0.45, amp: 0.04, speed: 1.7, alpha: 0.035, style: 2, seed: 37, depth: 0.9 },
  { y: 0.6, amp: 0.06, speed: 3.0, alpha: 0.06, style: 0, seed: 41, depth: 0.3 },
  { y: 0.74, amp: 0.045, speed: 2.0, alpha: 0.04, style: 1, seed: 53, depth: 0.75 },
  { y: 0.88, amp: 0.065, speed: 3.3, alpha: 0.07, style: 2, seed: 67, depth: 0.2 },
];
/** Samples across the screen. Wider spacing on narrow screens keeps segments a similar size. */
const SAMPLES = { desktop: 150, mobile: 70 };
/** Faint horizontal gridlines (viewport fractions). */
const GRID_LINES = 9;
/** Seconds between pings, and how long a ping takes to cross its trace. */
const PING = { min: 3, max: 6, duration: 2.6 };
/** Scroll parallax, in viewport heights per viewport scrolled, for the nearest trace. */
const PARALLAX = 0.06;

/** Shared GLSL: the trace's value at a (whole) sample index, -1..1. */
const seriesGLSL = /* glsl */ `
uniform float uStyle;
uniform float uSeed;

float hash(float n) { return fract(sin(mod(n, 4096.0) * 12.9898 + uSeed * 78.233) * 43758.5453); }
float smoothNoise(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
}
float series(float k) {
  if (uStyle < 0.5) {
    // Smooth: slow wander plus a little sample jitter.
    return (smoothNoise(k * 0.09) - 0.5) * 1.4 + (smoothNoise(k * 0.37) - 0.5) * 0.45 + (hash(k) - 0.5) * 0.12;
  }
  if (uStyle < 1.5) {
    // Spiky: a quiet baseline with occasional bursts.
    float spike = step(0.93, hash(k + 17.0)) * (0.6 + hash(k + 3.0));
    return (smoothNoise(k * 0.06) - 0.5) * 0.5 + (hash(k) - 0.5) * 0.18 + spike - 0.3;
  }
  // Stepped: holds a level for a few samples, then jumps.
  return (hash(floor(k / 7.0)) - 0.5) * 1.5 + (hash(k) - 0.5) * 0.06;
}
`;

const traceVertex = /* glsl */ `
attribute float aIndex;
uniform float uOffset;
uniform float uCount;
uniform float uY;
uniform float uAmp;
${seriesGLSL}

void main() {
  // Sample k sits at screen slot (index - fract(offset)): the series slides right to left.
  float k = aIndex + floor(uOffset);
  float x = (aIndex - fract(uOffset)) / (uCount - 3.0);
  float y = uY + series(k) * uAmp;
  // Straight to clip space, on the far plane: behind everything, and the hero's surface
  // (which writes depth) hides it.
  gl_Position = vec4(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.9999, 1.0);
}
`;

const pingVertex = /* glsl */ `
uniform float uOffset;
uniform float uCount;
uniform float uY;
uniform float uAmp;
uniform float uX;
uniform float uPx;
${seriesGLSL}

void main() {
  // The trace's value under screen x, interpolated between its two samples.
  float slot = uX * (uCount - 3.0) + fract(uOffset);
  float i = floor(slot);
  float k = i + floor(uOffset);
  float y = uY + mix(series(k), series(k + 1.0), slot - i) * uAmp;
  gl_Position = vec4(uX * 2.0 - 1.0, 1.0 - y * 2.0, 0.9999, 1.0);
  gl_PointSize = uPx;
}
`;

const lineFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
void main() {
  gl_FragColor = vec4(uColor, uAlpha);
  #include <colorspace_fragment>
}
`;

const pingFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float core = 1.0 - smoothstep(0.18, 0.42, d);
  float halo = exp(-d * d * 4.0) * 0.35;
  float a = (core + halo) * uAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}
`;

const gridVertex = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`;

function lineMaterial(vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
}

/**
 * LIVE TELEMETRY — the site's ambient background: a handful of faint time-series traces
 * scrolling right to left at different speeds and depths, very faint gridlines, and now and
 * then a glacier dot pinging along one trace. Drawn first, on the far plane, entirely on the
 * GPU (each vertex computes its own sample from a time offset), so it costs a few uniforms
 * per frame. DOM scrims dim it under text like the particles; it also follows the field's
 * dimming. Static with reduced motion; paused with the canvas when the tab is hidden.
 */
export function Telemetry() {
  const viewport = useSite((state) => state.viewport);
  const mobile = viewport?.isMobile ?? false;
  const count = mobile ? SAMPLES.mobile : SAMPLES.desktop;

  const objects = useMemo(() => {
    const color = new THREE.Color(COLORS.text);
    const indices = new Float32Array(count);
    for (let i = 0; i < count; i++) indices[i] = i;
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("aIndex", new THREE.BufferAttribute(indices, 1));
    // `position` only sets the draw count; the shader positions every vertex itself.
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));

    const traces = TRACES.map((trace) => {
      const uniforms = {
        uOffset: { value: trace.seed * 37 },
        uCount: { value: count },
        uY: { value: trace.y },
        uAmp: { value: trace.amp },
        uStyle: { value: trace.style },
        uSeed: { value: trace.seed },
        uColor: { value: color },
        uAlpha: { value: trace.alpha },
      };
      const line = new THREE.Line(lineGeometry, lineMaterial(traceVertex, lineFragment, uniforms));
      line.frustumCulled = false;
      line.renderOrder = -10;
      return { trace, line, uniforms };
    });

    const gridPositions = new Float32Array(GRID_LINES * 6);
    for (let i = 0; i < GRID_LINES; i++) {
      const y = 1 - ((i + 1) / (GRID_LINES + 1)) * 2;
      gridPositions.set([-1, y, 0, 1, y, 0], i * 6);
    }
    const gridGeometry = new THREE.BufferGeometry();
    gridGeometry.setAttribute("position", new THREE.BufferAttribute(gridPositions, 3));
    const gridUniforms = { uColor: { value: color }, uAlpha: { value: 0.022 } };
    const grid = new THREE.LineSegments(gridGeometry, lineMaterial(gridVertex, lineFragment, gridUniforms));
    grid.frustumCulled = false;
    grid.renderOrder = -11;

    const pingGeometry = new THREE.BufferGeometry();
    pingGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
    const pingUniforms = {
      uOffset: { value: 0 },
      uCount: { value: count },
      uY: { value: 0 },
      uAmp: { value: 0 },
      uStyle: { value: 0 },
      uSeed: { value: 0 },
      uX: { value: 0 },
      uPx: { value: 6 },
      uColor: { value: new THREE.Color(COLORS.glacier) },
      uAlpha: { value: 0 },
    };
    const ping = new THREE.Points(pingGeometry, lineMaterial(pingVertex, pingFragment, pingUniforms));
    ping.frustumCulled = false;
    ping.renderOrder = -9;

    return { traces, grid, gridUniforms, ping, pingUniforms, lineGeometry, gridGeometry, pingGeometry };
  }, [count]);

  useEffect(
    () => () => {
      objects.lineGeometry.dispose();
      objects.gridGeometry.dispose();
      objects.pingGeometry.dispose();
      for (const { line } of objects.traces) (line.material as THREE.Material).dispose();
      (objects.grid.material as THREE.Material).dispose();
      (objects.ping.material as THREE.Material).dispose();
    },
    [objects],
  );

  const local = useRef({ nextPing: 2.5, ping: -1, pingAge: 0, dim: 0 });
  // The frame loop writes uniforms through this ref, never into the memoised value itself.
  const live = useRef<typeof objects | null>(null);
  useLayoutEffect(() => {
    live.current = objects;
  }, [objects]);

  useFrame((state, delta) => {
    const scene = live.current;
    if (!scene) return;
    const dt = Math.min(delta, 0.05);
    const s = local.current;
    const { reducedMotion, loaded } = useSite.getState();
    const viewHeight = state.size.height;
    // Follows the particle field's dimming (text being read), eased.
    s.dim = THREE.MathUtils.damp(s.dim, frame.fieldDim, 3, dt);
    const shown = loaded ? 1 : 0;
    const scrolled = frame.scrollY / Math.max(viewHeight, 1);

    scene.traces.forEach(({ trace, uniforms }) => {
      if (!reducedMotion) uniforms.uOffset.value += dt * trace.speed;
      // Nearer traces drift further with the page: depth without moving the camera.
      const parallax = reducedMotion ? 0 : scrolled * PARALLAX * (1 - trace.depth);
      // Wrapped off screen (beyond ±0.1), so a trace leaving the top re-enters at the bottom.
      const y = trace.y - parallax + 0.1;
      uniforms.uY.value = (((y % 1.2) + 1.2) % 1.2) - 0.1;
      uniforms.uAlpha.value = trace.alpha * shown * (1 - 0.55 * s.dim);
    });
    scene.gridUniforms.uAlpha.value = 0.022 * shown * (1 - 0.5 * s.dim);

    // --- the occasional ping: a glacier dot riding one trace from right to left
    const p = scene.pingUniforms;
    if (reducedMotion || !loaded) {
      p.uAlpha.value = 0;
      return;
    }
    if (s.ping < 0) {
      s.nextPing -= dt;
      if (s.nextPing <= 0) {
        s.ping = Math.floor(Math.random() * scene.traces.length);
        s.pingAge = 0;
      }
      p.uAlpha.value = 0;
      return;
    }
    s.pingAge += dt;
    const t = s.pingAge / PING.duration;
    if (t >= 1) {
      s.ping = -1;
      s.nextPing = PING.min + Math.random() * (PING.max - PING.min);
      p.uAlpha.value = 0;
      return;
    }
    const { uniforms, trace } = scene.traces[s.ping];
    p.uOffset.value = uniforms.uOffset.value;
    p.uY.value = uniforms.uY.value;
    p.uAmp.value = uniforms.uAmp.value;
    p.uStyle.value = uniforms.uStyle.value;
    p.uSeed.value = uniforms.uSeed.value;
    p.uX.value = 0.92 - 0.84 * t;
    p.uPx.value = 7 * state.viewport.dpr;
    p.uAlpha.value =
      0.75 * Math.min(1, t * 6) * Math.min(1, (1 - t) * 4) * (0.6 + 0.4 * (1 - trace.depth)) * (1 - 0.5 * s.dim);
  });

  return (
    <>
      <primitive object={objects.grid} />
      {objects.traces.map(({ line, trace }) => (
        <primitive key={trace.seed} object={line} />
      ))}
      <primitive object={objects.ping} />
    </>
  );
}
