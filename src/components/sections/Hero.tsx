"use client";

import { useCallback, useRef, type CSSProperties } from "react";
import { Clock } from "@/components/ui/Clock";
import { ScrollChapter } from "@/components/ui/ScrollChapter";
import { a11y, hero } from "@/content/content";
import { scrollToSection } from "@/lib/scroll";
import { HERO_CHAPTER_LENGTH, heroSection } from "./hero.config";

/** Stagger index for the reveal utilities in globals.css. */
const stagger = (index: number) => ({ "--i": index }) as CSSProperties;

/**
 * HERO. The particle name occupies the upper-middle of the screen (see nameLayout.ts); all
 * DOM copy is anchored to the bottom edge so the two never overlap. The copy fades out early
 * in the pinned chapter, leaving the camera push through the name unobstructed.
 */
export function Hero() {
  const content = useRef<HTMLDivElement>(null);

  const onProgress = useCallback((progress: number) => {
    const element = content.current;
    if (!element) return;
    const opacity = Math.min(1, Math.max(0, 1 - progress * 5));
    element.style.opacity = String(opacity);
    element.style.visibility = opacity === 0 ? "hidden" : "visible";
  }, []);

  return (
    <ScrollChapter id={heroSection.id} length={HERO_CHAPTER_LENGTH} onProgress={onProgress}>
      <div ref={content} className="relative h-full">
        <h1 className="sr-only">{a11y.heroHeading}</h1>

        {/* HUD — top corners */}
        <p
          className="label fade-in absolute left-(--gutter) top-[calc(var(--nav-h)+0.75rem)]"
          style={stagger(6)}
        >
          {hero.hud.topLeft}
        </p>
        <p
          className="label fade-in absolute right-(--gutter) top-[calc(var(--nav-h)+0.75rem)]"
          style={stagger(6)}
        >
          <Clock
            timeZone={hero.hud.clockTimeZone}
            zoneLabel={hero.hud.clockZone}
            ariaLabel={hero.hud.clockLabel}
            placeholder={hero.hud.clockPlaceholder}
          />
        </p>

        {/* Copy — anchored to the bottom, clear of the particle name */}
        <div className="absolute inset-x-(--gutter) bottom-24 grid grid-cols-12 items-end gap-x-6 md:bottom-28">
          <div className="col-span-12 lg:col-span-7">
            <p className="label reveal-line">
              <span style={stagger(0)}>{hero.eyebrow}</span>
            </p>
            <p className="display mt-4 text-[clamp(1.75rem,min(4.4vw,7vh),4.25rem)]">
              {hero.taglineLines.map((line, index) => (
                <span key={index} className="reveal-line">
                  <span style={stagger(index + 1)}>
                    {line.map((part) =>
                      part.emphasis ? (
                        <em key={part.text} className="serif-em text-[1.08em]">
                          {part.text}
                        </em>
                      ) : (
                        part.text
                      ),
                    )}
                  </span>
                </span>
              ))}
            </p>
          </div>

          <div className="col-span-12 mt-5 lg:col-span-4 lg:col-start-9 lg:mt-0">
            <p className="text-sm leading-relaxed text-muted md:text-[0.9375rem]">
              {hero.supportingLines.map((line, index) => (
                <span key={line} className="reveal-line">
                  <span style={stagger(index + 3)}>{line}</span>
                </span>
              ))}
            </p>
            <div className="fade-in mt-6 flex items-center gap-3" style={stagger(5)}>
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
          </div>
        </div>

        {/* HUD — bottom corners + scroll cue */}
        <div
          className="fade-in absolute inset-x-(--gutter) bottom-5 flex items-end justify-between gap-4 md:bottom-6"
          style={stagger(7)}
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
