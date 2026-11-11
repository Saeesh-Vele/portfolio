"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experienceQ, stationLevels } from "@/components/sections/experience.config";
import { numeralLift } from "@/components/sections/recognition.config";
import { clusterSpread } from "@/components/sections/skills.config";
import { projectFocus, workQ } from "@/components/sections/work.config";
import { experienceChronological } from "@/content/content";
import {
  COLORS,
  MAX_CLUSTERS,
  MAX_NODES,
  MAX_PROJECTS,
  MAX_STATIONS,
  MAX_STATS,
} from "@/lib/constants";
import { mulberry32, PARTICLE_COUNT, type Tier } from "@/lib/device";
import { pathFrame, pipelinePath, STATION, stationU } from "@/lib/pipelinePath";
import { SECTIONS, type Viewport } from "@/lib/sections";
import { formationAt, sectionAt } from "@/lib/timeline";
import { workGraph } from "@/lib/workGraph";
import { particleFragment, particleVertex } from "@/shaders/particles";
import { frame, useSite } from "@/store/site";
import { getFormation } from "./formations";

/** Seconds for the particles to assemble out of noise once the loader hands over. */
const INTRO_SECONDS = 2.8;
/** World-space point diameter. Fewer particles on mobile, so each is slightly larger. */
const POINT_SIZE: Record<Tier, number> = { mobile: 0.028, mid: 0.026, desktop: 0.022 };
const MAX_POINT_PX = 26;

/** Curve parameter per second for the pipeline flow: one pass takes about a minute. */
const FLOW_SPEED = 0.016;

const scratchRay = new THREE.Vector3();
const scratchTag = new THREE.Vector3();
const scratchNode = new THREE.Vector3();

interface FormationAttributes {
  position: THREE.BufferAttribute;
  aux: THREE.BufferAttribute;
}

/** Builds the geometry plus one position attribute per formation used by the page. */
function buildField(count: number, viewport: Viewport) {
  const geometry = new THREE.BufferGeometry();

  // Per-particle random seed: x → accent pick, y → size/alpha, z → intro delay, w → morph delay.
  const rand = mulberry32(0x5eed00);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = rand();
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));

  // Formations without per-particle behaviour share one all-zero aux buffer.
  const plainAux = new THREE.BufferAttribute(new Float32Array(count * 4), 4);
  const formations = new Map<string, FormationAttributes>();
  const names = SECTIONS.flatMap((section) => [
    section.formation,
    ...(section.extraHolds ?? []).map((hold) => hold.formation),
  ]);
  for (const name of names) {
    if (formations.has(name)) continue;
    const built = getFormation(name)(count, viewport);
    formations.set(
      name,
      built instanceof Float32Array
        ? { position: new THREE.BufferAttribute(built, 3), aux: plainAux }
        : {
            position: new THREE.BufferAttribute(built.positions, 3),
            aux: new THREE.BufferAttribute(built.aux, 4),
          },
    );
  }

  const first = formations.get(SECTIONS[0].formation)!;
  // `position` only tells three.js how many points to draw; the shader reads aFrom/aTo.
  geometry.setAttribute("position", first.position);
  geometry.setAttribute("aFrom", first.position);
  geometry.setAttribute("aTo", first.position);
  geometry.setAttribute("aFromAux", first.aux);
  geometry.setAttribute("aToAux", first.aux);
  return { geometry, formations };
}

/** The pipeline path as a 2-row float texture: row 0 = positions, row 1 = frame normals. */
function buildPathTexture(narrow: boolean) {
  const path = pipelinePath(narrow);
  const data = new Float32Array(path.samples * 2 * 4);
  for (let i = 0; i < path.samples; i++) {
    for (let k = 0; k < 3; k++) {
      data[i * 4 + k] = path.positions[i * 3 + k];
      data[(path.samples + i) * 4 + k] = path.normals[i * 3 + k];
    }
  }
  const texture = new THREE.DataTexture(data, path.samples, 2, THREE.RGBAFormat, THREE.FloatType);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return { texture, path };
}

function Field({ viewport, tier }: { viewport: Viewport; tier: Tier }) {
  const count = PARTICLE_COUNT[tier];
  const field = useMemo(() => buildField(count, viewport), [count, viewport]);
  useEffect(() => () => field.geometry.dispose(), [field]);

  const pathData = useMemo(() => buildPathTexture(viewport.isMobile), [viewport.isMobile]);
  useEffect(() => () => pathData.texture.dispose(), [pathData]);

  /** GRAPH node centres (projects, then techs): shader uniform + source for DOM labels. */
  const nodes = useMemo(() => {
    const graph = workGraph(viewport.isMobile);
    const all = [...graph.projects, ...graph.techs].slice(0, MAX_NODES);
    const flat = new Float32Array(MAX_NODES * 3);
    all.forEach((node, i) => flat.set(node.position, i * 3));
    return { flat, count: all.length };
  }, [viewport.isMobile]);

  /** World anchor of the "NOW" tag: inside the current station's ring, above the flow. */
  const tagAnchor = useMemo(() => {
    const stations = experienceChronological.length;
    const index = experienceChronological.findIndex((entry) => entry.current);
    if (index < 0) return null;
    const { position } = pathFrame(pathData.path, stationU(index, stations));
    return { index, position: new THREE.Vector3(position[0], position[1] + STATION.radius * 0.83, position[2]) };
  }, [pathData]);

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
          uPath: { value: null },
          uPathSamples: { value: 2 },
          uFlow: { value: FLOW_SPEED },
          uRise: { value: new Float32Array(MAX_STATS) },
          uStation: { value: new Float32Array(MAX_STATIONS) },
          uFocus: { value: new Float32Array(MAX_PROJECTS) },
          uNode: { value: new Float32Array(MAX_NODES * 3) },
          uClusterFocus: { value: new Float32Array(MAX_CLUSTERS) },
          uSpread: { value: 1 },
          uLift: { value: 1 },
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
    let pipelineWeight = 0;
    let graphWeight = 0;
    let horizonWeight = 0;
    if (timeline) {
      const morph = formationAt(timeline, frame.progress);
      const geometry = field.geometry;
      const from = field.formations.get(morph.from);
      const to = field.formations.get(morph.to);
      if (from && geometry.getAttribute("aFrom") !== from.position) {
        geometry.setAttribute("aFrom", from.position);
        geometry.setAttribute("aFromAux", from.aux);
      }
      if (to && geometry.getAttribute("aTo") !== to.position) {
        geometry.setAttribute("aTo", to.position);
        geometry.setAttribute("aToAux", to.aux);
      }
      // Reduced motion: formations switch, they don't morph.
      u.uProgress.value = reducedMotion ? (morph.progress >= 0.5 ? 1 : 0) : morph.progress;
      u.uDim.value = morph.dim;
      frame.debug.formation =
        morph.from === morph.to || morph.progress <= 0
          ? morph.from
          : morph.progress >= 1
            ? morph.to
            : `${morph.from} → ${morph.to} ${Math.round(morph.progress * 100)}%`;
      pipelineWeight =
        (morph.to === "pipeline" ? u.uProgress.value : 0) +
        (morph.from === "pipeline" ? 1 - u.uProgress.value : 0);
      graphWeight =
        (morph.to === "graph" ? u.uProgress.value : 0) +
        (morph.from === "graph" ? 1 - u.uProgress.value : 0);
      horizonWeight =
        (morph.to === "horizon" ? u.uProgress.value : 0) +
        (morph.from === "horizon" ? 1 - u.uProgress.value : 0);
    }

    // --- STATS columns rise with their DOM counters; PIPELINE stations assemble on approach
    const rise = u.uRise.value as Float32Array;
    const levels = u.uStation.value as Float32Array;
    if (reducedMotion) {
      rise.fill(1);
      levels.fill(1);
    } else {
      rise.set(frame.statsRise);
      const at = timeline ? sectionAt(timeline, "experience", frame.progress) : null;
      if (at === null) levels.fill(0);
      else stationLevels(experienceQ(at, viewport), levels);
    }
    frame.stationLevels.set(levels);

    // --- GRAPH: the project the camera is at is focused; its node, edges and techs light up
    const focus = u.uFocus.value as Float32Array;
    const workAt = !reducedMotion && timeline ? sectionAt(timeline, "work", frame.progress) : null;
    if (workAt === null) focus.fill(0);
    else projectFocus(workQ(workAt, viewport), focus);
    frame.projectFocus.set(focus);
    u.uNode.value = nodes.flat;

    // --- CLUSTERS separate and the PODIUM numeral rises as their sections scroll in;
    //     the hovered capability column's cluster eases brighter
    const skillsAt = timeline ? sectionAt(timeline, "skills", frame.progress) : null;
    const recognitionAt = timeline ? sectionAt(timeline, "recognition", frame.progress) : null;
    u.uSpread.value = reducedMotion || skillsAt === null ? 1 : clusterSpread(skillsAt);
    u.uLift.value = reducedMotion || recognitionAt === null ? 1 : numeralLift(recognitionAt);
    const clusterFocus = u.uClusterFocus.value as Float32Array;
    for (let i = 0; i < MAX_CLUSTERS; i++) {
      clusterFocus[i] = THREE.MathUtils.damp(clusterFocus[i], frame.clusterHover[i], 6, dt);
    }

    // --- HORIZON is the calmest state of the field: scroll energy and drift are held down
    const calm = Math.min(1, horizonWeight);
    u.uEnergy.value *= 1 - 0.85 * calm;
    u.uDrift.value *= 1 - 0.6 * calm;
    u.uPath.value = pathData.texture;
    u.uPathSamples.value = pathData.path.samples;

    // --- point scale: world size → device pixels at depth 1
    const camera = state.camera;
    const bufferHeight = state.gl.domElement.height;
    u.uScale.value = camera.projectionMatrix.elements[5] * bufferHeight * 0.5;
    u.uMaxSize.value = MAX_POINT_PX * state.viewport.dpr;
    frame.debug.dpr = state.viewport.dpr;
    frame.debug.particles = count;

    // --- pointer ray. The pointer is smoothed, so particles ease back after it passes.
    s.pointerX = THREE.MathUtils.damp(s.pointerX, frame.pointerX, 7, dt);
    s.pointerY = THREE.MathUtils.damp(s.pointerY, frame.pointerY, 7, dt);
    s.pointer = THREE.MathUtils.damp(s.pointer, reducedMotion ? 0 : frame.pointerActive, 4, dt);
    scratchRay.set(s.pointerX, s.pointerY, 0.5).unproject(camera).sub(camera.position).normalize();
    (u.uRayOrigin.value as THREE.Vector3).copy(camera.position);
    (u.uRayDir.value as THREE.Vector3).copy(scratchRay);
    u.uPointer.value = s.pointer;

    // --- screen position + scale of each graph node, for the DOM labels that follow them
    const visible = Math.min(1, graphWeight);
    const pxPerUnit = (camera.projectionMatrix.elements[5] * state.size.height) / 2;
    for (let i = 0; i < nodes.count; i++) {
      scratchNode.fromArray(nodes.flat, i * 3).applyMatrix4(camera.matrixWorldInverse);
      const depth = -scratchNode.z;
      const o = i * 4;
      if (visible <= 0.001 || depth < 0.5) {
        frame.nodes[o + 2] = 0;
        continue;
      }
      scratchNode.applyMatrix4(camera.projectionMatrix);
      frame.nodes[o] = scratchNode.x * 0.5 + 0.5;
      frame.nodes[o + 1] = 0.5 - scratchNode.y * 0.5;
      // Fades with distance like the particles do, and right in front of the lens.
      frame.nodes[o + 2] =
        visible * THREE.MathUtils.smoothstep(depth, 1.5, 3.5) * (1 - THREE.MathUtils.smoothstep(depth, 26, 44));
      frame.nodes[o + 3] = pxPerUnit / depth;
    }

    // --- screen position of the current station's tag, for the DOM label that follows it
    if (tagAnchor) {
      scratchTag.copy(tagAnchor.position).project(camera);
      const inFront = scratchTag.z < 1 && Math.abs(scratchTag.x) < 1.1 && Math.abs(scratchTag.y) < 1.1;
      frame.tag.x = scratchTag.x * 0.5 + 0.5;
      frame.tag.y = 0.5 - scratchTag.y * 0.5;
      frame.tag.opacity = inFront ? levels[tagAnchor.index] * Math.min(1, pipelineWeight) : 0;
    }
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
