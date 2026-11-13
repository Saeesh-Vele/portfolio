"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { QueryLine } from "@/components/ui/QueryLine";
import { a11y, certifications, featuredProjects, queries, recognition } from "@/content/content";
import { MOBILE_BREAKPOINT } from "@/lib/constants";
import { useSeen } from "@/lib/hooks";
import { useLineReveal } from "@/lib/lineReveal";
import { scrollToSpan } from "@/lib/scroll";
import { frame, useSite } from "@/store/site";
import { recognitionSection } from "./recognition.config";
import { projectAt, workSection } from "./work.config";

/** 0..1 smooth ramp from `a` to `b` (either direction). */
const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * RECOGNITION. The hackathon placement, linked to the project that earned it, then the
 * certifications as a plain list. The podium stands to the right on desktop and in its own
 * band above the heading on mobile.
 */
export function Recognition() {
  const root = useRef<HTMLElement>(null);
  const band = useRef<HTMLDivElement>(null);
  const seen = useSeen(root, 0.25);
  useLineReveal(root, seen);
  const reducedMotion = useSite((state) => state.reducedMotion);

  // Phones: shift the 3D image so the podium (which the camera aims at dead centre) sits in
  // its band and scrolls with it, never behind the text. Off on desktop.
  useEffect(() => {
    const tick = () => {
      const section = root.current;
      const element = band.current;
      if (!section || !element || reducedMotion || window.innerWidth >= MOBILE_BREAKPOINT) {
        frame.viewShift.recognition = 0;
        return;
      }
      const height = window.innerHeight;
      const rect = section.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      // Eases in while the section approaches, out as the next one's morph begins.
      const approach = smoothstep(2 * height, 1.2 * height, rect.top);
      const leave = 1 - smoothstep(0.45, 0.8, -rect.top / rect.height);
      const follow = Math.max(-0.4 * height, height / 2 - (box.top + box.height / 2));
      frame.viewShift.recognition = follow * approach * leave;
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      frame.viewShift.recognition = 0;
    };
  }, [reducedMotion]);

  const projectIndex = featuredProjects.findIndex((p) => p.slug === recognition.projectSlug);
  const project = featuredProjects[projectIndex];

  const toCaseStudy = () => {
    const { viewport, reducedMotion } = useSite.getState();
    if (!viewport) return;
    scrollToSpan(workSection.id, reducedMotion ? 0 : projectAt(projectIndex, viewport));
  };

  return (
    <section
      ref={root}
      id={recognitionSection.id}
      data-section={recognitionSection.id}
      className="relative flex min-h-svh flex-col overflow-x-clip px-(--gutter) pb-16 pt-[calc(var(--nav-h)+2.25rem)] md:justify-center md:pb-20 md:pt-[calc(var(--nav-h)+3rem)]"
    >
      {/* Phones: the podium's own band, above the heading. The 3D image is locked to it. */}
      <div ref={band} aria-hidden className="h-[30svh] shrink-0 md:hidden" />
      <div className="grid grid-cols-12 gap-x-6">
        <div className="relative col-start-1 col-end-13 md:col-end-7">
          <div aria-hidden className="scrim absolute -inset-x-20 -inset-y-16" />
          <div className="relative">
            <h2 className="sr-only">{recognition.heading}</h2>
            <QueryLine text={queries.recognition} className="mb-4" />
            <p data-split className="display text-[clamp(2.25rem,5.6vw,4.75rem)]">
              {recognition.headline}
            </p>
            <p data-split className="label mt-3 text-text">
              {recognition.event}
            </p>
            {project ? (
              <>
                <p data-split className="mt-5 max-w-xl text-[0.9375rem] leading-[1.5] text-text">
                  {project.oneLiner}
                </p>
                <button
                  type="button"
                  onClick={toCaseStudy}
                  className="label mt-5 cursor-pointer border-b border-hairline pb-0.5 text-text transition-colors duration-300 hover:border-glacier"
                >
                  {recognition.caseLink} <span aria-hidden>{recognition.caseGlyph}</span>
                </button>
              </>
            ) : null}

            <p className="label mt-12">{recognition.certificationsLabel}</p>
            <ul className="mt-3 border-t border-hairline">
              {certifications.map((certification) => (
                <li
                  key={certification.name}
                  className="flex items-baseline justify-between gap-6 border-b border-hairline py-3 text-[0.9375rem] text-text"
                >
                  <span>
                    {certification.name}
                    {certification.name.includes(certification.issuer) ? null : (
                      <span className="text-muted"> ({certification.issuer})</span>
                    )}
                  </span>
                  {certification.credentialUrl ? (
                    <a
                      href={certification.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="label shrink-0 text-text transition-colors duration-300 hover:text-glacier"
                    >
                      {recognition.credentialLabel}{" "}
                      <span aria-hidden>{recognition.credentialGlyph}</span>
                      <span className="sr-only">
                        {" "}
                        — {certification.name} {a11y.newTab}
                      </span>
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
