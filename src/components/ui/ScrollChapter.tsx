"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSite } from "@/store/site";

interface ScrollChapterProps {
  /** Section id — must match the id of a SectionDef in src/lib/sections.ts. */
  id: string;
  /**
   * How long the DOM stays pinned, in viewport heights. While pinned, scrolling drives only
   * the 3D scene (camera travel, formation morphs) through the section's keyframes.
   */
  length?: number;
  /** Pinned length below the md breakpoint. Defaults to `length`. */
  mobileLength?: number;
  /**
   * Rendered instead of the pinned stage with prefers-reduced-motion: a normal-flow version
   * of the chapter, free to be taller than one viewport.
   */
  reducedFallback?: ReactNode;
  /** Called with 0..1 across the pinned distance. Use it to drive DOM inside the chapter. */
  onProgress?: (progress: number) => void;
  className?: string;
  children: ReactNode;
}

/**
 * A pinned 3D chapter. The outer <section> is (1 + length) small viewports tall and defines
 * the scroll span; the inner stage is `position: sticky` and one *dynamic* viewport tall
 * (`.chapter-stage` in globals.css), so it stays pinned for the whole span. GSAP
 * ScrollTrigger only reports progress. The stage also exposes `--chapter-progress` (0..1) as
 * a CSS variable.
 *
 * Why sticky, not a GSAP pin: a GSAP pin freezes the stage's size and offset in px at refresh
 * time, and with `ignoreMobileResize` (needed so the iOS address bar does not trigger
 * refreshes mid-scroll) those px go stale as the bar collapses or expands — the bottom sheet
 * ended up mid-screen. A sticky 100dvh stage follows the visible viewport natively.
 *
 * The height comes from CSS (`.chapter` in globals.css) so the desktop / mobile lengths
 * switch at the md breakpoint without a layout shift.
 *
 * With prefers-reduced-motion nothing is pinned: the chapter renders `reducedFallback` in
 * normal flow, or collapses to a one-viewport section if there is none.
 */
export function ScrollChapter({
  id,
  length = 1,
  mobileLength,
  reducedFallback,
  onProgress,
  className,
  children,
}: ScrollChapterProps) {
  const outer = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const progressCallback = useRef(onProgress);
  const reducedMotion = useSite((state) => state.reducedMotion);

  useEffect(() => {
    progressCallback.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    const outerElement = outer.current;
    const stageElement = stage.current;
    if (reducedMotion || !outerElement || !stageElement) return;

    gsap.registerPlugin(ScrollTrigger);
    // The sticky stage is pinned while the section's top is above the viewport top and its
    // bottom below the viewport bottom: exactly this trigger's range.
    const trigger = ScrollTrigger.create({
      trigger: outerElement,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        stageElement.style.setProperty("--chapter-progress", self.progress.toFixed(4));
        progressCallback.current?.(self.progress);
      },
    });

    return () => {
      trigger.kill();
      stageElement.style.removeProperty("--chapter-progress");
      progressCallback.current?.(0);
    };
  }, [reducedMotion, length, mobileLength]);

  // The element tree is identical in both modes, so switching never remounts the children
  // (their tickers and measured layout survive a reduced-motion change).
  const fallback = reducedMotion && reducedFallback !== undefined;

  return (
    <section
      ref={outer}
      id={id}
      data-section={id}
      className={reducedMotion ? "relative" : "chapter relative"}
      style={
        {
          "--chapter-length": length,
          "--chapter-length-mobile": mobileLength ?? length,
        } as CSSProperties
      }
    >
      <div
        ref={stage}
        className={`w-full ${fallback ? "relative" : reducedMotion ? "relative h-svh overflow-hidden" : "chapter-stage"} ${className ?? ""}`}
      >
        {fallback ? reducedFallback : children}
      </div>
    </section>
  );
}
