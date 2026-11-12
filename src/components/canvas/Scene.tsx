"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { COLORS, QUALITY_SESSION_KEY } from "@/lib/constants";
import { usePageVisible } from "@/lib/hooks";
import { HERO_CAMERA } from "@/lib/nameLayout";
import { frame, useSite } from "@/store/site";
import { CameraRig } from "./CameraRig";
import { ParticleField } from "./ParticleField";

// Postprocessing is only fetched on desktop.
const Effects = lazy(() => import("./Effects"));

const SAMPLE_FRAMES = 90;
const SETTLE_FRAMES = 45;
/** Bloom is dropped if it adds more than this to the average frame time. */
const BLOOM_BUDGET_MS = 2;

type BloomMode = "baseline" | "trial" | "on" | "off";

/** Adaptive quality: average frame time over budget for SLOW_SECONDS drops one tier. */
const FRAME_BUDGET_MS = 22;
const SLOW_SECONDS = 2;
/** Frame times are averaged over windows this long; one window under budget resets. */
const WINDOW_SECONDS = 0.25;
/** Not measured right after the loader hands over, or after a drop (formations rebuild). */
const QUALITY_SETTLE_SECONDS = 1.5;
/** A longer gap is a paused or backgrounded tab, not a slow frame. */
const MAX_COUNTED_DELTA = 1;

/**
 * Watches frame time and, if the average stays above FRAME_BUDGET_MS for SLOW_SECONDS,
 * drops one particle tier and turns the bloom off. Never steps back up: the cap is kept
 * in the store (so resizes respect it) and in sessionStorage (so reloads do too).
 */
function QualityGovernor() {
  const s = useRef({ settle: QUALITY_SETTLE_SECONDS, time: 0, frames: 0, slow: 0, elapsed: 0 });

  useFrame((_, delta) => {
    const { loaded, tier } = useSite.getState();
    if (!loaded) return;
    const g = s.current;
    if (delta > MAX_COUNTED_DELTA) {
      g.time = 0;
      g.frames = 0;
      return;
    }
    g.elapsed += delta;
    if (g.settle > 0) {
      g.settle -= delta;
      return;
    }
    g.time += delta;
    g.frames++;
    if (g.time < WINDOW_SECONDS) return;

    const average = (g.time / g.frames) * 1000;
    g.slow = average > FRAME_BUDGET_MS ? g.slow + g.time : 0;
    g.time = 0;
    g.frames = 0;
    frame.debug.slow = g.slow;
    if (g.slow < SLOW_SECONDS || tier === "mobile") return;

    const cap = useSite
      .getState()
      .downgrade(`at ${g.elapsed.toFixed(1)}s (${average.toFixed(1)}ms)`);
    try {
      sessionStorage.setItem(QUALITY_SESSION_KEY, cap);
    } catch {
      // Storage unavailable: the cap still holds for this page view.
    }
    g.slow = 0;
    frame.debug.slow = 0;
    g.settle = QUALITY_SETTLE_SECONDS;
  });

  return null;
}

/**
 * Enables the bloom only if it fits the budget: measures average frame time without it,
 * then with it, and keeps it only when the difference is under BLOOM_BUDGET_MS.
 */
function BloomGate() {
  const loaded = useSite((state) => state.loaded);
  const [mode, setMode] = useState<BloomMode>("baseline");
  const sample = useRef({ frames: 0, total: 0, settle: SETTLE_FRAMES * 4, baseline: 0 });

  useEffect(() => {
    frame.debug.bloom = mode;
  }, [mode]);

  useFrame((_, delta) => {
    if (!loaded || mode === "on" || mode === "off") return;
    const s = sample.current;
    if (s.settle > 0) {
      s.settle--;
      return;
    }
    s.total += delta * 1000;
    s.frames++;
    if (s.frames < SAMPLE_FRAMES) return;

    const average = s.total / s.frames;
    s.total = 0;
    s.frames = 0;
    s.settle = SETTLE_FRAMES;
    if (mode === "baseline") {
      s.baseline = average;
      setMode("trial");
    } else {
      setMode(average - s.baseline > BLOOM_BUDGET_MS ? "off" : "on");
    }
  });

  if (mode !== "trial" && mode !== "on") return null;
  return (
    <Suspense fallback={null}>
      <Effects />
    </Suspense>
  );
}

export default function Scene() {
  const visible = usePageVisible();
  const tier = useSite((state) => state.tier);
  const reducedMotion = useSite((state) => state.reducedMotion);
  const ready = useSite((state) => state.viewport !== null);
  const bloomAllowed = useSite((state) => state.bloomAllowed);
  const bloom = ready && tier === "desktop" && !reducedMotion && bloomAllowed;

  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={visible ? "always" : "never"}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      camera={{
        fov: HERO_CAMERA.fov,
        near: 0.1,
        far: 120,
        position: [0, 0, HERO_CAMERA.distance],
      }}
    >
      <color attach="background" args={[COLORS.bg]} />
      <CameraRig />
      <ParticleField />
      <QualityGovernor />
      {bloom ? <BloomGate /> : null}
    </Canvas>
  );
}
