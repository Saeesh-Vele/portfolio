import type Lenis from "lenis";

let lenis: Lenis | null = null;

/** Set by SiteRuntime. Null when smooth scrolling is off (reduced motion). */
export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

const expoOut = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Scrolls to the section with the given `data-section` id. */
export function scrollToSection(id: string) {
  const element = document.querySelector<HTMLElement>(`[data-section="${id}"]`);
  if (!element) return;
  if (lenis) {
    lenis.scrollTo(element, { duration: 2.4, easing: expoOut });
  } else {
    element.scrollIntoView({ behavior: "auto", block: "start" });
  }
}
