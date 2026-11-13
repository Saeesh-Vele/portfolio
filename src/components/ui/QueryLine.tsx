"use client";

import { useEffect, useRef, useState } from "react";
import { queries } from "@/content/content";
import { useSeen } from "@/lib/hooks";
import { useSite } from "@/store/site";

/** Milliseconds per character, and the pause before the first one. */
const CHAR_MS = 20;
const START_MS = 180;

/**
 * The site's identity language: a muted mono query line ("> SELECT … ;") that types itself
 * in once, the first time it is seen, behind an accent block caret that disappears when it
 * is done. The full text is laid out (invisible) underneath from the start, so typing never
 * shifts the layout — layouts that measure themselves (STATS, CLUSTERS) stay put.
 * Decorative: hidden from assistive tech. With reduced motion it is simply there.
 */
export function QueryLine({ text, className = "" }: { text: string; className?: string }) {
  const root = useRef<HTMLParagraphElement>(null);
  const loaded = useSite((state) => state.loaded);
  const reducedMotion = useSite((state) => state.reducedMotion);
  const seen = useSeen(root, 0.6);
  const [typed, setTyped] = useState(0);
  const full = `${queries.prompt} ${text}`;
  const instant = reducedMotion;
  const done = instant || typed >= full.length;

  useEffect(() => {
    if (instant || !seen || !loaded) return;
    let index = 0;
    let timer = setTimeout(function step() {
      index++;
      setTyped(index);
      if (index < full.length) timer = setTimeout(step, CHAR_MS);
    }, START_MS);
    return () => clearTimeout(timer);
  }, [instant, seen, loaded, full]);

  const shown = instant ? full : full.slice(0, typed);

  return (
    <p ref={root} aria-hidden className={`label relative normal-case ${className}`}>
      <span className="invisible">{full}</span>
      <span className="absolute inset-0">
        {shown}
        {done ? null : <span className="caret" />}
      </span>
    </p>
  );
}
