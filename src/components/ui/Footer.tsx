"use client";

import { footer } from "@/content/content";
import { scrollToTop } from "@/lib/scroll";

/** Mono footer under a hairline rule. */
export function Footer() {
  return (
    <footer className="relative flex flex-col gap-3 border-t border-hairline px-(--gutter) py-6 md:flex-row md:items-center md:justify-between">
      <p className="label">{footer.copyright}</p>
      <p className="label">{footer.built}</p>
      <button
        type="button"
        onClick={scrollToTop}
        className="label cursor-pointer self-start text-text transition-colors duration-300 hover:text-glacier md:self-auto"
      >
        {footer.top} <span aria-hidden>{footer.topGlyph}</span>
      </button>
    </footer>
  );
}
