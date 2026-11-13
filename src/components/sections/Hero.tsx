"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { Clock } from "@/components/ui/Clock";
import { ScrollChapter } from "@/components/ui/ScrollChapter";
import { TypedRoles } from "@/components/ui/TypedRoles";
import { a11y, hero, queries, site } from "@/content/content";
import { HERO_SIDE_BY_SIDE, MOBILE_BREAKPOINT } from "@/lib/constants";
import { scrollToSection } from "@/lib/scroll";
import { frame } from "@/store/site";
import { HERO_CHAPTER_LENGTH, heroCopyOpacity, heroSection } from "./hero.config";

/** Stagger index for the reveal utilities in globals.css. */
const stagger = (index: number) => ({ "--i": index }) as CSSProperties;
const pad = (value: number) => String(value).padStart(2, "0");
/**
 * Placement of the DATA SURFACE beyond phones.
 * Side by side (HERO_SIDE_BY_SIDE): in the band from `nameGap` px right of the name to the
 * content edge, centred in it, level with the name, `height` × the name block (role line +
 * name) tall, and `clear` px clear of the HUD row above and the tagline below.
 * Stacked (tablets, narrow laptop windows): under the copy, up to `stackedWidth` of the
 * viewport wide, centred, and `clear` px clear of the bottom HUD.
 */
const SURFACE = { nameGap: 120, height: 0.85, clear: 14, stackedWidth: 0.7 } as const;

/**
 * HERO. Wide screens: the copy in columns 1–6 — the query line and its typed result, the
 * name in real type, tagline, CTAs, socials — and the DATA SURFACE to its right, level with
 * the name (see SURFACE). Below `desk` (1100px, or 768px in landscape) the hero stacks: the
 * surface sits under the copy — on phones filling its slot, on portrait tablets and narrow
 * windows centred at up to 70% of the width. The surface is 3D (DataSurface.tsx):
 * this section only measures the box it should fill, every frame, and hands it to the scene
 * (`frame.heroSlot`). On scroll the copy fades while the surface sinks and bursts into
 * particles.
 */
export function Hero() {
  const content = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLHeadingElement>(null);
  const role = useRef<HTMLParagraphElement>(null);
  const tagline = useRef<HTMLParagraphElement>(null);
  const hud = useRef<HTMLParagraphElement>(null);
  const footer = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLParagraphElement>(null);

  const onProgress = useCallback((progress: number) => {
    const element = content.current;
    if (!element) return;
    const opacity = heroCopyOpacity(progress);
    element.style.opacity = String(opacity);
    element.style.visibility = opacity === 0 ? "hidden" : "visible";
  }, []);

  // The slot → the scene, and the hover readout ← the scene, once per frame.
  useEffect(() => {
    let shownCell = -1;
    const range = document.createRange();
    const sideBySide = window.matchMedia(HERO_SIDE_BY_SIDE);
    const update = () => {
      const element = slot.current;
      if (element) {
        const rect = element.getBoundingClientRect();
        frame.heroSlot[0] = rect.left + rect.width / 2;
        frame.heroSlot[1] = rect.top + rect.height / 2;
        frame.heroSlot[2] = rect.width;
        frame.heroSlot[3] = rect.height;
        const viewW = window.innerWidth;
        // Stacked, beyond phones: centred under the copy, clear of the bottom HUD.
        if (viewW >= MOBILE_BREAKPOINT && !sideBySide.matches) {
          // The bottom HUD's top: its scroll cue is absolutely placed, so take every part.
          let floor = window.innerHeight;
          footer.current?.querySelectorAll("*").forEach((part) => {
            const box = part.getBoundingClientRect();
            // Skip boxless parts (the `display: contents` wrapper).
            if (box.height > 0) floor = Math.min(floor, box.top);
          });
          floor -= SURFACE.clear;
          const bottom = Math.min(rect.bottom, floor);
          frame.heroSlot[1] = (rect.top + bottom) / 2;
          frame.heroSlot[2] = Math.min(viewW * SURFACE.stackedWidth, rect.width);
          frame.heroSlot[3] = Math.max(0, bottom - rect.top);
        }
        // Side by side: the box is built from the copy around it (the slot only gives the
        // content edge). The scene fits the surface inside it, centred.
        const container = element.parentElement;
        if (sideBySide.matches && name.current && container) {
          // The name's text extent, line by line (the line blocks themselves are full width).
          let nameRight = -Infinity;
          let top = Infinity;
          let bottom = -Infinity;
          for (const line of name.current.querySelectorAll<HTMLElement>(".reveal-line > span")) {
            range.selectNodeContents(line);
            const box = range.getBoundingClientRect();
            nameRight = Math.max(nameRight, box.right);
            top = Math.min(top, box.top);
            bottom = Math.max(bottom, box.bottom);
          }
          const right = container.getBoundingClientRect().right;
          const left = nameRight + SURFACE.nameGap;
          const middle = (top + bottom) / 2;
          // The name block: the typed role line down to the name's last line.
          const block = bottom - (role.current?.getBoundingClientRect().top ?? top);
          const above = middle - ((hud.current?.getBoundingClientRect().bottom ?? 0) + SURFACE.clear);
          const below = (tagline.current?.getBoundingClientRect().top ?? window.innerHeight) - SURFACE.clear - middle;
          frame.heroSlot[0] = (left + right) / 2;
          frame.heroSlot[1] = middle;
          frame.heroSlot[2] = Math.max(0, right - left);
          frame.heroSlot[3] = Math.max(0, Math.min(block * SURFACE.height, 2 * Math.min(above, below)));
        }
      }
      const readout = tip.current;
      if (!readout) return;
      const hover = frame.surfaceHover;
      readout.style.opacity = hover.opacity.toFixed(3);
      if (hover.opacity < 0.01) return;
      readout.style.transform = `translate3d(${hover.x.toFixed(1)}px, ${hover.y.toFixed(1)}px, 0) translate(-50%, calc(-100% - 14px))`;
      const cell = hover.row * 1000 + hover.col;
      if (cell === shownCell) return;
      shownCell = cell;
      const { timePrefix, timeSuffix, now, hours, rowPrefix, separator } = hero.surface;
      const ago = Math.round(hours[0] * (1 - hover.col / Math.max(hover.cols - 1, 1)));
      const time = ago === 0 ? now : `${timePrefix}${pad(ago)}${timeSuffix}`;
      readout.textContent = [time, `${rowPrefix}${pad(hover.row)}`, hover.value.toFixed(2)].join(separator);
    };
    gsap.ticker.add(update);
    return () => {
      gsap.ticker.remove(update);
      frame.heroSlot.fill(0);
    };
  }, []);

  return (
    <ScrollChapter id={heroSection.id} length={HERO_CHAPTER_LENGTH} onProgress={onProgress}>
      <div ref={content} className="relative h-full">
        {/* HUD — top right. The top-left readout is the global SectionHud. */}
        <p
          ref={hud}
          className="label fade-in absolute right-(--gutter) top-[calc(var(--nav-h)+0.75rem)]"
          style={stagger(8)}
        >
          <Clock
            timeZone={hero.hud.clockTimeZone}
            zoneLabel={hero.hud.clockZone}
            ariaLabel={hero.hud.clockLabel}
            placeholder={hero.hud.clockPlaceholder}
          />
        </p>

        {/* Copy (cols 1–6) and the surface's slot (cols 8–10) from `desk` up; stacked below
            it. Both share the row on purpose there, so both state their columns at every
            breakpoint. */}
        <div className="absolute inset-x-(--gutter) bottom-[4.75rem] top-[calc(var(--nav-h)+3.25rem)] grid grid-cols-12 grid-rows-[auto_minmax(0,1fr)] gap-x-6 md:bottom-20 desk:top-[calc(var(--nav-h)+2.5rem)] desk:grid-rows-1">
          <div className="relative col-start-1 col-end-13 row-start-1 self-center desk:col-start-1 desk:col-end-7">
            {/* A soft pool of background behind the copy: telemetry and dust recede. */}
            {/* Stops at the copy's right edge, short of the surface. */}
            <div aria-hidden className="scrim absolute -inset-y-20 -left-24 right-0 hidden desk:block" />
            <div className="relative">
              <p aria-hidden className="label reveal-line text-xs normal-case">
                <span style={stagger(0)}>
                  {queries.prompt} {hero.query}
                </span>
              </p>
              {/* The query's result: larger, in the text colour, typed behind the caret. */}
              <p ref={role} className="reveal-line mt-1.5 font-mono text-[0.9375rem] leading-6 tracking-[0.02em] text-text md:mt-2 md:text-base">
                <span style={stagger(1)}>
                  <TypedRoles roles={hero.roles} />
                  <span className="sr-only">
                    {hero.rolesLabel} {hero.roles.join(", ")}.
                  </span>
                </span>
              </p>

              <h1 ref={name} className="mt-3 font-extrabold leading-[0.86] tracking-[-0.045em] text-[clamp(3.25rem,18.5vw,5.5rem)] md:mt-6 md:text-[clamp(3.75rem,min(9.4vw,15vh),9.75rem)]">
                <span className="reveal-line">
                  <span style={stagger(2)}>{hero.name.first}</span>
                </span>
                <span className="reveal-line">
                  <span style={stagger(3)} className="serif-em text-[1.1em] leading-[0.82] text-glacier">
                    {hero.name.last}
                  </span>
                </span>
                <span className="sr-only"> — {site.role}</span>
              </h1>

              <p ref={tagline} className="reveal-line mt-4 text-[1.0625rem] font-medium leading-snug tracking-[-0.02em] text-text md:mt-7 md:text-[clamp(1.125rem,1.55vw,1.5rem)]">
                <span style={stagger(4)}>{hero.tagline}</span>
              </p>
              <p className="reveal-line mt-2 max-w-[46ch] text-[0.8125rem] leading-relaxed text-muted md:text-[0.9375rem]">
                <span style={stagger(5)}>{hero.supporting}</span>
              </p>

              <div className="fade-in mt-5 flex items-center gap-3 md:mt-7" style={stagger(6)}>
                <button
                  type="button"
                  onClick={() => scrollToSection(hero.cta.work.target)}
                  className="label cursor-pointer bg-text px-4 py-3 text-bg transition-colors duration-300 hover:bg-glacier"
                >
                  {hero.cta.work.label}
                </button>
                <a
                  href={hero.cta.resume.href}
                  download
                  className="label border border-hairline px-4 py-3 text-text transition-colors duration-300 hover:border-glacier"
                >
                  {hero.cta.resume.label} <span aria-hidden>{hero.cta.resume.glyph}</span>
                </a>
              </div>

              <nav aria-label={hero.socialsLabel} className="fade-in mt-4 md:mt-6" style={stagger(7)}>
                <ul className="label flex flex-wrap items-center gap-x-2.5">
                  {hero.socials.map((link, index) => (
                    <li key={link.label} className="flex items-center gap-x-2.5">
                      {index > 0 ? <span aria-hidden>·</span> : null}
                      <a
                        href={link.href}
                        {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="inline-flex min-h-6 items-center border-b border-transparent text-text transition-colors duration-300 hover:border-glacier"
                      >
                        {link.label}
                        {link.external ? <span className="sr-only"> {a11y.newTab}</span> : null}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>

          {/* Stacked (below `desk`): the DATA SURFACE stands here (rendered by the scene).
              Side by side places it from the copy instead (see the frame loop above). */}
          <div
            ref={slot}
            aria-hidden
            className="col-start-1 col-end-13 row-start-2 mt-3 min-h-0 desk:col-start-8 desk:col-end-11 desk:row-start-1 desk:mt-0"
          />
        </div>

        {/* Hover readout over the surface (desktop pointers), placed every frame. */}
        <p
          ref={tip}
          aria-hidden
          className="label pointer-events-none absolute left-0 top-0 hidden whitespace-pre bg-bg px-1.5 py-0.5 normal-case text-text opacity-0 md:block"
        />

        {/* HUD — bottom corners + scroll cue */}
        <div
          ref={footer}
          className="fade-in absolute inset-x-(--gutter) bottom-5 flex items-end justify-between gap-4 md:bottom-6"
          style={stagger(9)}
        >
          <div className="flex flex-col gap-1.5 md:contents">
            <p className="label">{hero.hud.bottomLeft}</p>
            <p className="label flex items-center gap-2 md:order-3">
              <span aria-hidden className="pulse-dot inline-block size-1.5 rounded-full bg-glacier" />
              {hero.hud.status}
            </p>
          </div>
          <div
            aria-hidden
            className="label flex flex-col items-center gap-2 md:absolute md:bottom-0 md:left-1/2 md:order-2 md:-translate-x-1/2"
          >
            <span>{hero.scrollCue}</span>
            <span className="hairline block h-6 w-px" />
          </div>
        </div>
      </div>
    </ScrollChapter>
  );
}
