"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useSite } from "@/store/site";

/**
 * Line-by-line masked reveal for real, wrapping text. Every `[data-split]` element inside
 * `scope` is split into lines (re-split automatically on resize and font load), each line in
 * its own overflow mask; lines slide up in order when `shown` turns true and drop back
 * behind their masks when it turns false.
 *
 * With prefers-reduced-motion nothing is split and the text simply stays visible.
 */
export function useLineReveal(scope: RefObject<HTMLElement | null>, shown: boolean) {
  const reducedMotion = useSite((state) => state.reducedMotion);
  const lines = useRef<Element[]>([]);
  const shownRef = useRef(shown);

  useEffect(() => {
    const root = scope.current;
    if (!root || reducedMotion) return;
    const targets = root.querySelectorAll("[data-split]");
    if (targets.length === 0) return;

    gsap.registerPlugin(SplitText);
    const split = SplitText.create(targets, {
      type: "lines",
      mask: "lines",
      linesClass: "split-line",
      autoSplit: true,
      aria: "none",
      onSplit: (self) => {
        lines.current = self.lines;
        gsap.set(self.lines, { yPercent: shownRef.current ? 0 : 110 });
      },
    });
    return () => {
      gsap.killTweensOf(lines.current);
      lines.current = [];
      split.revert();
    };
  }, [scope, reducedMotion]);

  useEffect(() => {
    shownRef.current = shown;
    if (lines.current.length === 0) return;
    if (shown) {
      gsap.to(lines.current, {
        yPercent: 0,
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.045,
        delay: 0.12,
        overwrite: true,
      });
    } else {
      // Reset once the container has faded out, ready for the next entry.
      gsap.set(lines.current, { yPercent: 110, delay: 0.4, overwrite: true });
    }
  }, [shown]);
}
