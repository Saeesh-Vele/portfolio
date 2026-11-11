import type Lenis from "lenis";
import { SECTIONS } from "@/lib/sections";
import { useSite } from "@/store/site";

let lenis: Lenis | null = null;

/** Set by SiteRuntime. Null when smooth scrolling is off (reduced motion). */
export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

const expoOut = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Scrolls to the section with the given `data-section` id, landing on its `anchor` (a point
 * inside its scroll span where its content is readable) when it defines one.
 */
export function scrollToSection(id: string) {
  const element = document.querySelector<HTMLElement>(`[data-section="${id}"]`);
  if (!element) return;
  const { viewport, reducedMotion } = useSite.getState();
  const section = SECTIONS.find((entry) => entry.id === id);
  const rect = element.getBoundingClientRect();
  const anchor = !reducedMotion && viewport && section?.anchor ? section.anchor(viewport) : 0;
  const top = Math.round(rect.top + window.scrollY + anchor * rect.height);
  if (lenis) {
    lenis.scrollTo(top, { duration: 2.4, easing: expoOut, force: true });
  } else {
    window.scrollTo({ top, behavior: "auto" });
  }
}

/** Locks page scrolling while a full-screen overlay (the mobile menu) is open. */
export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}
