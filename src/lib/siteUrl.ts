/**
 * The canonical origin, from NEXT_PUBLIC_SITE_URL (no trailing slash). Falls back to the
 * local dev server so builds work before a domain is set. Used by metadata, JSON-LD,
 * the sitemap and robots.txt.
 */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);
