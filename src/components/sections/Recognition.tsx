"use client";

import { useRef } from "react";
import { a11y, certifications, featuredProjects, recognition } from "@/content/content";
import { useSeen } from "@/lib/hooks";
import { useLineReveal } from "@/lib/lineReveal";
import { scrollToSpan } from "@/lib/scroll";
import { useSite } from "@/store/site";
import { recognitionSection } from "./recognition.config";
import { projectAt, workSection } from "./work.config";

/**
 * RECOGNITION. The hackathon placement, linked to the project that earned it, then the
 * certifications as a plain list. The podium stands to the right on desktop and above the
 * text on mobile.
 */
export function Recognition() {
  const root = useRef<HTMLElement>(null);
  const seen = useSeen(root, 0.25);
  useLineReveal(root, seen);

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
      className="relative flex min-h-svh flex-col justify-end overflow-x-clip px-(--gutter) pb-16 pt-[52svh] md:justify-center md:pb-20 md:pt-[calc(var(--nav-h)+3rem)]"
    >
      <div className="grid grid-cols-12 gap-x-6">
        <div className="relative col-start-1 col-end-13 md:col-end-7">
          <div aria-hidden className="scrim absolute -inset-x-20 -inset-y-16" />
          <div className="relative">
            <p className="label">{recognition.label}</p>
            <h2 className="sr-only">{recognition.heading}</h2>
            <p data-split className="display mt-4 text-[clamp(2.25rem,5.6vw,4.75rem)]">
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
