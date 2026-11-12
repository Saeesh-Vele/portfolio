"use client";

import { useSyncExternalStore } from "react";

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string, seconds: boolean) {
  const key = `${timeZone}|${seconds}`;
  let format = formatters.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: seconds ? "2-digit" : undefined,
      hour12: false,
    });
    formatters.set(key, format);
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
  /** Show seconds (default) or just HH:MM. */
  seconds?: boolean;
  /** Text before the time, e.g. "MUMBAI ·". */
  prefix?: string;
}

/** Live clock readout in a fixed time zone. Renders a placeholder on the server. */
export function Clock({
  timeZone,
  zoneLabel,
  ariaLabel,
  placeholder,
  seconds = true,
  prefix,
}: ClockProps) {
  const time = useSyncExternalStore(
    subscribe,
    () => formatter(timeZone, seconds).format(new Date()),
    () => placeholder,
  );
  // A plain span can't carry an aria-label: the label is visually hidden text instead, and
  // the (redundant) prefix is hidden from assistive tech.
  return (
    <span>
      <span className="sr-only">{ariaLabel}: </span>
      {prefix ? <span aria-hidden>{prefix} </span> : null}
      {time} {zoneLabel}
    </span>
  );
}
