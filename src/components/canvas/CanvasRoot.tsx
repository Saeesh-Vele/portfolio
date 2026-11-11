"use client";

import dynamic from "next/dynamic";

// three.js stays out of the server render and the initial bundle, so text paints first.
const Scene = dynamic(() => import("./Scene"), { ssr: false });

/** The one fixed canvas behind the whole site. Decorative, so hidden from assistive tech. */
export function CanvasRoot() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <Scene />
    </div>
  );
}
