"use client";

import { useEffect, useRef } from "react";
import { cursor as copy } from "@/content/content";
import { useMediaQuery, useReducedMotion } from "@/lib/hooks";

/** Elements the reticle opens up over. */
const INTERACTIVE = "a, button, [role='button'], label, summary, select";
/** Readout flips to the left of the reticle this close to the right edge. */
const FLIP_MARGIN = 140;

const pad = (value: number) => String(Math.max(0, Math.round(value))).padStart(4, "0");

/**
 * Accent crosshair with a tiny mono coordinate readout, following a mouse 1:1 (no lag: it
 * is an instrument, not a toy). Opens up slightly over links and buttons. It never takes
 * pointer events, so clicking and text selection work exactly as without it.
 */
function Crosshair() {
  const root = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = root.current;
    const text = readout.current;
    if (!element || !text) return;
    const html = document.documentElement;
    let x = 0;
    let y = 0;
    let raf = 0;

    const render = () => {
      raf = 0;
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      element.dataset.flip = String(x > window.innerWidth - FLIP_MARGIN);
      text.textContent = `${copy.x} ${pad(x)}  ${copy.y} ${pad(y)}`;
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x = event.clientX;
      y = event.clientY;
      element.dataset.visible = "true";
      // The native cursor is hidden only once the crosshair is actually tracking.
      html.dataset.cursor = "on";
      if (!raf) raf = requestAnimationFrame(render);
    };
    const onOver = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      element.dataset.link = String(Boolean(target?.closest(INTERACTIVE)));
    };
    const onLeave = () => {
      element.dataset.visible = "false";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    html.addEventListener("mouseleave", onLeave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      delete html.dataset.cursor;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      document.removeEventListener("pointerover", onOver);
      html.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={root}
      aria-hidden
      data-visible="false"
      data-link="false"
      data-flip="false"
      className="crosshair pointer-events-none fixed left-0 top-0 z-[90]"
    >
      <span className="crosshair-arm" data-arm="n" />
      <span className="crosshair-arm" data-arm="s" />
      <span className="crosshair-arm" data-arm="w" />
      <span className="crosshair-arm" data-arm="e" />
      <span ref={readout} className="crosshair-readout" />
    </div>
  );
}

/** Desktop pointers only: hidden on touch / pen devices and with reduced motion. */
export function Cursor() {
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reducedMotion = useReducedMotion();
  if (!fine || reducedMotion) return null;
  return <Crosshair />;
}
