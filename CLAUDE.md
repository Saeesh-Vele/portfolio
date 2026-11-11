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

### Breakpoint layout rule

When an element's grid placement differs between breakpoints, set it with longhand utilities
only and state every breakpoint explicitly: `col-start-*` + `col-end-*`, never `col-span-*`.
`col-span-*` sets the `grid-column` shorthand, so `md:col-span-4` silently resets a base
`col-start-1` and the element is auto-placed (into implicit columns when rows are stacked).
Items that share a grid row on purpose (stacked panels) always get an explicit column start
and end at every breakpoint. See `PANEL_PLACEMENT` in `src/components/sections/Experience.tsx`.

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
6. Per-particle formation data (Phase 2): a formation may return `{ positions, aux }` instead of
   a bare `Float32Array`. `aux` is 4 floats per particle, bound as `aFromAux` / `aToAux`; `aux.w`
   selects a behaviour in the vertex shader's `place()` function (values in `AUX_KIND`,
   `src/lib/constants.ts`): `0` plain target · `1..8` STATS column, rains in and stacks as
   `uRise[column]` runs 0→1 · `10` PIPELINE flow, travels along the path texture `uPath` by curve
   parameter + `uTime` · `11..18` PIPELINE station, loops upstream until `uStation[i]` assembles
   it into its ring · `20` GRAPH node / `21` GRAPH edge, carrying a bitmask of the projects they
   belong to so `uFocus[project]` lights one project's node, edges and techs and dims the rest;
   edge particles drift between two `uNode` positions. Both ends of a morph are placed, then mixed by the morph progress. A new
   behaviour = a new `aux.w` range + a branch in `place()`.
7. Time-driven values that must stay in sync with the DOM are written to `frame` by the DOM
   side and copied to uniforms in `ParticleField` (`frame.statsRise` is written by the same tween
   as the stat counters). Scroll-driven ones are derived from `sectionAt(timeline, id, progress)`
   (`stationLevels` in `experience.config.ts`).
8. Readability rule: 3D intensity peaks BETWEEN sections and calms down while text is being
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
| Pipeline path (three-free: shader texture, formation, camera) | `src/lib/pipelinePath.ts` |
| STATS ↔ DOM grid alignment | `src/lib/statsLayout.ts` |
| Line-by-line masked reveal (SplitText) | `src/lib/lineReveal.ts` |
| WORK graph model, derived from content (three-free) | `src/lib/workGraph.ts` |
| All-work index (plain DOM, solid background, not a 3D section) | `src/components/sections/WorkIndex.tsx` |
| Performance overlay (`?debug=1` only) | `src/components/ui/DebugGate.tsx` → `DebugOverlay.tsx` |

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
   - `extraHolds` (optional) — further formations held later in the same span, in order
     (the hero holds `name`, then `noise`).
   - `reducedKeyframes(viewport)` (optional) — used instead of `keyframes` with
     prefers-reduced-motion, where chapters are not pinned. Usually one static view.
   - `anchor(viewport)` (optional) — the point in the span (0..1) where nav links land, so a
     link into a pinned chapter arrives where its content is readable, not at its empty start.
     `scrollToSection` in `src/lib/scroll.ts` applies it; it is ignored with reduced motion.
3. Append it to `SECTIONS` in `src/lib/sections.ts` in page order.
4. Render the DOM section with `data-section="<id>"` (plain `<section>` or `<ScrollChapter>`).

A section's scroll span runs from "its top hits the viewport top" (`at = 0`) to "the next
section's top hits the viewport top" (`at = 1`). For `<ScrollChapter length={L}>` the DOM is
pinned for `at ∈ [0, L / (1 + L)]`. Spans are measured from the DOM, so changing a section's
height never requires touching another section's config.

Camera holds and pauses: the camera path is one CatmullRom spline, so a hold needs repeated
keyframes. Four keyframes with the same position (two at each end of the hold) make the
stretch between the middle two perfectly still — use this where the 3D must stay aligned with
the DOM (the STATS settle). Two keyframes slightly apart give a slow creep — use this where a
pause should still feel alive (pipeline stations).

`<ScrollChapter>` takes `length` / `mobileLength` (the height is CSS-driven, so there is no
layout shift at the breakpoint) and `reducedFallback`, a normal-flow version rendered inside
the same stage element with reduced motion. Its element tree must stay identical in both
modes: GSAP re-parents the pinned stage, so React must never remove or replace the stage.

Per-frame values (smoothed progress, energy, pointer) live in the mutable `frame` object in
`src/store/site.ts` and are read inside `useFrame` — never put them in React state.

## Planned 3D moments (build only when that phase asks)

- NUMBERS and EXPERIENCE below are built (Phase 2); PROJECTS is built (Phase 3) as a bipartite
  project ↔ shared-tech graph, with tech nodes derived from the featured stacks.
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

DOM that follows 3D points (the "NOW" tag, graph tech labels, project-node hit targets): the
particle field projects the points each frame into `frame` (`frame.tag`, `frame.nodes`) and the
DOM positions itself from that in a `gsap.ticker` callback — no React state, no drei `<Html>`.

Section configs are imported by the initial bundle (`SiteRuntime`), so they and anything they
import must not import three.js.

Measuring: open the site with `?debug=1` for a corner readout of frame time, FPS, particle
tier, active formation and DPR. Measure on real devices, not headless Chrome.

## Workflow

After each phase: run `npm run build` + `npm run lint`, fix all errors, then summarise what
changed and exactly what Saeesh should check visually.
