"use client";

import { useSyncExternalStore } from "react";
import { notFound } from "@/content/content";

const subscribe = () => () => {};

/** 404 readout: the address that returned nothing. Empty until hydrated. */
export function RequestedPath({ className }: { className?: string }) {
  const path = useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => "",
  );
  return (
    <p aria-hidden className={className}>
      {notFound.pathLabel} <span className="text-text">{path}</span>
    </p>
  );
}
