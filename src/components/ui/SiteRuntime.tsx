"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { recognition } from "@/content/content";
import { MOBILE_BREAKPOINT, QUALITY_SESSION_KEY } from "@/lib/constants";
import { capablePhone, deviceTier, isTier } from "@/lib/device";
import { useReducedMotion } from "@/lib/hooks";
import { setLenis } from "@/lib/scroll";
import { SECTIONS, type Viewport } from "@/lib/sections";
import { buildTimeline, type SectionSpan } from "@/lib/timeline";
import { frame, useSite } from "@/store/site";

/** Reads the native scroll position into the per-frame store. */
function readScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  frame.scrollY = window.scrollY;
  frame.target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

/**
 * Headless runtime mounted once in the root layout. Owns everything that connects the DOM
 * to the 3D scene: reduced-motion flag, viewport + device tier, Lenis ↔ ScrollTrigger sync,
 * section measurement → timeline, and pointer tracking.
 */
export function SiteRuntime() {
  const reducedMotion = useReducedMotion();
  const viewport = useSite((state) => state.viewport);

  useEffect(() => {
    useSite.getState().setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  // Viewport + tier. Waits for the display font so the PODIUM numeral samples real glyphs.
  useEffect(() => {
    // Adaptive quality already dropped a tier earlier in this session: start there.
    try {
      const cap = sessionStorage.getItem(QUALITY_SESSION_KEY);
      if (isTier(cap)) useSite.getState().restoreTierCap(cap);
    } catch {
      // Storage unavailable: start uncapped.
    }

    let cancelled = false;
    let last: Viewport | null = null;
    /** Phone GPU check, run once on the first narrow measure. */
    let capable: boolean | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const fontFamily =
      getComputedStyle(document.documentElement).getPropertyValue("--font-geist-sans").trim() ||
      "sans-serif";

    const touch = window.matchMedia("(hover: none) and (pointer: coarse)");
    const measure = () => {
      if (cancelled) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspect = width / height;
      // Mobile URL bars change the height constantly (by over 10% on tall phones); that must
      // never rebuild formations or camera keyframes mid-scroll. On touch screens only a
      // width change (rotation) counts; elsewhere a real change of shape.
      if (
        last &&
        last.width === width &&
        (touch.matches || Math.abs(aspect - last.aspect) / last.aspect < 0.08)
      ) {
        return;
      }
      const isMobile = width < MOBILE_BREAKPOINT;
      last = { width, height, aspect, isMobile, fontFamily };
      if (isMobile && capable === null) capable = capablePhone();
      useSite
        .getState()
        .setViewport(last, deviceTier(width, navigator.hardwareConcurrency ?? 8, capable ?? false));
    };

    const fontReady = document.fonts
      ? document.fonts.load(`800 100px ${fontFamily}`, recognition.place)
      : Promise.resolve();
    const timeout = new Promise((resolve) => setTimeout(resolve, 1500));
    Promise.race([fontReady, timeout]).then(measure, measure);

    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(measure, 180);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Scroll: Lenis drives native scroll and ScrollTrigger; reduced motion uses native scroll.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    // Mobile address bars resize the viewport mid-scroll; that must never refresh triggers.
    // Resizes are handled below instead: a real orientation change (the width changes) or a
    // desktop window resize, debounced.
    ScrollTrigger.config({
      ignoreMobileResize: true,
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
    });
    const touch = window.matchMedia("(hover: none) and (pointer: coarse)");
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    const onResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const rotated = width !== lastWidth;
      const resized = !touch.matches && height !== lastHeight;
      lastWidth = width;
      lastHeight = height;
      if (!rotated && !resized) return;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 250);
    };
    window.addEventListener("resize", onResize);

    readScroll();
    window.addEventListener("scroll", readScroll, { passive: true });
    if (reducedMotion) {
      return () => {
        clearTimeout(refreshTimer);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", readScroll);
      };
    }

    const lenis = new Lenis({ lerp: 0.1 });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      clearTimeout(refreshTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", readScroll);
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, [reducedMotion]);

  // Measure sections → timeline. Re-runs whenever the document's height changes.
  useEffect(() => {
    if (!viewport) return;
    let raf = 0;

    const measure = () => {
      raf = 0;
      const spans: SectionSpan[] = [];
      for (const section of SECTIONS) {
        const element = document.querySelector<HTMLElement>(`[data-section="${section.id}"]`);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        spans.push({ id: section.id, top: rect.top + window.scrollY, height: rect.height });
      }
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      useSite.getState().setTimeline(
        buildTimeline(SECTIONS, spans, maxScroll, viewport, reducedMotion),
      );
      readScroll();
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [viewport, reducedMotion]);

  // Pointer → normalised device coordinates for repulsion and parallax.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      frame.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      frame.pointerY = -((event.clientY / window.innerHeight) * 2 - 1);
      frame.pointerActive = 1;
      frame.pointerTouch = event.pointerType === "mouse" ? 0 : 1;
    };
    // Touch drag → scatter. Pointer events stop (pointercancel) as soon as the browser takes
    // the gesture over for scrolling; touch events keep coming, so the finger keeps
    // scattering the field while it scrolls. Lifting it lets the field heal.
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      frame.pointerX = (touch.clientX / window.innerWidth) * 2 - 1;
      frame.pointerY = -((touch.clientY / window.innerHeight) * 2 - 1);
      frame.pointerActive = 1;
      frame.pointerTouch = 1;
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length === 0) frame.pointerActive = 0;
    };
    const release = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") frame.pointerActive = 0;
    };
    const leave = () => {
      frame.pointerActive = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      document.documentElement.removeEventListener("mouseleave", leave);
    };
  }, []);

  return null;
}
