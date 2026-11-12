import {
  experienceChronological,
  featuredProjects,
  moreWork,
  skillEvidenceAliases,
} from "@/content/content";

/**
 * Where a skill was actually used, derived from content.ts: every project (featured, then
 * the rest) and every role whose `stack` lists it, matched by name ignoring case. Skills that
 * are not a literal stack entry (EDA, LLM integration, ...) get their evidence from
 * `skillEvidenceAliases`, which names sources or the stack entries that imply the skill.
 * A skill in neither has no evidence and shows nothing.
 */
interface Source {
  name: string;
  slug?: string;
  stack: string[];
  role: boolean;
}

const SOURCES: Source[] = [
  ...featuredProjects.map((project) => ({
    name: project.title,
    slug: project.slug,
    stack: project.stack,
    role: false,
  })),
  ...moreWork.map((item) => ({ name: item.title, stack: item.stack, role: false })),
  ...[...experienceChronological].reverse().map((entry) => ({
    name: entry.station,
    slug: entry.slug,
    stack: entry.stack,
    role: true,
  })),
];

const normalise = (value: string) => value.trim().toLowerCase();

export function skillEvidence(skill: string): string[] {
  const wanted = normalise(skill);
  const aliasKey = Object.keys(skillEvidenceAliases).find((key) => normalise(key) === wanted);
  const alias = aliasKey ? skillEvidenceAliases[aliasKey] : undefined;
  const implied = (alias?.stackAny ?? []).map(normalise);

  return SOURCES.filter((source) => {
    if (source.stack.some((entry) => normalise(entry) === wanted)) return true;
    if (!alias) return false;
    if (source.slug && alias.sources?.includes(source.slug)) return true;
    if (alias.projectsOnly && source.role) return false;
    return source.stack.some((entry) => implied.includes(normalise(entry)));
  }).map((source) => source.name);
}
