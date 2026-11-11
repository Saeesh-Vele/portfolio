"use client";

import { useEffect, useState } from "react";
import { contact, nav, site } from "@/content/content";
import { SECTIONS } from "@/lib/sections";

/**
 * Minimal fixed top bar. Transparent over the hero; a solid background (no blur) fades in
 * once the hero has scrolled past.
 */
export function Nav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(`[data-section="${SECTIONS[0].id}"]`);
    const update = () => {
      const navHeight = 64;
      setSolid(hero ? hero.getBoundingClientRect().bottom <= navHeight : window.scrollY > 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <header
      className={`fade-in fixed inset-x-0 top-0 z-40 border-b transition-colors duration-700 ${
        solid ? "border-hairline bg-bg" : "border-transparent bg-transparent"
      }`}
    >
      <nav
        aria-label={nav.ariaLabel}
        className="flex h-(--nav-h) items-center justify-between px-(--gutter)"
      >
        <a
          href="#main"
          aria-label={nav.homeLabel}
          className="font-mono text-sm font-medium tracking-[0.08em] text-text"
        >
          {site.monogram}
        </a>

        <div className="flex items-center gap-8">
          <ul className="hidden items-center gap-8 md:flex">
            {nav.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="label transition-colors duration-300 hover:text-text"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href={contact.resumeHref}
            download
            className="label border border-hairline px-3 py-2 text-text transition-colors duration-300 hover:border-glacier"
          >
            {nav.resumeLabel}
          </a>
        </div>
      </nav>
    </header>
  );
}
