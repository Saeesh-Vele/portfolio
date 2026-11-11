# Saeesh Vele — Portfolio ("Signal from Noise")

Personal portfolio for Saeesh Vele (Data & AI Engineer). The site is one continuous 3D scroll
journey: a single persistent WebGL particle field behaves like a LiDAR point cloud. It starts as
raw noise and reorganises into a different formation per section as a camera travels through 3D
space. Metaphor: raw data → structure → products.

Built in ~5 phases. Build only what the current phase asks for, but keep the architecture below
intact so later phases slot in.

Next.js in this repo is newer than most training data — see `AGENTS.md` and read
`node_modules/next/dist/docs/` before using an unfamiliar Next API.

## Stack

Next.js (App Router) + TypeScript strict + Tailwind CSS v4 · three + @react-three/fiber +
@react-three/drei · custom GLSL ShaderMaterial for particles · GSAP + ScrollTrigger · Lenis
(synced to ScrollTrigger) · zustand · @react-three/postprocessing (subtle desktop bloom only,
auto-disabled if it costs frame time) · fonts via next/font: Geist + Geist Mono (`geist`
package) and Instrument Serif italic · npm.

No script or config may depend on the folder path. Package name: `saeesh-portfolio`.

## Design system

- Colours: background `#07090C`, surface `#0D1117`, hairline borders `rgba(255,255,255,0.08)`,
  text `#E7E5E0` (warm off-white), muted `#8A8F98`, ONE accent "glacier" `#8CCFDD` used
  sparingly (<5% of any screen: particle highlights, active states, key numbers). No second
  accent colour.
- Type: huge, tight display headings (Geist, tracking -0.04em); mono uppercase micro-labels
  (Geist Mono, 11–12px, tracking 0.12em) used like instrument readouts, e.g. "01 / EXPERIENCE",
  "N=50,000"; Instrument Serif italic only for 1–2 emphasis words per section.
- Layout: 12-column grid, generous negative space, hairline rules, corner HUD readouts. It
  should feel like a precision instrument, not a game.
- Motion: easing `cubic-bezier(0.16,1,0.3,1)` / `expo.out`; text reveals line-by-line with
  masks; nothing bounces; nothing loops distractingly except the particle field's slow drift.

Tokens live in `src/app/globals.css` (`@theme`). Utility classes: `.label` (mono readout),
`.display` (display heading), `.reveal` / `.reveal-line` (masked line reveal), `.hairline`.

## BANNED (these make sites look AI-generated)

Purple/blue gradients · glassmorphism/frosted cards · neon glows · rounded card grids with drop
shadows · skill percentage bars · emoji · icon-in-a-circle feature grids · "Hi, I'm 👋" · the
words "passionate", "enthusiast", "cutting-edge", "seamless", "innovative" · Inter font ·
decorative stock icons (small functional icons are fine) · lorem ipsum.

## Content rules

- All copy, links and numbers live in `src/content/content.ts` (typed). Components never
  hardcode copy.
- Never invent metrics, links, dates or outcomes. If something is unknown, put a TODO and list
  it for Saeesh.
- The phone number must NOT appear as visible text anywhere on the site (WhatsApp is a link
  only). No photo of Saeesh anywhere.
- PredictX is never framed as accuracy; MAE figures appear only in its case-study `detail`.

## 3D architecture

1. One fixed `<Canvas>` mounted in the root layout, shared by the whole site.
2. Formations registry: each formation is a function `(count, viewport) → Float32Array` of
   target positions, same length as the particle count. The particle shader morphs between two
   target attributes (`aFrom` / `aTo`) via a `uProgress` uniform, plus curl-noise displacement
   and pointer repulsion. Adding a section = write a formation + register it.
3. Scroll-driven camera rig: the camera follows a CatmullRom spline path through 3D space for
   the whole page, with a separate look-at target spline. Global scroll progress → position on
   the path, smoothed with damping (no jitter, no snapping). Each section registers its own
   camera keyframe (position, target, FOV) so later phases just add keyframes.
4. Pinned 3D chapters: GSAP ScrollTrigger pinned sections where scrolling drives the 3D scene
   (camera travel, formation morphs) while the DOM stays in place. One reusable
   `<ScrollChapter>` wrapper does this.
5. Scroll velocity → particle energy: smoothed scroll velocity feeds a shader uniform
   (`uEnergy`) that adds turbulence and slight point stretching along the motion direction; it
   calms back to rest when scrolling stops.
6. Readability rule: 3D intensity peaks BETWEEN sections and calms down while text is being
   read. Text panels always stay legible (contrast ≥ 4.5:1); particles behind text can dim
   locally.

### Where things are

| Concern | File |
| --- | --- |
| Copy, links, numbers | `src/content/content.ts` |
| Section order + types | `src/lib/sections.ts` |
| Per-section 3D config | `src/components/sections/<name>.config.ts` |
| Scroll → camera/formation maths | `src/lib/timeline.ts` |
| Formations registry | `src/components/canvas/formations/index.ts` |
| Particle shader | `src/shaders/particles.ts` (curl noise in `src/shaders/noise.ts`) |
| Particle field | `src/components/canvas/ParticleField.tsx` |
| Camera rig | `src/components/canvas/CameraRig.tsx` |
| Canvas mount (ssr:false) | `src/components/canvas/CanvasRoot.tsx` → `Scene.tsx` |
| Lenis, ScrollTrigger, measuring, pointer | `src/components/ui/SiteRuntime.tsx` |
| Pinned chapter wrapper | `src/components/ui/ScrollChapter.tsx` |
| Reactive state (zustand) + per-frame values | `src/store/site.ts` |

### How to add a section (later phases)

1. Write a formation in `src/components/canvas/formations/<name>.ts` and register it in
   `formations/index.ts`.
2. Write `src/components/sections/<name>.config.ts` exporting a `SectionDef`:
   - `id` — must equal the `data-section` attribute on the section's root DOM element.
   - `formation` — registry name.
   - `hold: [a, b]` — the fraction of the section's scroll span during which the formation is
     fully formed and calm. The morph from the previous section runs between the previous
     section's `hold[1]` and this section's `hold[0]`, so intensity peaks between sections.
   - `dim` — 0..1 particle dimming while this section's text is being read.
   - `keyframes(viewport)` — camera keyframes `{ at, position, target, fov }`.
3. Append it to `SECTIONS` in `src/lib/sections.ts` in page order.
4. Render the DOM section with `data-section="<id>"` (plain `<section>` or `<ScrollChapter>`).

A section's scroll span runs from "its top hits the viewport top" (`at = 0`) to "the next
section's top hits the viewport top" (`at = 1`). For `<ScrollChapter length={L}>` the DOM is
pinned for `at ∈ [0, L / (1 + L)]`. Spans are measured from the DOM, so changing a section's
height never requires touching another section's config.

Per-frame values (smoothed progress, energy, pointer) live in the mutable `frame` object in
`src/store/site.ts` and are read inside `useFrame` — never put them in React state.

## Planned 3D moments (build only when that phase asks)

- HERO (Phase 1, built): particles assemble into "SAEESH VELE"; on scroll the camera pushes
  THROUGH the name.
- NUMBERS: particles rain down and stack into 3D bar columns; camera orbits ~30° while counters
  animate (5 internships · 1.5+ yrs · 1,000+ users · 3rd of 1,000+ teams · 9.1 CGPA · ~8
  hrs/week saved).
- EXPERIENCE: pinned chapter; camera rides along a glowing 3D tube pipeline; 5 internship
  stations (GoPerceptive → Labmentix → Exide → BrainHeaters → Autonex) assemble from particles
  as they're reached.
- PROJECTS: floating 3D node graph (nodes = projects, edges = shared tech); scroll rotates it;
  camera dives into each featured node, which expands into its case-study panel; edges light up
  for shared tech.
- SKILLS: four particle clusters (Data / AI / Web / Cloud) that separate as you scroll.
- ACHIEVEMENTS: particles form a podium; a "3" rises (NexBuildOn Hack 2026); certifications
  listed alongside.
- CONTACT: camera pulls back; particles settle into a calm 3D terrain/horizon grid.

## Performance & accessibility

- 60fps on an M1 MacBook; smooth on a mid-range Android phone.
- Particle count: ~60k desktop / ~18k mobile (decided via viewport width +
  `navigator.hardwareConcurrency` in `src/lib/device.ts`). DPR clamped to [1, 1.75]. Rendering
  pauses when the tab is hidden. The canvas is dynamically imported (`ssr:false`) so text
  paints first.
- Mobile: same camera path and moments, fewer particles, no postprocessing.
- `prefers-reduced-motion`: camera snaps between keyframes, no turbulence, no scroll morphs,
  no Lenis, no pinning.
- Real DOM text for everything (SEO + screen readers). The particle name is decorative
  (`aria-hidden`); there is a real `h1`.
- Lighthouse targets: Performance ≥85 on mobile, Accessibility ≥95.

## Workflow

After each phase: run `npm run build` + `npm run lint`, fix all errors, then summarise what
changed and exactly what Saeesh should check visually.
