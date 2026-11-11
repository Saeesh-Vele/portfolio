import { experienceChronological, featuredProjects, moreWork } from "@/content/content";

/**
 * Where a skill was actually used, derived from content.ts: every project (featured, then
 * the rest) and every role whose `stack` lists it. Matching is by name, ignoring case —
 * nothing is hand-mapped, so a skill with no matching stack entry simply has no evidence.
 */
const SOURCES: { name: string; stack: string[] }[] = [
  ...featuredProjects.map((project) => ({ name: project.title, stack: project.stack })),
  ...moreWork.map((item) => ({ name: item.title, stack: item.stack })),
  ...[...experienceChronological].reverse().map((role) => ({ name: role.station, stack: role.stack })),
];

const normalise = (value: string) => value.trim().toLowerCase();

export function skillEvidence(skill: string): string[] {
  const wanted = normalise(skill);
  return SOURCES.filter((source) => source.stack.some((entry) => normalise(entry) === wanted)).map(
    (source) => source.name,
  );
}
