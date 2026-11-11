"use client";

import { lazy, Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { COLORS } from "@/lib/constants";
import { usePageVisible } from "@/lib/hooks";
import { HERO_CAMERA } from "@/lib/nameLayout";
import { useSite } from "@/store/site";
import { CameraRig } from "./CameraRig";
import { ParticleField } from "./ParticleField";

// Postprocessing is only fetched on desktop.
const Effects = lazy(() => import("./Effects"));

const SAMPLE_FRAMES = 90;
const SETTLE_FRAMES = 45;
/** Bloom is dropped if it adds more than this to the average frame time. */
const BLOOM_BUDGET_MS = 2;

type BloomMode = "baseline" | "trial" | "on" | "off";

/**
 * Enables the bloom only if it fits the budget: measures average frame time without it,
 * then with it, and keeps it only when the difference is under BLOOM_BUDGET_MS.
 */
function BloomGate() {
  const loaded = useSite((state) => state.loaded);
  const [mode, setMode] = useState<BloomMode>("baseline");
  const sample = useRef({ frames: 0, total: 0, settle: SETTLE_FRAMES * 4, baseline: 0 });

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
  const bloom = ready && tier === "desktop" && !reducedMotion;

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
      {bloom ? <BloomGate /> : null}
    </Canvas>
  );
}
