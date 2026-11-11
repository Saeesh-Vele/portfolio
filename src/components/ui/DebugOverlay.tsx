"use client";

import { useEffect, useRef } from "react";
import { frame, useSite } from "@/store/site";

/** Frames averaged per readout. */
const WINDOW = 60;

/**
 * Performance readout for measuring on real devices. Only ever loaded with ?debug=1 (see
 * DebugGate). Frame time is the average requestAnimationFrame interval over the last
 * `WINDOW` frames, so it includes everything on the main thread, not just WebGL.
 * Labels are tooling, not site copy, so they live here rather than in content.ts.
 */
export default function DebugOverlay() {
  const output = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let total = 0;
    let worst = 0;
    let frames = 0;

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      // A hidden tab pauses rAF; don't count the gap as one enormous frame.
      if (delta < 1000) {
        total += delta;
        worst = Math.max(worst, delta);
        frames++;
      }
      if (frames >= WINDOW && output.current) {
        const average = total / frames;
        const { tier, reducedMotion } = useSite.getState();
        output.current.textContent = [
          `FRAME  ${average.toFixed(1)} ms  (max ${worst.toFixed(1)})`,
          `FPS    ${(1000 / average).toFixed(0)}`,
          `TIER   ${tier}  N=${frame.debug.particles.toLocaleString("en-US")}`,
          `FORM   ${frame.debug.formation || "-"}`,
          `DPR    ${frame.debug.dpr.toFixed(2)}  (device ${window.devicePixelRatio.toFixed(2)})`,
          `SCROLL ${(frame.progress * 100).toFixed(1)}%${reducedMotion ? "  REDUCED MOTION" : ""}`,
        ].join("\n");
        total = 0;
        worst = 0;
        frames = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <pre
      ref={output}
      aria-hidden
      className="pointer-events-none fixed bottom-2 left-2 z-[70] border border-hairline bg-bg px-2.5 py-2 font-mono text-[0.625rem] leading-[1.5] text-text tabular-nums"
    >
      DEBUG
    </pre>
  );
}
