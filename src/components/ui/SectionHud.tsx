"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { sectionHud } from "@/content/content";
import { useReducedMotion } from "@/lib/hooks";
import { scramble } from "@/lib/scramble";
import { SECTIONS } from "@/lib/sections";
import { useSite } from "@/store/site";

/** Same reading line as the nav's active link: 40% down the viewport. */
const READING_LINE = 0.4;
const NAV_HEIGHT = 64;

/**
 * The top-left corner readout. Over the hero it reads "SV / 2026"; once another section
 * crosses the reading line it switches to that section's label ("04 / WORK") with a short
 * mono character scramble (an instant swap with reduced motion). It is the only visible
 * section label at every size — sections do not repeat it — and it is decorative
 * (aria-hidden): each section has its own sr-only heading. Empty on pages without sections
 * (the 404).
 */
export function SectionHud() {
  const output = useRef<HTMLParagraphElement>(null);
  const loaded = useSite((state) => state.loaded);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const node = output.current;
    if (!node || !loaded) return;
    const sections = SECTIONS.flatMap((section) => {
      const element = document.querySelector<HTMLElement>(`[data-section="${section.id}"]`);
      return element ? [{ id: section.id, element }] : [];
    });
    if (sections.length === 0) return;

    let shown = node.textContent ?? "";
    let cancel: (() => void) | null = null;
    let raf = 0;

    const update = () => {
      raf = 0;
      const line = window.innerHeight * READING_LINE;
      let id = sections[0].id;
      for (const section of sections) {
        if (section.element.getBoundingClientRect().top <= line) id = section.id;
      }
      // Past the hero, content scrolls under the readout: give it the nav's solid ground.
      node.dataset.solid = String(sections[0].element.getBoundingClientRect().bottom <= NAV_HEIGHT);

      const label = sectionHud[id] ?? "";
      if (label === shown) return;
      shown = label;
      cancel?.();
      cancel = null;
      if (reducedMotion) node.textContent = label;
      else cancel = scramble(node, label);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      cancel?.();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [loaded, reducedMotion]);

  return (
    <p
      ref={output}
      aria-hidden
      data-solid="false"
      className="label fade-in pointer-events-none fixed left-(--gutter) top-[calc(var(--nav-h)+0.75rem)] z-20 -mx-1.5 -my-0.5 whitespace-pre px-1.5 py-0.5 transition-[background-color,opacity] duration-700 data-[solid=true]:bg-bg"
      style={{ "--i": 6 } as CSSProperties}
    />
  );
}
