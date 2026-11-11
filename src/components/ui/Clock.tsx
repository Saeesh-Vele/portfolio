"use client";

import { useSyncExternalStore } from "react";

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let format = formatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    formatters.set(timeZone, format);
  }
  return format;
}

function subscribe(callback: () => void) {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}

interface ClockProps {
  timeZone: string;
  zoneLabel: string;
  ariaLabel: string;
  placeholder: string;
}

/** Live clock readout in a fixed time zone. Renders a placeholder on the server. */
export function Clock({ timeZone, zoneLabel, ariaLabel, placeholder }: ClockProps) {
  const time = useSyncExternalStore(
    subscribe,
    () => formatter(timeZone).format(new Date()),
    () => placeholder,
  );
  return (
    <span aria-label={ariaLabel}>
      <span aria-hidden>
        {time} {zoneLabel}
      </span>
    </span>
  );
}
