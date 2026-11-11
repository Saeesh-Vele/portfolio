"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS } from "@/lib/constants";
import { mulberry32, PARTICLE_COUNT, type Tier } from "@/lib/device";
import { SECTIONS, type Viewport } from "@/lib/sections";
import { formationAt } from "@/lib/timeline";
import { particleFragment, particleVertex } from "@/shaders/particles";
import { frame, useSite } from "@/store/site";
import { getFormation } from "./formations";

/** Seconds for the particles to assemble out of noise once the loader hands over. */
const INTRO_SECONDS = 2.8;
/** World-space point diameter. Fewer particles on mobile, so each is slightly larger. */
const POINT_SIZE: Record<Tier, number> = { mobile: 0.028, mid: 0.026, desktop: 0.022 };
const MAX_POINT_PX = 26;

const scratchRay = new THREE.Vector3();

/** Builds the geometry plus one position attribute per formation used by the page. */
function buildField(count: number, viewport: Viewport) {
  const geometry = new THREE.BufferGeometry();

  // Per-particle random seed: x → accent pick, y → size/alpha, z → intro delay, w → morph delay.
  const rand = mulberry32(0x5eed00);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = rand();
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));

  const formations = new Map<string, THREE.BufferAttribute>();
  for (const section of SECTIONS) {
    if (formations.has(section.formation)) continue;
    const positions = getFormation(section.formation)(count, viewport);
    formations.set(section.formation, new THREE.BufferAttribute(positions, 3));
  }

  const first = formations.get(SECTIONS[0].formation)!;
  // `position` only tells three.js how many points to draw; the shader reads aFrom/aTo.
  geometry.setAttribute("position", first);
  geometry.setAttribute("aFrom", first);
  geometry.setAttribute("aTo", first);
  return { geometry, formations };
}

function Field({ viewport, tier }: { viewport: Viewport; tier: Tier }) {
  const count = PARTICLE_COUNT[tier];
  const field = useMemo(() => buildField(count, viewport), [count, viewport]);
  useEffect(() => () => field.geometry.dispose(), [field]);

  const material = useRef<THREE.ShaderMaterial>(null);
  const local = useRef({ intro: 0, pointerX: 0, pointerY: 0, pointer: 0 });

  const materialArgs = useMemo<[THREE.ShaderMaterialParameters]>(
    () => [
      {
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uIntro: { value: 0 },
          uEnergy: { value: 0 },
          uDrift: { value: 1 },
          uSize: { value: POINT_SIZE.desktop },
          uScale: { value: 1 },
          uMaxSize: { value: MAX_POINT_PX },
          uDim: { value: 0 },
          uPointer: { value: 0 },
          uPointerRadius: { value: 1.1 },
          uRayOrigin: { value: new THREE.Vector3() },
          uRayDir: { value: new THREE.Vector3(0, 0, -1) },
          uColor: { value: new THREE.Color(COLORS.text) },
          uAccent: { value: new THREE.Color(COLORS.glacier) },
        },
      },
    ],
    [],
  );

  useFrame((state, delta) => {
    const shader = material.current;
    if (!shader) return;
    const u = shader.uniforms;
    const dt = Math.min(delta, 0.05);
    const s = local.current;
    const { loaded, reducedMotion, timeline } = useSite.getState();

    // --- intro: starts when the loader hands over; instant with reduced motion
    if (reducedMotion) s.intro = 1;
    else if (loaded) s.intro = Math.min(1, s.intro + dt / INTRO_SECONDS);
    u.uIntro.value = s.intro;

    // --- drift + scroll energy (both off with reduced motion)
    if (!reducedMotion) u.uTime.value += dt;
    u.uDrift.value = reducedMotion ? 0 : 1;
    u.uEnergy.value = reducedMotion ? 0 : frame.energy;
    u.uSize.value = POINT_SIZE[tier];

    // --- formation morph from scroll
    if (timeline) {
      const morph = formationAt(timeline, frame.progress);
      const geometry = field.geometry;
      const from = field.formations.get(morph.from);
      const to = field.formations.get(morph.to);
      if (from && geometry.getAttribute("aFrom") !== from) geometry.setAttribute("aFrom", from);
      if (to && geometry.getAttribute("aTo") !== to) geometry.setAttribute("aTo", to);
      // Reduced motion: formations switch, they don't morph.
      u.uProgress.value = reducedMotion ? (morph.progress >= 0.5 ? 1 : 0) : morph.progress;
      u.uDim.value = morph.dim;
    }

    // --- point scale: world size → device pixels at depth 1
    const camera = state.camera;
    const bufferHeight = state.gl.domElement.height;
    u.uScale.value = camera.projectionMatrix.elements[5] * bufferHeight * 0.5;
    u.uMaxSize.value = MAX_POINT_PX * state.viewport.dpr;

    // --- pointer ray. The pointer is smoothed, so particles ease back after it passes.
    s.pointerX = THREE.MathUtils.damp(s.pointerX, frame.pointerX, 7, dt);
    s.pointerY = THREE.MathUtils.damp(s.pointerY, frame.pointerY, 7, dt);
    s.pointer = THREE.MathUtils.damp(s.pointer, reducedMotion ? 0 : frame.pointerActive, 4, dt);
    scratchRay.set(s.pointerX, s.pointerY, 0.5).unproject(camera).sub(camera.position).normalize();
    (u.uRayOrigin.value as THREE.Vector3).copy(camera.position);
    (u.uRayDir.value as THREE.Vector3).copy(scratchRay);
    u.uPointer.value = s.pointer;
  });

  return (
    <points geometry={field.geometry} frustumCulled={false}>
      <shaderMaterial ref={material} args={materialArgs} />
    </points>
  );
}

/**
 * The persistent particle field: one Points object, one ShaderMaterial, shared by every
 * section. Mounts once the viewport (and display font) are ready.
 */
export function ParticleField() {
  const viewport = useSite((state) => state.viewport);
  const tier = useSite((state) => state.tier);
  if (!viewport) return null;
  return <Field viewport={viewport} tier={tier} />;
}
