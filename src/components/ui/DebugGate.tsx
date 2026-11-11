"use client";

import { lazy, Suspense, useSyncExternalStore } from "react";

const DebugOverlay = lazy(() => import("./DebugOverlay"));

const subscribe = () => () => {};
const enabled = () => new URLSearchParams(window.location.search).get("debug") === "1";

/**
 * Mounts the performance overlay only when the URL has ?debug=1. Without the flag nothing is
 * rendered and the overlay's code is never fetched.
 */
export function DebugGate() {
  const on = useSyncExternalStore(subscribe, enabled, () => false);
  if (!on) return null;
  return (
    <Suspense fallback={null}>
      <DebugOverlay />
    </Suspense>
  );
}
