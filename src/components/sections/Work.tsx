"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollChapter } from "@/components/ui/ScrollChapter";
import { TitleCard } from "@/components/ui/TitleCard";
import { a11y, featuredProjects, queries, work, type Project } from "@/content/content";
import { useLineReveal } from "@/lib/lineReveal";
import { MOBILE_BREAKPOINT } from "@/lib/constants";
import { lockScroll, scrollToSpan } from "@/lib/scroll";
import { sheetShift } from "@/lib/sheetShift";
import { workGraph } from "@/lib/workGraph";
import { frame, useSite } from "@/store/site";
import {
  activeProject,
  PROJECT_COUNT,
  projectAt,
  titleCardOpacity,
  WORK_CHAPTER,
  workPanelSide,
  workSection,
} from "./work.config";

const pad = (value: number) => String(value).padStart(2, "0");

/** Longhand grid placement per breakpoint — see "Breakpoint layout rule" in CLAUDE.md. */
const PANEL_PLACEMENT = {
  left: "col-start-1 col-end-13 md:col-start-1 md:col-end-7",
  right: "col-start-1 col-end-13 md:col-start-7 md:col-end-13",
} as const;

function ProjectLinks({ project }: { project: Project }) {
  if (!project.repoUrl && !project.liveUrl) return null;
  const links: { label: string; href: string }[] = [];
  if (project.repoUrl) links.push({ label: work.repoLabel, href: project.repoUrl });
  if (project.liveUrl) links.push({ label: work.liveLabel, href: project.liveUrl });
  return (
    <p className="label flex gap-5">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="border-b border-hairline pb-0.5 text-text transition-colors duration-300 hover:border-glacier"
        >
          {link.label} <span aria-hidden>{work.linkGlyph}</span>
          <span className="sr-only">
            {" "}
            — {project.title} {a11y.newTab}
          </span>
        </a>
      ))}
    </p>
  );
}

/**
 * One case study. `compact` (the mobile bottom sheet) keeps the one-liner, stack and links
 * and leaves the problem / built / result to wider screens and the expanded sheet. `more` is
 * the mobile "READ MORE" control, set inline at the end of the links row.
 */
function CaseStudy({
  project,
  index,
  split,
  compact,
  more,
}: {
  project: Project;
  index: number;
  split: boolean;
  compact: boolean;
  more?: ReactNode;
}) {
  const mark = split ? { "data-split": true } : {};
  const detail = compact ? "hidden md:block" : "";
  const context = [project.label, project.award].filter(Boolean);
  return (
    <>
      <p {...mark} className="label">
        <span className="text-glacier">
          {work.indexPrefix} / {pad(index + 1)}
        </span>
        <span aria-hidden> · </span>
        {work.status[project.status]}
      </p>
      {context.map((line) => (
        <p key={line} {...mark} className="label mt-1 text-text">
          {line}
        </p>
      ))}
      <h3 {...mark} className="display mt-2 text-[1.5rem] md:mt-3 md:text-[2.125rem]">
        {project.title}
      </h3>
      <p
        {...mark}
        className="mt-2 text-[0.8125rem] leading-[1.45] text-text md:mt-3 md:text-[0.9375rem] md:leading-[1.5]"
      >
        {project.oneLiner}
      </p>

      <div
        className={`mt-3 flex-col gap-3 text-[0.8125rem] leading-[1.45] text-text md:mt-4 md:flex md:text-[0.8125rem] md:leading-[1.5] ${
          compact ? "hidden" : "flex"
        }`}
      >
        <div className={detail}>
          <p className="label mb-1">{work.problemLabel}</p>
          <p {...mark}>{project.problem}</p>
        </div>
        <div className={detail}>
          <p className="label mb-1">{work.builtLabel}</p>
          <ul className="flex flex-col gap-1">
            {project.built.map((item) => (
              <li key={item} {...mark} className="relative pl-4">
                <span aria-hidden className="absolute left-0 top-[0.7em] block h-px w-2 bg-muted" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="label mb-1">{work.resultLabel}</p>
          <p {...mark}>{project.result}</p>
          {project.detail ? (
            <p {...mark} className={`mt-1 text-muted ${detail}`}>
              {project.detail}
            </p>
          ) : null}
        </div>
      </div>

      <p {...mark} className="label mt-3 md:mt-4">
        <span className="sr-only">{work.stackLabel}: </span>
        {project.stack.join(", ")}
      </p>
      <div className="mt-3 flex items-baseline gap-5 md:mt-4">
        <ProjectLinks project={project} />
        {more ? <span className="ml-auto md:hidden">{more}</span> : null}
      </div>
    </>
  );
}

function CasePanel({
  project,
  index,
  active,
  side,
  onFocusInactive,
  more,
}: {
  project: Project;
  index: number;
  active: boolean;
  side: "left" | "right";
  /** Keyboard focus landed in a hidden panel: travel to it so the focus is visible. */
  onFocusInactive: (index: number) => void;
  more: ReactNode;
}) {
  const root = useRef<HTMLLIElement>(null);
  useLineReveal(root, active);
  return (
    <li
      ref={root}
      data-active={active}
      aria-current={active ? "step" : undefined}
      onFocus={() => {
        if (!active) onFocusInactive(index);
      }}
      // Mobile: only the active panel is in flow, so the sheet hugs it.
      className={`station-panel relative row-start-1 ${PANEL_PLACEMENT[side]} ${
        active ? "" : "max-md:absolute max-md:inset-x-0 max-md:bottom-0"
      }`}
    >
      <div aria-hidden className="scrim absolute -inset-x-24 -inset-y-16 hidden md:block" />
      <div className={`relative ${side === "left" ? "md:pr-16" : "md:pl-16"}`}>
        <CaseStudy project={project} index={index} split compact more={more} />
      </div>
    </li>
  );
}

/** Reduced motion: every case study in full, as a plain list over the static graph. */
function WorkList() {
  return (
    <div className="px-(--gutter) pb-20 pt-[calc(var(--nav-h)+2.75rem)]">
      <TitleCard query={queries.work} title={work.title} overlay={false} />
      <ol className="max-w-2xl border-l border-hairline bg-bg/90">
        {featuredProjects.map((project, index) => (
          <li key={project.slug} className="py-8 pl-6 pr-4 md:pl-10">
            <CaseStudy project={project} index={index} split={false} compact={false} />
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * WORK. A pinned chapter: the project graph in overview, then a dive to each featured
 * project with its case study, then a pull-back. Tech labels and project hit-targets are
 * DOM elements that follow their nodes (positions projected by the particle field).
 */
export function Work() {
  const [active, setActive] = useState(-1);
  const viewport = useSite((state) => state.viewport);
  const mobile = viewport?.isMobile ?? false;
  const graph = workGraph(mobile);
  const bar = useRef<HTMLSpanElement>(null);
  const followers = useRef<(HTMLElement | null)[]>([]);
  const hud = useRef<HTMLParagraphElement>(null);
  const sheetBody = useRef<HTMLOListElement>(null);
  const title = useRef<HTMLDivElement>(null);
  /** Title card opacity, read by the tech labels so they never sit on top of it. */
  const titleOpacity = useRef(1);
  const showing = useRef(false);

  const onProgress = useCallback((progress: number) => {
    const opacity = titleCardOpacity(progress);
    titleOpacity.current = opacity;
    if (title.current) {
      title.current.style.opacity = opacity.toFixed(3);
      title.current.style.visibility = opacity < 0.01 ? "hidden" : "visible";
    }
    const project = activeProject(progress);
    showing.current = project >= 0;
    setActive(project);
    if (bar.current) bar.current.style.transform = `scaleY(${progress.toFixed(4)})`;
  }, []);

  // Node followers: project hit-targets first, then tech labels — the order of frame.nodes.
  useEffect(() => {
    const projectCount = graph.projects.length;
    const diameter = graph.projectRadius * 2.3;
    const shift = sheetShift("work", hud, sheetBody, showing);
    /** Tech label widths (px), measured once they have laid out. */
    const widths: number[] = [];
    const update = () => {
      shift();
      const width = window.innerWidth;
      const height = window.innerHeight;
      const mobile = width < MOBILE_BREAKPOINT;
      // Labels stay inside the viewport's gutters, whatever their node does.
      const margin = mobile ? 16 : 40;
      // Phones: a label whose node has gone behind the bottom sheet hides with it.
      const floor =
        mobile && showing.current && sheetBody.current
          ? sheetBody.current.getBoundingClientRect().top - 72
          : Infinity;
      // ...and below the HUD row (case readout, progress), never on top of it.
      const ceiling = (hud.current?.getBoundingClientRect().bottom ?? 0) + 12;
      // While the title card shows, labels that would land on it fade out with it in.
      const card = titleOpacity.current > 0.01 ? title.current?.getBoundingClientRect() : undefined;
      followers.current.forEach((element, i) => {
        if (!element) return;
        const o = i * 4;
        const opacity = frame.nodes[o + 1] * height > floor ? 0 : frame.nodes[o + 2];
        element.style.opacity = opacity.toFixed(3);
        element.style.visibility = opacity > 0.02 ? "visible" : "hidden";
        if (opacity <= 0.02) return;
        const x = frame.nodes[o] * width;
        const y = frame.nodes[o + 1] * height;
        if (i >= projectCount) {
          // Tech label: hangs just below its node, however large the node is on screen.
          if (!widths[i]) widths[i] = element.offsetWidth;
          const half = (widths[i] || 0) / 2;
          const left = Math.min(Math.max(x, margin + half), width - margin - half);
          const drop = frame.nodes[o + 3] * graph.techRadius + 6;
          const top = Math.max(y + drop, ceiling);
          if (card && top < card.bottom + 8 && left - half < card.right) {
            element.style.opacity = (opacity * (1 - titleOpacity.current)).toFixed(3);
          }
          element.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0) translateX(-50%)`;
          return;
        }
        element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        const size = Math.max(28, frame.nodes[o + 3] * diameter).toFixed(1);
        element.style.width = `${size}px`;
        element.style.height = `${size}px`;
      });
    };
    gsap.ticker.add(update);
    return () => {
      gsap.ticker.remove(update);
      frame.viewShift.work = 0;
    };
  }, [graph]);

  const focused = active >= 0;

  // Mobile: the sheet can expand to the full case study. Page scrolling (which drives the
  // camera) is locked while it is open, so the sheet's own scroll is the only one.
  const [expanded, setExpanded] = useState(false);
  const moreButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const sheet = useRef<HTMLDivElement>(null);
  const open = expanded && focused && mobile;
  const collapse = useCallback(() => {
    setExpanded(false);
    moreButtons.current[active]?.focus({ preventScroll: true });
  }, [active]);
  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    sheet.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") collapse();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      lockScroll(false);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, collapse]);

  // Tab order: each case study's links are reached in project order; focusing one travels
  // the chapter to that project so the focused link is on screen.
  const focusProject = useCallback(
    (index: number) => {
      if (viewport) scrollToSpan(workSection.id, projectAt(index, viewport), 1.2);
    },
    [viewport],
  );

  return (
    <ScrollChapter
      id={workSection.id}
      length={WORK_CHAPTER.length}
      mobileLength={WORK_CHAPTER.mobileLength}
      onProgress={onProgress}
      reducedFallback={<WorkList />}
    >
      <div className="relative h-full">
        {/* Title card over the graph overview, before the first case study. */}
        <TitleCard ref={title} query={queries.work} title={work.title} overlay />

        {/* Project nodes: hover shows the title, click travels to that case study (desktop). */}
        {graph.projects.map((project, index) => (
          <button
            key={project.slug}
            ref={(element) => {
              followers.current[index] = element;
            }}
            type="button"
            aria-label={`${work.nodeLabel} ${project.title}`}
            onClick={() => viewport && scrollToSpan(workSection.id, projectAt(index, viewport))}
            className="group absolute left-0 top-0 hidden cursor-pointer rounded-full opacity-0 md:block"
          >
            <span className="label pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap bg-bg px-1.5 py-0.5 text-text opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
              {project.title}
            </span>
          </button>
        ))}

        {/* Tech nodes: accent when the active project uses them, dimmed when it doesn't. */}
        {graph.techs.map((tech, index) => {
          const lit = focused && tech.projects.includes(active);
          return (
            <p
              key={tech.name}
              ref={(element) => {
                followers.current[graph.projects.length + index] = element;
              }}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 opacity-0"
            >
              <span
                className={`label block whitespace-nowrap text-[0.625rem] transition-[color,opacity] duration-500 md:text-[0.6875rem] ${
                  lit ? "text-glacier" : focused ? "opacity-30" : "text-text"
                }`}
              >
                {tech.name}
              </span>
            </p>
          );
        })}

        {/* HUD — case readout. The section label is the global SectionHud, top left. */}
        <p
          ref={hud}
          aria-hidden
          className={`label absolute right-(--gutter) top-[calc(var(--nav-h)+0.75rem)] pr-3 transition-opacity duration-500 md:pr-0 ${
            focused ? "opacity-100" : "opacity-0"
          }`}
        >
          {work.indexPrefix} <span className="text-glacier">{pad(Math.max(active, 0) + 1)}</span> /{" "}
          {pad(PROJECT_COUNT)}
        </p>
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

        {/* Case studies — one grid row, only the active one visible. Mobile: a bottom sheet
            with no card, just a scrim the scene fades into. */}
        <div
          data-empty={!focused}
          className="sheet pointer-events-none absolute inset-x-0 bottom-0 md:inset-y-0"
        >
          <span aria-hidden className="sheet-rule hairline md:hidden" />
          <ol
            ref={sheetBody}
            className="relative grid grid-cols-12 gap-x-6 px-(--gutter) md:h-full md:items-center"
          >
            {featuredProjects.map((project, index) => (
              <CasePanel
                key={project.slug}
                project={project}
                index={index}
                active={index === active}
                side={viewport ? workPanelSide(index, viewport) : index % 2 === 0 ? "left" : "right"}
                onFocusInactive={focusProject}
                more={
                  <button
                    ref={(element) => {
                      moreButtons.current[index] = element;
                    }}
                    type="button"
                    aria-expanded={open && index === active}
                    onClick={() => setExpanded(true)}
                    className="label inline-flex min-h-6 cursor-pointer items-center text-text"
                  >
                    {work.more}&nbsp;<span aria-hidden>{work.moreGlyph}</span>
                    <span className="sr-only"> — {project.title}</span>
                  </button>
                }
              />
            ))}
          </ol>
        </div>

        {/* Mobile: the full case study, scrollable inside the expanded sheet. */}
        {open ? (
          <div
            ref={sheet}
            role="dialog"
            aria-label={`${a11y.caseSheet}: ${featuredProjects[active].title}`}
            tabIndex={-1}
            data-lenis-prevent
            className="absolute inset-x-0 bottom-0 z-10 max-h-[calc(100dvh-var(--nav-h)-1rem)] overflow-y-auto overscroll-contain border-t border-hairline bg-bg/95 px-(--gutter) pb-6 pt-5 md:hidden"
          >
            <CaseStudy
              project={featuredProjects[active]}
              index={active}
              split={false}
              compact={false}
            />
            <button
              type="button"
              aria-expanded
              onClick={collapse}
              className="label mt-6 inline-flex min-h-6 cursor-pointer items-center text-text"
            >
              {work.less} <span aria-hidden>{work.lessGlyph}</span>
            </button>
          </div>
        ) : null}
      </div>
    </ScrollChapter>
  );
}
