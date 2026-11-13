"use client";

import { useEffect, useState } from "react";
import { useSite } from "@/store/site";

/** Typing / deleting speed per character, and how long a finished role holds. */
const TYPE_MS = 45;
const DELETE_MS = 24;
const HOLD_MS = 2200;
const GAP_MS = 380;

/**
 * The hero query's result: types a role, holds it, deletes it, types the next — behind a
 * blinking accent block caret. Decorative (aria-hidden); the roles are also given as
 * visually hidden text by the caller. With reduced motion it shows the first role, still.
 * Paused while the tab is hidden (timers are throttled there anyway).
 */
export function TypedRoles({ roles }: { roles: readonly string[] }) {
  const loaded = useSite((state) => state.loaded);
  const reducedMotion = useSite((state) => state.reducedMotion);
  const [text, setText] = useState("");

  useEffect(() => {
    if (reducedMotion || !loaded) return;
    let role = 0;
    let length = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const target = roles[role];
      if (!deleting) {
        length++;
        setText(target.slice(0, length));
        if (length >= target.length) {
          deleting = true;
          timer = setTimeout(step, HOLD_MS);
          return;
        }
        timer = setTimeout(step, TYPE_MS);
        return;
      }
      length--;
      setText(target.slice(0, length));
      if (length <= 0) {
        deleting = false;
        role = (role + 1) % roles.length;
        timer = setTimeout(step, GAP_MS);
        return;
      }
      timer = setTimeout(step, DELETE_MS);
    };
    timer = setTimeout(step, 500);
    return () => clearTimeout(timer);
  }, [roles, reducedMotion, loaded]);

  return (
    <span aria-hidden className="whitespace-pre">
      {reducedMotion ? roles[0] : text}
      <span className={reducedMotion ? "caret" : "caret caret-blink"} />
    </span>
  );
}
