"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollChapter } from "@/components/ui/ScrollChapter";
import { capabilities } from "@/content/content";
import { layoutClusters } from "@/lib/clusterLayout";
import { MAX_CLUSTERS, MOBILE_BREAKPOINT } from "@/lib/constants";
import { useSeen } from "@/lib/hooks";
import { useLineReveal } from "@/lib/lineReveal";
import { skillEvidence } from "@/lib/skillEvidence";
import { frame, useSite } from "@/store/site";
import {
  clusterSpread,
  columnExit,
  columnReveal,
  SKILLS_CHAPTER,
  skillsSection,
} from "./skills.config";

/**
 * Longhand grid placement per breakpoint — see "Breakpoint layout rule" in CLAUDE.md. The
 * columns sit side by side from md up; below it they are stacked panels.
 */
const COLUMN_PLACEMENT = [
  "col-start-1 col-end-13 md:col-start-1 md:col-end-4",
  "col-start-1 col-end-13 md:col-start-4 md:col-end-7",
  "col-start-1 col-end-13 md:col-start-7 md:col-end-10",
  "col-start-1 col-end-13 md:col-start-10 md:col-end-13",
];

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * CAPABILITIES — a short pinned chapter. The heading has the stage to itself first; then the
 * merged particle mass in the band below it separates into one shape per column as that
 * column reveals (side by side on desktop, one panel at a time on phones). The band is real
 * layout: it is measured every frame and handed to the particle field, so a cluster always
 * sits in the space left for it and never over the heading or the column text.
 *
 * A skill with evidence is interactive: hover / focus (desktop) or tap (mobile) shows where
 * it was used. No levels, no bars — evidence or nothing.
 */
export function Capabilities() {
  const root = useRef<HTMLDivElement>(null);
  const band = useRef<HTMLDivElement>(null);
  const columnEls = useRef<(HTMLDivElement | null)[]>([]);
  const alsoEl = useRef<HTMLParagraphElement>(null);
  /** 0..1 through the pinned distance. */
  const progress = useRef(0);
  /** Column whose cluster is lit by hover / tap, or -1. */
  const lit = useRef(-1);
  /** Column that received keyboard focus while still hidden, or -1: shown regardless. */
  const forced = useRef(-1);

  const reducedMotion = useSite((state) => state.reducedMotion);
  const seen = useSeen(root, 0.2);
  useLineReveal(root, seen);

  /** [column, skill] currently showing its evidence. */
  const [shown, setShown] = useState<[number, string] | null>(null);
  const [column, setColumn] = useState(-1);

  const evidence = useMemo(
    () => capabilities.columns.map((group) => group.items.map((item) => skillEvidence(item))),
    [],
  );

  useEffect(() => {
    lit.current = column >= 0 ? column : (shown?.[0] ?? -1);
  }, [column, shown]);

  // Every frame: measure the band, hand the cluster boxes to the particle field, and scrub
  // the column reveals from the chapter's progress. No React state involved.
  useEffect(() => {
    const desktop = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`);
    const count = Math.min(capabilities.columns.length, MAX_CLUSTERS);
    const activity = new Float32Array(MAX_CLUSTERS);
    const extents = Array.from({ length: count }, () => ({ left: 0, width: 0 }));
    const applied = new Float32Array(count + 1).fill(-1);
    const columns = columnEls.current;
    const also = alsoEl.current;

    const show = (element: HTMLElement | null, slot: number, visible: number) => {
      if (!element || reducedMotion || Math.abs(applied[slot] - visible) < 0.001) return;
      applied[slot] = visible;
      element.style.opacity = visible.toFixed(3);
      element.style.transform = `translate3d(0, ${((1 - visible) * 14).toFixed(1)}px, 0)`;
      element.style.pointerEvents = visible > 0.6 ? "" : "none";
    };

    const tick = () => {
      const bandElement = band.current;
      if (!bandElement) return;
      const rect = bandElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (rect.bottom < -viewportHeight || rect.top > 2 * viewportHeight) return;

      const mobile = !desktop.matches;
      const p = progress.current;
      let active = -1;
      let last = 1;
      for (let i = 0; i < count; i++) {
        let visible = 1;
        let spread = 1;
        if (!reducedMotion) {
          if (forced.current >= 0) visible = !mobile || forced.current === i ? 1 : 0;
          else visible = Math.min(columnReveal(p, i, mobile), 1 - columnExit(p, i, count, mobile));
          spread = forced.current >= 0 ? 1 : clusterSpread(p, i, mobile);
        }
        show(columns[i], i, visible);
        last = visible;
        // Phones: the panel being read drives its cluster's size and highlight.
        activity[i] = mobile && !reducedMotion ? visible : 0;
        if (activity[i] > 0.5) active = i;
        frame.clusterSpread[i] = spread;
        if (!mobile) {
          const extent = columns[i]?.getBoundingClientRect();
          extents[i].left = extent?.left ?? rect.left;
          extents[i].width = extent?.width ?? rect.width;
        }
      }
      show(also, count, last);
      layoutClusters(rect, mobile ? null : extents, activity, frame.clusterBox, frame.clusterHome);

      const focus = lit.current >= 0 ? lit.current : active;
      for (let i = 0; i < MAX_CLUSTERS; i++) frame.clusterHover[i] = i === focus ? 1 : 0;
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      frame.clusterHover.fill(0);
      for (const element of [...columns, also]) {
        if (!element) continue;
        element.style.opacity = "";
        element.style.transform = "";
        element.style.pointerEvents = "";
      }
    };
  }, [reducedMotion]);

  const total = capabilities.columns.length;
  const content = (
    <div
      ref={root}
      // The section label is the global SectionHud: the heading starts just below its line.
      className={`relative flex flex-col px-(--gutter) pb-6 pt-[calc(var(--nav-h)+2.5rem)] max-md:justify-center md:pb-10 md:pt-[calc(var(--nav-h)+2.5rem)] ${
        reducedMotion ? "min-h-svh" : "h-full"
      }`}
    >
      <h2 data-split className="display text-[clamp(2rem,4.4vw,3.5rem)]">
        {capabilities.heading}
      </h2>

      {/* The clusters' band: whatever height is left between the heading and the columns.
          Phones hold the shapes 2 × 2 in square cells, so the band is capped at its own
          width: no dead space between the shapes and the column text. */}
      <div
        ref={band}
        aria-hidden
        className={`my-3 min-h-0 flex-1 max-md:max-h-[calc(100vw-2*var(--gutter))] md:my-4 ${
          reducedMotion ? "min-h-48 md:min-h-64" : ""
        }`}
      />

      <div className={`grid grid-cols-12 gap-x-6 ${reducedMotion ? "gap-y-10" : ""}`}>
        {capabilities.columns.map((group, c) => {
          const active = shown && shown[0] === c ? shown[1] : null;
          const used = active ? evidence[c][group.items.indexOf(active)] : [];
          return (
            <div
              key={group.title}
              ref={(element) => {
                columnEls.current[c] = element;
              }}
              // Pinned: the panels share one row (stacked on phones, side by side from md).
              className={`border-t border-hairline pt-3 will-change-[opacity,transform] md:pt-4 ${
                reducedMotion ? "md:row-start-1" : "row-start-1"
              } ${COLUMN_PLACEMENT[c] ?? COLUMN_PLACEMENT[0]}`}
              onFocus={() => {
                forced.current = c;
              }}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setColumn(c);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== "mouse") return;
                setColumn(-1);
                setShown(null);
              }}
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-xl font-medium tracking-[-0.02em] text-text md:text-2xl">
                  {group.title}
                </h3>
                <p className="label shrink-0 md:hidden">
                  {pad(c + 1)} {capabilities.stepSeparator} {pad(total)}
                </p>
              </div>
              {group.line ? (
                <p className="mt-1 text-sm leading-[1.45] text-muted">{group.line}</p>
              ) : null}
              {/* Two sub-columns on phones and on short desktop viewports: the height saved
                  goes to the clusters' band. */}
              <ul className="label mt-3 grid grid-cols-2 items-start gap-x-4 leading-[1.35] text-text md:mt-4 md:grid-cols-1 md:[@media(max-height:860px)]:grid-cols-2">
                {group.items.map((item, i) =>
                  evidence[c][i].length > 0 ? (
                    <li key={item}>
                      <button
                        type="button"
                        aria-expanded={active === item}
                        // Mouse: hover shows it. Touch and keyboard: activating toggles it.
                        onPointerEnter={(event) => {
                          if (event.pointerType === "mouse") setShown([c, item]);
                        }}
                        onClick={(event) => {
                          const hovering = event.detail > 0 && column === c;
                          setShown(active === item && !hovering ? null : [c, item]);
                        }}
                        // 24px tall rows: a WCAG 2.5.8 target size. The underline is on the text.
                        className={`group flex min-h-6 cursor-pointer items-center text-left uppercase tracking-[0.12em] transition-colors duration-300 ${
                          active === item ? "text-glacier" : ""
                        }`}
                      >
                        <span
                          className={`border-b transition-colors duration-300 ${
                            active === item
                              ? "border-glacier"
                              : "border-hairline group-hover:border-muted"
                          }`}
                        >
                          {item}
                        </span>
                      </button>
                    </li>
                  ) : (
                    <li key={item} className="flex min-h-6 items-center">
                      {item}
                    </li>
                  ),
                )}
              </ul>
              {/* Evidence readout. Space is reserved so the column never jumps. */}
              <p
                aria-live="polite"
                className="label mt-3 min-h-[2.8rem] leading-[1.35] md:mt-4 md:min-h-[3.75rem]"
              >
                {active && used.length > 0 ? (
                  <>
                    <span className="text-glacier">
                      {capabilities.evidenceLabel} {capabilities.evidenceGlyph}
                    </span>{" "}
                    <span className="text-text">{used.join(", ")}</span>
                  </>
                ) : null}
              </p>
              {c === total - 1 ? (
                <p className="label mt-2 md:hidden">{capabilities.also}</p>
              ) : null}
            </div>
          );
        })}
      </div>
      <p ref={alsoEl} className="label mt-4 hidden md:block">
        {capabilities.also}
      </p>
    </div>
  );

  return (
    <ScrollChapter
      id={skillsSection.id}
      length={SKILLS_CHAPTER.length}
      mobileLength={SKILLS_CHAPTER.mobileLength}
      reducedFallback={content}
      onProgress={(value) => {
        // Scrolling on hands the reveals back to the scroll position.
        if (Math.abs(value - progress.current) > 0.002) forced.current = -1;
        progress.current = value;
      }}
    >
      {content}
    </ScrollChapter>
  );
}
