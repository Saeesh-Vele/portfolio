import { placeholderSection } from "@/content/content";
import { numbersSection } from "./numbers.config";

/** Phase 1 stand-in for the NUMBERS section, so the hero exit has somewhere to land. */
export function NumbersPlaceholder() {
  return (
    <section
      id={numbersSection.id}
      data-section={numbersSection.id}
      className="relative flex h-svh items-center justify-center"
    >
      <div className="scrim px-16 py-12">
        <p className="label text-text">{placeholderSection.label}</p>
      </div>
    </section>
  );
}
