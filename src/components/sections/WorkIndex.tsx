"use client";

import { useState } from "react";
import {
  a11y,
  featuredProjects,
  moreWork,
  work,
  type ProjectStatus,
  type ProjectTag,
} from "@/content/content";

interface Row {
  title: string;
  oneLiner: string;
  tags: ProjectTag[];
  stack: string[];
  repoUrl?: string;
  liveUrl?: string;
  status?: ProjectStatus;
  label?: string;
}

/** Featured projects first, then the rest. The two lists are disjoint in content.ts. */
const ROWS: Row[] = [...featuredProjects, ...moreWork];

const pad = (value: number) => String(value).padStart(2, "0");

type Filter = ProjectTag | "all";

/**
 * ALL WORK — a plain, scannable index of every project, with tag filters. It is ordinary
 * DOM on a solid background: the work stays readable with no 3D at all.
 */
export function WorkIndex() {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = ROWS.filter((row) => filter === "all" || row.tags.includes(filter));

  return (
    <section
      id="all-work"
      aria-labelledby="all-work-heading"
      className="relative border-t border-hairline bg-bg px-(--gutter) pb-24 pt-14 md:pb-32 md:pt-20"
    >
      <div className="grid grid-cols-12 items-end gap-x-6 gap-y-6">
        <div className="col-start-1 col-end-13 md:col-end-7">
          <p className="label">{work.index.label}</p>
          <h2
            id="all-work-heading"
            className="display mt-3 text-[clamp(2rem,5vw,4rem)]"
          >
            {work.index.heading}
          </h2>
        </div>
        <div
          role="group"
          aria-label={work.index.filterLabel}
          className="col-start-1 col-end-13 flex gap-1 md:col-start-7 md:justify-end"
        >
          {work.index.filters.map((item) => {
            const on = filter === item.tag;
            return (
              <button
                key={item.tag}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(item.tag)}
                className={`label cursor-pointer border px-3 py-2 transition-colors duration-300 ${
                  on
                    ? "border-glacier text-text"
                    : "border-hairline hover:border-muted hover:text-text"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <ol className="mt-8 border-t border-hairline md:mt-12">
        {shown.map((row) => (
          <li key={row.title} className="work-row group relative border-b border-hairline">
            <div className="grid grid-cols-12 gap-x-6 gap-y-1 py-4 md:items-baseline md:py-5">
              <p className="label col-start-1 col-end-3 row-start-1 md:col-end-2">
                {pad(ROWS.indexOf(row) + 1)}
              </p>
              <h3 className="col-start-3 col-end-13 row-start-1 text-[1.0625rem] font-medium tracking-[-0.02em] text-text md:col-start-2 md:col-end-5 md:text-xl">
                {row.title}
                {row.label || row.status === "in progress" ? (
                  <span className="label mt-1 block font-normal">
                    {[row.label, row.status === "in progress" ? work.status[row.status] : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                ) : null}
              </h3>
              <div className="col-start-3 col-end-13 md:col-start-5 md:col-end-10">
                <p className="text-[0.8125rem] leading-[1.5] text-muted transition-colors duration-300 group-hover:text-text md:text-sm">
                  {row.oneLiner}
                </p>
                <p className="work-row-more label">
                  <span className="block pt-2">{row.stack.join(", ")}</span>
                </p>
              </div>
              <p className="label col-start-3 col-end-13 mt-1 md:col-start-10 md:col-end-11 md:mt-0">
                {row.tags.join(" / ")}
              </p>
              <p className="label col-start-3 col-end-13 mt-1 flex gap-4 md:col-start-11 md:mt-0 md:justify-end">
                {row.repoUrl ? (
                  <a
                    href={row.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text transition-colors duration-300 hover:text-glacier"
                  >
                    {work.repoLabel} <span aria-hidden>{work.linkGlyph}</span>
                    <span className="sr-only">
                      {" "}
                      — {row.title} {a11y.newTab}
                    </span>
                  </a>
                ) : null}
                {row.liveUrl ? (
                  <a
                    href={row.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text transition-colors duration-300 hover:text-glacier"
                  >
                    {work.liveLabel} <span aria-hidden>{work.linkGlyph}</span>
                    <span className="sr-only">
                      {" "}
                      — {row.title} {a11y.newTab}
                    </span>
                  </a>
                ) : null}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {shown.length === 0 ? <p className="label mt-6">{work.index.empty}</p> : null}
    </section>
  );
}
