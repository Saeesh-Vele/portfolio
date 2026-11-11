"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
  /** Called with 0..1 across the pinned distance. Use it to drive DOM inside the chapter. */
  onProgress?: (progress: number) => void;
  className?: string;
  children: ReactNode;
}

/**
 * A pinned 3D chapter. The outer <section> is (1 + length) viewports tall and defines the
 * scroll span; the inner viewport-sized stage is pinned by GSAP ScrollTrigger for the whole
 * of it. The stage also exposes `--chapter-progress` (0..1) as a CSS variable.
 *
 * With prefers-reduced-motion the chapter collapses to a normal one-viewport section.
 */
export function ScrollChapter({
  id,
  length = 1,
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
    const trigger = ScrollTrigger.create({
      trigger: outerElement,
      start: "top top",
      end: "bottom bottom",
      pin: stageElement,
      pinSpacing: false,
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
  }, [reducedMotion, length]);

  return (
    <section
      ref={outer}
      id={id}
      data-section={id}
      className="relative"
      style={reducedMotion ? undefined : { height: `${(1 + length) * 100}svh` }}
    >
      <div ref={stage} className={`relative h-svh w-full overflow-hidden ${className ?? ""}`}>
        {children}
      </div>
    </section>
  );
}
