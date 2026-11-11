"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { contact, nav, site } from "@/content/content";
import { lockScroll, scrollToSection } from "@/lib/scroll";
import { SECTIONS } from "@/lib/sections";

const MENU_ID = "site-menu";
/** Links to sections that aren't built yet are shown but inert. */
const available = (id: string) => SECTIONS.some((section) => section.id === id);
const stagger = (index: number) => ({ "--i": index }) as CSSProperties;

/**
 * Minimal fixed top bar. Transparent over the hero; a solid background (no blur) fades in
 * once the hero has scrolled past. Tracks the section under the reading line for the active
 * link state. Below md the links move into a full-screen menu.
 */
export function Nav() {
  const [solid, setSolid] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elements = SECTIONS.map((section) => ({
      id: section.id,
      element: document.querySelector<HTMLElement>(`[data-section="${section.id}"]`),
    }));
    const update = () => {
      const navHeight = 64;
      const hero = elements[0]?.element;
      setSolid(hero ? hero.getBoundingClientRect().bottom <= navHeight : window.scrollY > 0);

      // The active section is the one crossing a line 40% down the viewport.
      const line = window.innerHeight * 0.4;
      let current: string | null = null;
      for (const { id, element } of elements) {
        if (element && element.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Menu: lock scrolling, close on Escape or when the viewport grows past the breakpoint.
  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    menu.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const wide = window.matchMedia("(min-width: 768px)");
    const onWide = () => wide.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      lockScroll(false);
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  const go = (event: MouseEvent, id: string) => {
    event.preventDefault();
    setOpen(false);
    // Let the scroll lock release before travelling.
    requestAnimationFrame(() => scrollToSection(id));
  };

  const link = (id: string, label: string, className: string) =>
    available(id) ? (
      <a
        href={`#${id}`}
        aria-current={active === id ? "location" : undefined}
        onClick={(event) => go(event, id)}
        className={`${className} transition-colors duration-300 hover:text-text ${
          active === id ? "text-text" : ""
        }`}
      >
        <span
          aria-hidden
          className={`mr-2 inline-block size-1 translate-y-[-0.2em] bg-glacier transition-opacity duration-300 ${
            active === id ? "opacity-100" : "opacity-0"
          }`}
        />
        {label}
      </a>
    ) : (
      <span aria-disabled className={`${className} opacity-40`}>
        <span aria-hidden className="mr-2 inline-block size-1 opacity-0" />
        {label}
      </span>
    );

  return (
    <>
      <header
        className={`fade-in fixed inset-x-0 top-0 z-40 border-b transition-colors duration-700 ${
          solid || open ? "border-hairline bg-bg" : "border-transparent bg-transparent"
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

          <div className="flex items-center gap-4 md:gap-8">
            <ul className="hidden items-center gap-7 md:flex">
              {nav.links.map((item) => (
                <li key={item.id}>{link(item.id, item.label, "label")}</li>
              ))}
            </ul>
            <a
              href={contact.resumeHref}
              download
              className="label border border-hairline px-3 py-2 text-text transition-colors duration-300 hover:border-glacier"
            >
              {nav.resumeLabel}
            </a>
            <button
              ref={toggle}
              type="button"
              aria-expanded={open}
              aria-controls={MENU_ID}
              onClick={() => setOpen((value) => !value)}
              className="label -mr-2 cursor-pointer px-2 py-2 text-text md:hidden"
            >
              {open ? nav.menu.close : nav.menu.open}
            </button>
          </div>
        </nav>
      </header>

      {/* Full-screen menu (below md). Solid background, no blur. */}
      <div
        ref={menu}
        id={MENU_ID}
        role="dialog"
        aria-modal="true"
        aria-label={nav.menu.ariaLabel}
        data-open={open}
        inert={!open}
        className="menu fixed inset-0 z-30 flex flex-col justify-between bg-bg px-(--gutter) pb-8 pt-[calc(var(--nav-h)+2.5rem)] md:hidden"
      >
        <ul className="flex flex-col gap-5">
          {nav.links.map((item, index) => (
            <li key={item.id} className="menu-line">
              <span style={stagger(index)}>
                {link(
                  item.id,
                  item.label,
                  "font-mono text-[1.75rem] uppercase leading-tight tracking-[0.04em] text-muted",
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="menu-line border-t border-hairline pt-5">
          <p className="label" style={stagger(nav.links.length)}>
            {site.role} — {site.location}
          </p>
        </div>
      </div>
    </>
  );
}
