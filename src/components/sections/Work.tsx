"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollChapter } from "@/components/ui/ScrollChapter";
import { featuredProjects, work, type Project } from "@/content/content";
import { useLineReveal } from "@/lib/lineReveal";
import { lockScroll, scrollToSpan } from "@/lib/scroll";
import { workGraph } from "@/lib/workGraph";
import { frame, useSite } from "@/store/site";
import {
  activeProject,
  PROJECT_COUNT,
  projectAt,
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
          <span className="sr-only"> — {project.title}</span>
        </a>
      ))}
    </p>
  );
}

/**
 * One case study. `compact` (the mobile bottom sheet) keeps the one-liner, result, stack and
 * links and leaves the problem / built detail to wider screens.
 */
function CaseStudy({
  project,
  index,
  split,
  compact,
}: {
  project: Project;
  index: number;
  split: boolean;
  compact: boolean;
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

      <div className="mt-3 flex flex-col gap-3 text-[0.8125rem] leading-[1.45] text-text md:mt-4 md:text-[0.8125rem] md:leading-[1.5]">
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
      <div className="mt-3 md:mt-4">
        <ProjectLinks project={project} />
      </div>
    </>
  );
}

function CasePanel({
  project,
  index,
  active,
  side,
}: {
  project: Project;
  index: number;
  active: boolean;
  side: "left" | "right";
}) {
  const root = useRef<HTMLLIElement>(null);
  useLineReveal(root, active);
  return (
    <li
      ref={root}
      data-active={active}
      aria-current={active ? "step" : undefined}
      className={`station-panel relative row-start-1 ${PANEL_PLACEMENT[side]}`}
    >
      <div aria-hidden className="scrim absolute -inset-x-24 -inset-y-16 hidden md:block" />
      <div className={`relative ${side === "left" ? "md:pr-16" : "md:pl-16"}`}>
        <CaseStudy project={project} index={index} split compact />
      </div>
    </li>
  );
}

/** Reduced motion: every case study in full, as a plain list over the static graph. */
function WorkList() {
  return (
    <div className="px-(--gutter) pb-20 pt-[calc(var(--nav-h)+2rem)]">
      <p className="label">{work.label}</p>
      <h2 className="sr-only">{work.heading}</h2>
      <ol className="mt-8 max-w-2xl border-l border-hairline bg-bg/90">
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

  const onProgress = useCallback((progress: number) => {
    setActive(activeProject(progress));
    if (bar.current) bar.current.style.transform = `scaleY(${progress.toFixed(4)})`;
  }, []);

  // Node followers: project hit-targets first, then tech labels — the order of frame.nodes.
  useEffect(() => {
    const projectCount = graph.projects.length;
    const diameter = graph.projectRadius * 2.3;
    const update = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      followers.current.forEach((element, i) => {
        if (!element) return;
        const o = i * 4;
        const opacity = frame.nodes[o + 2];
        element.style.opacity = opacity.toFixed(3);
        element.style.visibility = opacity > 0.02 ? "visible" : "hidden";
        if (opacity <= 0.02) return;
        const x = (frame.nodes[o] * width).toFixed(1);
        const y = (frame.nodes[o + 1] * height).toFixed(1);
        if (i >= projectCount) {
          // Tech label: hangs just below its node, however large the node is on screen.
          const drop = (frame.nodes[o + 3] * graph.techRadius + 6).toFixed(1);
          element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, ${drop}px)`;
          return;
        }
        element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        if (i < projectCount) {
          const size = Math.max(28, frame.nodes[o + 3] * diameter).toFixed(1);
          element.style.width = `${size}px`;
          element.style.height = `${size}px`;
        }
      });
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, [graph]);

  const focused = active >= 0;

  // Mobile: the sheet can expand to the full case study. Page scrolling (which drives the
  // camera) is locked while it is open, so the sheet's own scroll is the only one.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    lockScroll(true);
    return () => lockScroll(false);
  }, [expanded]);
  const open = expanded && focused && mobile;

  return (
    <ScrollChapter
      id={workSection.id}
      length={WORK_CHAPTER.length}
      mobileLength={WORK_CHAPTER.mobileLength}
      onProgress={onProgress}
      reducedFallback={<WorkList />}
    >
      <div className="relative h-full">
        <h2 className="sr-only">{work.heading}</h2>

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

        {/* HUD */}
        <p className="label absolute left-(--gutter) top-[calc(var(--nav-h)+0.75rem)]">
          {work.label}
        </p>
        <p
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

        {/* Case studies — one grid row, only the active one visible. Mobile: a bottom sheet. */}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 border-t border-hairline bg-surface transition-opacity duration-500 md:inset-y-0 md:border-0 md:bg-transparent md:opacity-100 ${
            focused ? "opacity-100" : "opacity-0"
          }`}
        >
          <ol className="grid grid-cols-12 gap-x-6 px-(--gutter) pb-6 pt-5 md:h-full md:items-center md:py-0">
            {featuredProjects.map((project, index) => (
              <CasePanel
                key={project.slug}
                project={project}
                index={index}
                active={index === active}
                side={viewport ? workPanelSide(index, viewport) : index % 2 === 0 ? "left" : "right"}
              />
            ))}
          </ol>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setExpanded(true)}
            className={`label absolute bottom-5 right-(--gutter) cursor-pointer text-text md:hidden ${
              focused ? "pointer-events-auto" : ""
            }`}
          >
            {work.more} <span aria-hidden>{work.moreGlyph}</span>
          </button>
        </div>

        {/* Mobile: the full case study, scrollable inside the expanded sheet. */}
        {open ? (
          <div
            data-lenis-prevent
            className="absolute inset-x-0 bottom-0 z-10 max-h-[calc(100svh-var(--nav-h)-1rem)] overflow-y-auto overscroll-contain border-t border-hairline bg-surface px-(--gutter) pb-6 pt-5 md:hidden"
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
              onClick={() => setExpanded(false)}
              className="label mt-6 cursor-pointer text-text"
            >
              {work.less} <span aria-hidden>{work.lessGlyph}</span>
            </button>
          </div>
        ) : null}
      </div>
    </ScrollChapter>
  );
}
