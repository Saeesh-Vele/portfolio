"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { capabilities } from "@/content/content";
import { useSeen } from "@/lib/hooks";
import { useLineReveal } from "@/lib/lineReveal";
import { skillEvidence } from "@/lib/skillEvidence";
import { frame } from "@/store/site";
import { skillsSection } from "./skills.config";

/** Longhand grid placement per breakpoint — see "Breakpoint layout rule" in CLAUDE.md. */
const COLUMN_PLACEMENT = [
  "col-start-1 col-end-13 md:col-start-1 md:col-end-4",
  "col-start-1 col-end-13 md:col-start-4 md:col-end-7",
  "col-start-1 col-end-13 md:col-start-7 md:col-end-10",
  "col-start-1 col-end-13 md:col-start-10 md:col-end-13",
];

/**
 * CAPABILITIES. Four columns, each tied to one particle cluster behind it. A skill that
 * appears in a project's or role's stack is interactive: hover / focus (desktop) or tap
 * (mobile) shows where it was used. No levels, no bars — evidence or nothing.
 */
export function Capabilities() {
  const root = useRef<HTMLElement>(null);
  const seen = useSeen(root, 0.2);
  useLineReveal(root, seen);

  /** [column, skill] currently showing its evidence. */
  const [shown, setShown] = useState<[number, string] | null>(null);
  const [column, setColumn] = useState(-1);

  const evidence = useMemo(
    () => capabilities.columns.map((group) => group.items.map((item) => skillEvidence(item))),
    [],
  );

  // The hovered (or last tapped) column's cluster brightens.
  useEffect(() => {
    const lit = column >= 0 ? column : (shown?.[0] ?? -1);
    frame.clusterHover.fill(0);
    if (lit >= 0 && lit < frame.clusterHover.length) frame.clusterHover[lit] = 1;
    return () => {
      frame.clusterHover.fill(0);
    };
  }, [column, shown]);

  return (
    <section
      ref={root}
      id={skillsSection.id}
      data-section={skillsSection.id}
      className="relative flex min-h-svh flex-col justify-end px-(--gutter) pb-16 pt-[calc(var(--nav-h)+3rem)] md:pb-20"
    >
      <p className="label">{capabilities.label}</p>
      <h2 data-split className="display mt-3 text-[clamp(2rem,5vw,4rem)]">
        {capabilities.heading}
      </h2>

      <div className="relative mt-10 md:mt-[min(22svh,12rem)]">
        <div aria-hidden className="scrim-rise absolute -inset-x-(--gutter) -bottom-20 -top-6" />
        <div className="relative grid grid-cols-12 gap-x-6 gap-y-10">
          {capabilities.columns.map((group, c) => {
            const active = shown && shown[0] === c ? shown[1] : null;
            const used = active ? evidence[c][group.items.indexOf(active)] : [];
            return (
              <div
                key={group.title}
                className={`border-t border-hairline pt-4 ${COLUMN_PLACEMENT[c] ?? COLUMN_PLACEMENT[0]}`}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setColumn(c);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType !== "mouse") return;
                  setColumn(-1);
                  setShown(null);
                }}
              >
                <h3 className="text-xl font-medium tracking-[-0.02em] text-text md:text-2xl">
                  {group.title}
                </h3>
                {group.line ? (
                  <p data-split className="mt-1 text-sm leading-[1.45] text-muted">
                    {group.line}
                  </p>
                ) : null}
                <ul className="label mt-4 flex flex-col gap-1.5 leading-[1.35] text-text">
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
                          className={`cursor-pointer border-b text-left uppercase tracking-[0.12em] transition-colors duration-300 ${
                            active === item
                              ? "border-glacier text-glacier"
                              : "border-hairline hover:border-muted"
                          }`}
                        >
                          {item}
                        </button>
                      </li>
                    ) : (
                      <li key={item}>{item}</li>
                    ),
                  )}
                </ul>
                {/* Evidence readout. Space is reserved so the column never jumps. */}
                <p aria-live="polite" className="label mt-4 min-h-[3.75rem] leading-[1.35]">
                  {active && used.length > 0 ? (
                    <>
                      <span className="text-glacier">
                        {capabilities.evidenceLabel} {capabilities.evidenceGlyph}
                      </span>{" "}
                      <span className="text-text">{used.join(", ")}</span>
                    </>
                  ) : null}
                </p>
              </div>
            );
          })}
        </div>
        <p className="label relative mt-4">{capabilities.also}</p>
      </div>
    </section>
  );
}
