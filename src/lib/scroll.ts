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
 * Scrolls to position `at` (0..1) inside the scroll span of the section with this id.
 * `duration` (seconds) applies to the smooth scroll only.
 */
export function scrollToSpan(id: string, at: number, duration = 2.4) {
  const element = document.querySelector<HTMLElement>(`[data-section="${id}"]`);
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const top = Math.round(rect.top + window.scrollY + at * rect.height);
  if (lenis) {
    lenis.scrollTo(top, { duration, easing: expoOut, force: true });
  } else {
    window.scrollTo({ top, behavior: "auto" });
  }
}

/**
 * Scrolls to the section with the given `data-section` id, landing on its `anchor` (a point
 * inside its scroll span where its content is readable) when it defines one.
 */
export function scrollToSection(id: string) {
  const { viewport, reducedMotion } = useSite.getState();
  const section = SECTIONS.find((entry) => entry.id === id);
  scrollToSpan(id, !reducedMotion && viewport && section?.anchor ? section.anchor(viewport) : 0);
}

/** Smooth-scrolls back to the top of the page. */
export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { duration: 2.4, easing: expoOut, force: true });
  else window.scrollTo({ top: 0, behavior: "auto" });
}

/** Locks page scrolling while a full-screen overlay (the mobile menu) is open. */
export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}
