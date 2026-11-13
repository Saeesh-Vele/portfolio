"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollChapter } from "@/components/ui/ScrollChapter";
import { TitleCard } from "@/components/ui/TitleCard";
import {
  experienceChronological,
  experienceSection as copy,
  queries,
  type Experience as ExperienceEntry,
} from "@/content/content";
import { useLineReveal } from "@/lib/lineReveal";
import { sheetShift } from "@/lib/sheetShift";
import { frame } from "@/store/site";
import {
  activeStation,
  EXPERIENCE_CHAPTER,
  experienceSection,
  panelSide,
  STATION_COUNT,
  titleCardOpacity,
} from "./experience.config";

/**
 * Grid placement per breakpoint, longhand only (col-start + col-end, never col-span). The
 * `col-span-*` utilities set the `grid-column` shorthand, so a responsive one silently resets
 * a base `col-start-*` and the panel falls back to auto-placement into implicit columns.
 */
const PANEL_PLACEMENT = {
  left: "col-start-1 col-end-13 md:col-start-1 md:col-end-5",
  right: "col-start-1 col-end-13 md:col-start-9 md:col-end-13",
} as const;

const pad = (value: number) => String(value).padStart(2, "0");

/** Period · company · role · mode, two bullets, and the stack as one plain mono line. */
function StationBody({ entry, split }: { entry: ExperienceEntry; split: boolean }) {
  const mark = split ? { "data-split": true } : {};
  return (
    <>
      <p {...mark} className="label">
        {entry.start} {copy.periodSeparator} {entry.end}
      </p>
      <h3 {...mark} className="display mt-2 text-[1.625rem] md:mt-3 md:text-[2.5rem]">
        {entry.station}
      </h3>
      <p {...mark} className="label mt-2 text-text">
        {entry.role} · {entry.mode}
      </p>
      <ul className="mt-3 flex flex-col gap-2 text-[0.8125rem] leading-[1.45] text-text md:mt-5 md:gap-3 md:text-[0.9375rem] md:leading-[1.55]">
        {entry.bullets.map((bullet) => (
          <li key={bullet} {...mark}>
            {bullet}
          </li>
        ))}
      </ul>
      <p {...mark} className="label mt-3 md:mt-5">
        <span className="sr-only">{copy.stackLabel}: </span>
        {entry.stack.join(", ")}
      </p>
    </>
  );
}

function StationPanel({
  entry,
  index,
  active,
}: {
  entry: ExperienceEntry;
  index: number;
  active: boolean;
}) {
  const root = useRef<HTMLLIElement>(null);
  useLineReveal(root, active);
  const side = panelSide(index);

  return (
    <li
      ref={root}
      data-active={active}
      aria-current={active ? "step" : undefined}
      // Mobile: only the active panel is in flow, so the sheet hugs it; the others are laid
      // over it (bottom-aligned) while they fade out.
      className={`station-panel relative row-start-1 ${PANEL_PLACEMENT[side]} ${
        active ? "" : "max-md:absolute max-md:inset-x-0 max-md:bottom-0"
      }`}
    >
      {/* Desktop: a soft pool of background behind the text. Mobile: the sheet's scrim. */}
      <div aria-hidden className="scrim absolute -inset-x-24 -inset-y-20 hidden md:block" />
      <div className="relative">
        <StationBody entry={entry} split />
      </div>
    </li>
  );
}

/** Reduced motion: a plain vertical timeline over the static pipeline. */
function ExperienceList() {
  return (
    <div className="px-(--gutter) pb-24 pt-[calc(var(--nav-h)+2.75rem)]">
      <TitleCard query={queries.experience} title={copy.title} overlay={false} />
      <ol className="max-w-2xl border-l border-hairline bg-bg/85">
        {experienceChronological.map((entry) => (
          <li key={entry.slug} className="relative py-7 pl-6 pr-4 md:pl-10">
            <span aria-hidden className="absolute -left-px top-9 block h-px w-4 bg-glacier md:w-6" />
            {entry.current ? (
              <p className="label mb-2 text-glacier">{copy.nowTag}</p>
            ) : null}
            <StationBody entry={entry} split={false} />
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * EXPERIENCE. A pinned chapter: scrolling rides the camera along the pipeline from station
 * to station while the DOM shows only the active station's panel — alternating left / right
 * of the path on desktop, a bottom sheet on mobile.
 */
export function Experience() {
  const [active, setActive] = useState(-1);
  const bar = useRef<HTMLSpanElement>(null);
  const tag = useRef<HTMLParagraphElement>(null);
  const hud = useRef<HTMLParagraphElement>(null);
  const sheetBody = useRef<HTMLOListElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const showing = useRef(false);

  const onProgress = useCallback((progress: number) => {
    if (title.current) {
      const opacity = titleCardOpacity(progress);
      title.current.style.opacity = opacity.toFixed(3);
      title.current.style.visibility = opacity < 0.01 ? "hidden" : "visible";
    }
    const station = activeStation(progress);
    showing.current = station >= 0;
    setActive(station);
    if (bar.current) bar.current.style.transform = `scaleY(${progress.toFixed(4)})`;
  }, []);

  useEffect(() => {
    const shift = sheetShift("experience", hud, sheetBody, showing);
    // The "NOW" tag follows the current station's ring (projected by the particle field).
    const update = () => {
      shift();
      const element = tag.current;
      if (!element) return;
      const { x, y, opacity } = frame.tag;
      element.style.opacity = opacity.toFixed(3);
      if (opacity > 0.001) {
        element.style.transform = `translate3d(${(x * window.innerWidth).toFixed(1)}px, ${(
          y * window.innerHeight
        ).toFixed(1)}px, 0) translate(-50%, -50%)`;
      }
    };
    gsap.ticker.add(update);
    return () => {
      gsap.ticker.remove(update);
      frame.viewShift.experience = 0;
    };
  }, []);

  const shown = Math.max(active, 0);

  return (
    <ScrollChapter
      id={experienceSection.id}
      length={EXPERIENCE_CHAPTER.length}
      mobileLength={EXPERIENCE_CHAPTER.mobileLength}
      onProgress={onProgress}
      reducedFallback={<ExperienceList />}
    >
      <div className="relative h-full">
        {/* Title card: the chapter opens on it, before the pipeline's first station. */}
        <TitleCard ref={title} query={queries.experience} title={copy.title} overlay />

        {/* HUD — station readout. The section label is the global SectionHud, top left. */}
        <p
          ref={hud}
          aria-hidden
          className="label absolute right-(--gutter) top-[calc(var(--nav-h)+0.75rem)] pr-3 md:pr-0"
        >
          {copy.stationLabel} <span className="text-glacier">{pad(shown + 1)}</span> /{" "}
          {pad(STATION_COUNT)}
        </p>

        {/* Progress — a hairline on the edge, filling as the chapter is scrolled */}
        <span
          aria-hidden
          className="hairline absolute right-2 top-[calc(var(--nav-h)+0.75rem)] block h-[22svh] w-px md:right-5 md:top-1/2 md:h-[32svh] md:-translate-y-1/2"
        >
          <span
            ref={bar}
            className="absolute inset-0 block origin-top bg-glacier"
            style={{ transform: "scaleY(0)" }}
          />
        </span>

        {/* Current-station tag, positioned in screen space every frame */}
        <p
          ref={tag}
          aria-hidden
          className="label pointer-events-none absolute left-0 top-0 flex items-center gap-2 text-text opacity-0"
        >
          <span className="pulse-dot inline-block size-1.5 rounded-full bg-glacier" />
          {copy.nowTag}
        </p>

        {/* Panels — stacked in one grid row; only the active one is visible. Mobile: a
            bottom sheet with no card, just a scrim the scene fades into. */}
        <div
          data-empty={active < 0}
          className="sheet absolute inset-x-0 bottom-0 md:inset-y-0"
        >
          <span aria-hidden className="sheet-rule hairline md:hidden" />
          <ol
            ref={sheetBody}
            className="relative grid grid-cols-12 gap-x-6 px-(--gutter) md:h-full md:items-center"
          >
            {experienceChronological.map((entry, index) => (
              <StationPanel
                key={entry.slug}
                entry={entry}
                index={index}
                active={index === active}
              />
            ))}
          </ol>
        </div>
      </div>
    </ScrollChapter>
  );
}
