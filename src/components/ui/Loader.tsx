"use client";

import { useEffect, useRef, useState } from "react";
import { loader } from "@/content/content";
import { LOADER_SESSION_KEY } from "@/lib/constants";
import { useSite } from "@/store/site";

/** Counter run time. The fade (0.45s, in CSS) follows, keeping the whole thing under 2.2s. */
const COUNT_MS = 1400;
/** The clock starts at navigation, so slow hydration eats into the count, not the visitor. */
const MAX_HEAD_START_MS = 700;

/** 0 → "00,000", 50000 → "50,000". */
function formatCount(value: number) {
  const digits = String(Math.round(value)).padStart(5, "0");
  return `${digits.slice(0, 2)},${digits.slice(2)}`;
}

function markLoaded() {
  document.documentElement.dataset.loaded = "true";
  useSite.getState().setLoaded(true);
}

/**
 * Mono readout over the raw particle noise: "PARSING RECORDS 00,000 → 50,000" with a
 * hairline progress rule. It has no backdrop — the particles are already rendering behind
 * it — and everything else on the page stays masked until it finishes. Skipped on repeat
 * visits in the same session and with reduced motion (see the inline script in layout.tsx).
 */
export function Loader() {
  const [done, setDone] = useState(false);
  const count = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (document.documentElement.dataset.loader === "skip") {
      markLoaded();
      return;
    }

    const start = performance.now() - Math.min(performance.now(), MAX_HEAD_START_MS);
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      if (count.current) {
        count.current.textContent = formatCount(loader.from + (loader.to - loader.from) * eased);
      }
      if (bar.current) bar.current.style.transform = `scaleX(${eased})`;
      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      try {
        sessionStorage.setItem(LOADER_SESSION_KEY, "1");
      } catch {
        // Storage can be unavailable (private mode); the loader just plays again next time.
      }
      markLoaded();
      setDone(true);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="loader pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      data-state={done ? "done" : "running"}
      role="status"
      aria-label={loader.ariaLabel}
      aria-hidden={done}
    >
      <div className="w-56">
        <div className="label flex items-baseline justify-between">
          <span>{loader.label}</span>
          <span ref={count} className="text-text">
            {formatCount(loader.from)}
          </span>
        </div>
        <span className="hairline relative mt-3 block h-px w-full overflow-hidden">
          <span
            ref={bar}
            className="absolute inset-0 block origin-left bg-glacier"
            style={{ transform: "scaleX(0)" }}
          />
        </span>
      </div>
    </div>
  );
}
