"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "@/components/ui/Clock";
import { a11y, contact, contactSection as copy, hero } from "@/content/content";
import { useSeen } from "@/lib/hooks";
import { useLineReveal } from "@/lib/lineReveal";
import { contactSection } from "./contact.config";

const LINK =
  "border-b border-hairline pb-1 text-[clamp(1.5rem,3.4vw,2.75rem)] font-medium leading-tight tracking-[-0.03em] text-text transition-colors duration-300 hover:border-glacier";

/**
 * CONTACT. Headline, then the ways to reach Saeesh as large text links. WhatsApp is a link
 * only — the phone number is never rendered as text.
 */
export function Contact() {
  const root = useRef<HTMLElement>(null);
  const seen = useSeen(root, 0.25);
  useLineReveal(root, seen);

  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contact.email);
      setCopied(true);
    } catch {
      // Clipboard unavailable (insecure context / denied): the mailto link still works.
    }
  };

  const external = { target: "_blank", rel: "noopener noreferrer" } as const;

  return (
    <section
      ref={root}
      id={contactSection.id}
      data-section={contactSection.id}
      className="relative flex min-h-svh flex-col justify-center px-(--gutter) pb-16 pt-[calc(var(--nav-h)+3rem)]"
    >
      {/* The section label is the global SectionHud (top left); the local clock stays. */}
      <div className="flex items-baseline justify-end gap-6">
        <p className="label">
          <Clock
            timeZone={hero.hud.clockTimeZone}
            zoneLabel={hero.hud.clockZone}
            ariaLabel={hero.hud.clockLabel}
            placeholder="--:--"
            seconds={false}
            prefix={copy.clockPrefix}
          />
        </p>
      </div>

      <h2
        data-split
        aria-label={copy.headlineText}
        className="display mt-5 max-w-[16ch] text-[clamp(2.5rem,8vw,7rem)]"
      >
        {copy.headline.map((part) =>
          part.emphasis ? (
            <em key={part.text} className="serif-em text-[1.06em]">
              {part.text}
            </em>
          ) : (
            part.text
          ),
        )}
      </h2>
      <p data-split className="mt-5 text-base text-muted md:text-lg">
        {copy.sub}
      </p>

      <ul className="mt-10 flex flex-col items-start gap-5 md:mt-14 md:flex-row md:flex-wrap md:items-baseline md:gap-x-12 md:gap-y-6">
        <li className="flex items-baseline gap-4">
          <a href={contact.emailHref} className={LINK}>
            {copy.actions.email}
          </a>
          <button
            type="button"
            onClick={copyEmail}
            aria-label={copy.copyAria}
            className={`label cursor-pointer border px-2.5 py-1.5 transition-colors duration-300 ${
              copied ? "border-glacier text-glacier" : "border-hairline text-text hover:border-muted"
            }`}
          >
            <span aria-live="polite">{copied ? copy.copied : copy.copy}</span>
          </button>
        </li>
        <li>
          <a href={contact.whatsappHref} {...external} className={LINK}>
            {copy.actions.whatsapp}
            <span className="sr-only"> {a11y.newTab}</span>
          </a>
        </li>
        <li>
          <a href={contact.linkedinHref} {...external} className={LINK}>
            {copy.actions.linkedin} <span aria-hidden>{copy.externalGlyph}</span>
            <span className="sr-only"> {a11y.newTab}</span>
          </a>
        </li>
        <li>
          <a href={contact.githubHref} {...external} className={LINK}>
            {copy.actions.github} <span aria-hidden>{copy.externalGlyph}</span>
            <span className="sr-only"> {a11y.newTab}</span>
          </a>
        </li>
        <li>
          <a href={contact.resumeHref} download className={LINK}>
            {copy.actions.resume} <span aria-hidden>{copy.downloadGlyph}</span>
          </a>
        </li>
      </ul>
    </section>
  );
}
