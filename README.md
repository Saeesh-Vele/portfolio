# Saeesh Vele — Portfolio

Personal portfolio of Saeesh Vele, Data & AI Engineer. It is a single page that you scroll as
one continuous 3D journey: About, Experience, Work, an all-work index, Capabilities,
Recognition and Contact.

## Signal from Noise

One WebGL particle field, styled like a LiDAR point cloud, starts as raw noise and settles into
a different structure in each section. Raw data → structure → products.

## Stack

- Next.js (App Router) + TypeScript (strict) + Tailwind CSS v4
- three.js + @react-three/fiber + @react-three/drei, with a custom GLSL `ShaderMaterial` for
  the particles and @react-three/postprocessing for a subtle desktop-only bloom
- GSAP + ScrollTrigger, with Lenis smooth scrolling synced to ScrollTrigger
- zustand for state
- Geist, Geist Mono and Instrument Serif fonts via `next/font`
- Vercel Analytics + Speed Insights (loaded only on Vercel deployments)

## How the 3D works

- A single fixed `<Canvas>` sits behind the whole site. Every section registers a
  **formation**: a function `(count, viewport) → Float32Array` of target positions, one per
  particle (`src/components/canvas/formations/`).
- The particle shader morphs between two formations (`aFrom` → `aTo`) on a `uProgress`
  uniform, adding curl-noise drift and pointer repulsion. Scroll velocity feeds `uEnergy`
  for turbulence that settles when you stop scrolling.
- A **camera rig** follows a CatmullRom spline built from per-section keyframes (position,
  look-at target, FOV). Global scroll progress maps to a point on that path, smoothed with
  damping.
- Some sections are **pinned chapters** (`<ScrollChapter>`): the DOM stays in place while
  scrolling drives the camera and the morphs. Spans are measured from the DOM, so a section's
  height can change without touching any other config.
- Adding a section means writing a formation, a `SectionDef` config
  (`src/components/sections/<name>.config.ts`), and appending it to `SECTIONS` in
  `src/lib/sections.ts`.

`CLAUDE.md` has the full architecture notes.

## Run it locally

Requires Node.js 20+ and npm.

```sh
npm install
npm run dev          # http://localhost:3000
```

Production build:

```sh
npm run build
npm run start
npm run lint
```

Set `NEXT_PUBLIC_SITE_URL` (see `.env.example`) to the deployed origin, with no trailing
slash. The canonical URL, Open Graph image URLs, sitemap, robots.txt and JSON-LD all use it.
Without it they fall back to `http://localhost:3000`.

Add `?debug=1` to the URL for a performance overlay (frame time, particle tier, adaptive
quality, bloom, active formation).

## Content

All copy, links and numbers live in **`src/content/content.ts`**. It is typed, and components
never hardcode copy. The 3D work graph, skill evidence and camera stops are derived from it.

## Fonts

Geist and Geist Mono are subset to the characters the site uses (Latin, punctuation, arrows)
so they stay small. **After adding copy with new characters** (e.g. accented letters or new
symbols), re-run the subset script, or those characters fall back to a system font:

```sh
pip install fonttools brotli   # once
sh scripts/subset-fonts.sh
```
