"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollChapter } from "@/components/ui/ScrollChapter";
import { about, stats, type Stat } from "@/content/content";
import { useSeen } from "@/lib/hooks";
import { useLineReveal } from "@/lib/lineReveal";
import { frame, useSite } from "@/store/site";
import { ABOUT_CHAPTER, aboutSection } from "./about.config";

const ORDINALS = ["th", "st", "nd", "rd"];

/** The stat's text at `t` (0..1) of its count-up. At t = 1 it equals `stat.value`. */
function formatStat({ count }: Stat, t: number): string {
  const value = count.to * t;
  if (count.ordinal) {
    const n = Math.max(1, Math.round(value));
    return `${n}${ORDINALS[n] ?? ORDINALS[0]}`;
  }
  const decimals = count.decimals ?? 0;
  const text = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${count.prefix ?? ""}${text}${count.suffix ?? ""}`;
}

/**
 * The stage's content. `data-stats-*` hooks are what the STATS formation measures to stand
 * each particle column on its stat (see statsLayout.ts): the columns occupy the empty band
 * between the bio and the grid.
 */
function AboutStage({ pinned }: { pinned: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const values = useRef<(HTMLSpanElement | null)[]>([]);
  const reducedMotion = useSite((state) => state.reducedMotion);
  const seen = useSeen(root, 0.55);

  useLineReveal(root, seen);

  // One tween per stat drives both its counter and its particle column (frame.statsRise).
  useEffect(() => {
    const write = (index: number, t: number) => {
      frame.statsRise[index] = t;
      const element = values.current[index];
      if (element) element.textContent = formatStat(stats[index], t);
    };
    if (reducedMotion) {
      stats.forEach((_, index) => write(index, 1));
      return;
    }
    if (!seen) {
      stats.forEach((_, index) => write(index, 0));
      return;
    }
    const tweens = stats.map((_, index) => {
      const state = { t: 0 };
      return gsap.to(state, {
        t: 1,
        duration: 2.2,
        delay: 0.3 + index * 0.14,
        ease: "power3.out",
        onUpdate: () => write(index, state.t),
      });
    });
    return () => tweens.forEach((tween) => tween.kill());
  }, [seen, reducedMotion]);

  return (
    <div
      ref={root}
      data-stats-stage
      className={`relative flex flex-col px-(--gutter) pb-5 pt-[calc(var(--nav-h)+0.875rem)] md:pb-9 md:pt-[calc(var(--nav-h)+2rem)] ${
        pinned ? "h-full" : "min-h-svh"
      }`}
    >
      <h2 className="sr-only">{about.heading}</h2>

      <div className="grid grid-cols-12 gap-x-6">
        <p className="label col-span-12 md:col-span-2">{about.label}</p>

        <p
          data-split
          className="col-span-12 mt-3 text-[0.9375rem] leading-[1.42] tracking-[-0.01em] text-text md:col-span-7 md:mt-0 md:text-[clamp(1.25rem,min(2vw,3.4vh),1.875rem)] md:leading-[1.28] md:tracking-[-0.02em]"
        >
          {about.bio.map((part) =>
            part.emphasis ? (
              <em key={part.text} className="serif-em text-[1.08em]">
                {part.text}
              </em>
            ) : (
              part.text
            ),
          )}
        </p>

        <div className="col-span-12 mt-3 md:col-span-3 md:mt-1">
          <p className="label hidden md:block">{about.educationLabel}</p>
          <p data-split className="label text-text md:mt-2 md:leading-[1.6]">
            {about.educationLine.join(" · ")}
          </p>
        </div>
      </div>

      {/* The particle columns stand here. */}
      <div data-stats-band aria-hidden className="min-h-14 flex-1" />

      <div className="relative">
        {/* Local dimming: particles behind the stats fade into the background colour. */}
        <div aria-hidden className="scrim-rise absolute -inset-x-(--gutter) -bottom-9 -top-3" />
        <ul className="relative grid grid-cols-3 gap-x-4 gap-y-4 md:grid-cols-6 md:gap-x-6">
          {stats.map((stat, index) => (
            <li key={stat.label} data-stat-cell className="border-t border-hairline pt-2.5 md:pt-3">
              <p className="font-mono text-[1.625rem] leading-none tracking-[-0.04em] text-glacier tabular-nums md:text-[clamp(2rem,3.3vw,3.25rem)]">
                <span className="sr-only">{stat.value}</span>
                <span
                  aria-hidden
                  ref={(element) => {
                    values.current[index] = element;
                  }}
                >
                  {stat.value}
                </span>
              </p>
              <p className="label mt-2 text-[0.625rem] leading-[0.875rem] md:mt-3 md:text-xs md:leading-4">
                <span className="block text-text">{stat.label}</span>
                {stat.note ? <span className="block">{stat.note}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * ABOUT + NUMBERS. Pinned while the camera orbits the particle columns and settles square-on;
 * with reduced motion it is a plain section over the static columns.
 */
export function About() {
  return (
    <ScrollChapter
      id={aboutSection.id}
      length={ABOUT_CHAPTER.length}
      mobileLength={ABOUT_CHAPTER.mobileLength}
      reducedFallback={<AboutStage pinned={false} />}
    >
      <AboutStage pinned />
    </ScrollChapter>
  );
}
