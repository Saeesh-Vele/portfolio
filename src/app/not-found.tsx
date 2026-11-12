import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { RequestedPath } from "@/components/ui/RequestedPath";
import { notFound as copy } from "@/content/content";

export const metadata: Metadata = {
  title: copy.title,
};

/** Stagger index for the reveal utilities in globals.css. */
const stagger = (index: number) => ({ "--i": index }) as CSSProperties;

/**
 * 404. There are no sections here, so the timeline has no formation holds and the particle
 * field stays in pure NOISE (formationAt's empty-timeline case) with the camera at rest.
 * The home link is a plain anchor: a full load gives the home page a fresh runtime.
 */
export default function NotFound() {
  return (
    <main
      id="main"
      className="relative grid min-h-svh grid-cols-12 content-center gap-x-6 overflow-hidden px-(--gutter) py-[calc(var(--nav-h)+3rem)]"
    >
      <div className="relative col-start-1 col-end-13 lg:col-end-11">
        <div aria-hidden className="scrim absolute -inset-x-16 -inset-y-12" />
        <div className="relative">
          <p className="label reveal-line">
            <span style={stagger(0)}>{copy.label}</span>
          </p>
          <h1 className="display mt-4 text-[clamp(2.5rem,6vw,5.5rem)]">
            <span className="reveal-line">
              <span style={stagger(1)}>{copy.heading}</span>
            </span>
          </h1>
          <p className="reveal-line mt-6 max-w-md text-[0.9375rem] leading-relaxed text-muted md:text-base">
            <span style={stagger(2)}>
              {copy.body.map((part) =>
                part.emphasis ? (
                  <em key={part.text} className="serif-em text-[1.08em] text-text">
                    {part.text}
                  </em>
                ) : (
                  part.text
                ),
              )}
            </span>
          </p>
          {/* A full load on purpose: the home page's runtime measures its sections once. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="label fade-in mt-9 inline-flex items-center gap-2 bg-text px-4 py-3 text-bg transition-colors duration-300 hover:bg-glacier"
            style={stagger(3)}
          >
            <span aria-hidden>{copy.homeGlyph}</span> {copy.home}
          </a>
        </div>
      </div>

      <RequestedPath
        className="label fade-in absolute bottom-5 left-(--gutter) md:bottom-6"
      />
    </main>
  );
}
