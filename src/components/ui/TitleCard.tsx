"use client";

import { useRef, type Ref } from "react";
import { QueryLine } from "@/components/ui/QueryLine";
import { useSeen } from "@/lib/hooks";
import { useLineReveal } from "@/lib/lineReveal";

/**
 * A chapter's opening title card: its query line, then a short display heading in Geist
 * heavy (the chapter's h2). Pinned chapters lay it over the stage's top left and fade it out
 * (through `ref`) before their first panel; reduced-motion fallbacks render it in flow.
 */
export function TitleCard({
  query,
  title,
  overlay,
  ref,
}: {
  query: string;
  title: string;
  /** Laid over the pinned stage (absolute, top left, pointer-transparent). */
  overlay: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const seen = useSeen(root, 0.4);
  useLineReveal(root, seen);

  return (
    <div
      ref={ref}
      className={
        overlay
          ? "pointer-events-none absolute inset-x-(--gutter) top-[calc(var(--nav-h)+2.75rem)] md:top-[calc(var(--nav-h)+3.25rem)]"
          : "relative mb-10 md:mb-14"
      }
    >
      <div ref={root} className="relative max-w-[min(100%,56rem)]">
        <div aria-hidden className="scrim absolute -inset-x-20 -inset-y-14" />
        <div className="relative">
          <QueryLine text={query} />
          <h2
            data-split
            className="display mt-3 max-w-[13ch] text-[clamp(2.5rem,11.5vw,3.75rem)] font-extrabold leading-[0.94] md:mt-5 md:text-[clamp(3.25rem,min(6.4vw,11vh),6.5rem)]"
          >
            {title}
          </h2>
        </div>
      </div>
    </div>
  );
}
