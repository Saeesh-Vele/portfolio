"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { barSink, heroExit, plateFade, surfaceGone } from "@/components/sections/hero.config";
import { hero } from "@/content/content";
import { COLORS } from "@/lib/constants";
import { heroCamera, surfaceGrid, visibleSize, type SurfaceGrid } from "@/lib/heroLayout";
import { sectionAt } from "@/lib/timeline";
import { frame, useSite } from "@/store/site";
import { createSimplex2D } from "./simplex";

/*
 * Local units: one grid cell = 1. The cell grid is centred on the origin, x across, z front
 * (+) to back (-), bars standing on the plate's top face at y = 0.
 */
/** Bar side tone by height: graphite at the foot, lighter steel toward the tallest tops. */
const TONE = { low: "#12161C", high: "#2A323C" };
/** A touch lighter than the page, so the base reads as a thin slab, not a hole. */
const PLATE_COLOR = "#0D1117";
/** Bar footprint and bevel. */
const FOOT = 0.8;
const BEVEL = 0.075;
/** Bar heights. */
const H_MIN = 0.22;
const H_MAX = 3.4;
const PLATE_THICKNESS = 0.14;
/** Share of bars (the tallest) whose top caps glow. */
const GLOW_SHARE = 0.18;
/**
 * Cap glow (× glacier). With bloom the bloom pass spreads it; without (phones, low tiers)
 * the core stays lower so the cap reads glacier rather than white, and an additive halo
 * quad per lit cap gives it its glow.
 */
const CAP_GLOW = { bloom: 2.6, halo: 1.6 };
/** Halo quad side, in cells, and how far it sits toward the lens off its cap. */
const HALO = { size: 2.8, lift: 0.9, strength: 0.85 };
/** Plate border around the grid, plus the band the axis labels sit in (front + right). */
const MARGIN = 0.75;
const LABEL_BAND = 1.15;
/**
 * Resting orientation: tilted toward the viewer (x) and turned (y). Phones: isometric-ish,
 * the front-right corner leading. Desktop: a low front three-quarter view (~27° above the
 * plate, so the bar sides show) with the long axis level, turned just enough (−2°) to
 * catch the rim light; perspective then keeps the "NOW" corner level with the front-left.
 */
const BASE_ROTATION = {
  mobile: new THREE.Euler(THREE.MathUtils.degToRad(35), THREE.MathUtils.degToRad(-30), 0),
  desktop: new THREE.Euler(THREE.MathUtils.degToRad(27), THREE.MathUtils.degToRad(-2), 0),
};
/**
 * Share of the slot the object may fill. Lower on phones: the fit is orthographic, and in a
 * tall, narrow view the near (front) corner projects noticeably larger.
 */
const FILL = { desktop: 1, mobile: 0.86 };
/** Pointer tilt (radians at the edge of the screen) and its damping. */
const TILT = { yaw: THREE.MathUtils.degToRad(5), pitch: THREE.MathUtils.degToRad(3.5), damping: 3 };
/** Very slow float, in local units. */
const BOB = { amplitude: 0.14, speed: 0.5 };
/** Seconds for the bars to rise on load, and the column stagger across them. */
const INTRO = { duration: 1.6, stagger: 0.7 };
/**
 * Hover ripple: a damped ring wave spreading from the cell under the pointer. Each bar dips
 * as the front reaches it, rebounds, and settles (sin · exp). Speed in cells per second.
 */
const RIPPLE = { speed: 11, omega: 10.5, damping: 3.6, amplitude: 0.95, falloff: 0.12, max: 10, every: 0.07 };
/** Held dip of the bar right under the pointer: the "keypress". */
const PRESS = { depth: 0.55, rate: 12 };
/** Axis label canvas: pixels per local unit. */
const LABEL_PX = 72;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const pad = (value: number) => String(value).padStart(2, "0");
/** 0..1 for the intro rise as a whole (halos fade in with the bars). */
const rise01 = (intro: number) => smoothstep(0.4, 1 + INTRO.stagger, intro);

const scratchMatrix = new THREE.Matrix4();
const scratchScale = new THREE.Vector3();
const scratchQuat = new THREE.Quaternion();
const scratchPos = new THREE.Vector3();
const scratchNdc = new THREE.Vector2();
const scratchHit = new THREE.Vector3();
const scratchNormal = new THREE.Vector3();
const scratchPlane = new THREE.Plane();
const scratchOffset = new THREE.Matrix4();

/** Plate extents in local units. */
function plateBox({ cols, rows }: SurfaceGrid) {
  const minX = -cols / 2 - MARGIN;
  const maxX = cols / 2 + MARGIN + LABEL_BAND;
  const minZ = -rows / 2 - MARGIN;
  const maxZ = rows / 2 + MARGIN + LABEL_BAND;
  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 };
}

/**
 * The object's local bounding box centre, its half extents once rotated into view (at
 * scale 1), and its rotated corners (relative to the centre), for fitting it into its slot.
 */
function fitMetrics(grid: SurfaceGrid, rotation: THREE.Euler) {
  const plate = plateBox(grid);
  const minY = -PLATE_THICKNESS;
  const maxY = H_MAX * 0.85;
  const center = new THREE.Vector3(plate.cx, (minY + maxY) / 2, plate.cz);
  let halfX = 0;
  let halfY = 0;
  const corners: THREE.Vector3[] = [];
  for (const x of [plate.minX, plate.maxX]) {
    for (const y of [minY, maxY]) {
      for (const z of [plate.minZ, plate.maxZ]) {
        const corner = new THREE.Vector3(x, y, z).sub(center).applyEuler(rotation);
        corners.push(corner);
        halfX = Math.max(halfX, Math.abs(corner.x));
        halfY = Math.max(halfY, Math.abs(corner.y));
      }
    }
  }
  return { center, halfX, halfY, corners };
}

/**
 * Screen box (px: centre x, centre y, width, height) of the rotated corners at `scale`,
 * placed at `position` on the z = 0 plane, seen from the resting hero camera.
 */
function projectedBox(
  corners: THREE.Vector3[],
  position: THREE.Vector3,
  scale: number,
  camera: { distance: number; fov: number },
  viewW: number,
  viewH: number,
) {
  const k = viewH / 2 / Math.tan((camera.fov * Math.PI) / 360);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const corner of corners) {
    const depth = camera.distance - (position.z + corner.z * scale);
    const x = viewW / 2 + ((position.x + corner.x * scale) / depth) * k;
    const y = viewH / 2 - ((position.y + corner.y * scale) / depth) * k;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

/**
 * Patches MeshPhysicalMaterial: per-bar height / drop / footprint from `aBar`, the
 * height-mapped side tone and the glacier top cap.
 */
function barMaterial(glow: { value: THREE.Color }) {
  const material = new THREE.MeshPhysicalMaterial({
    roughness: 0.3,
    metalness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });
  const toneLow = { value: new THREE.Color(TONE.low) };
  const toneHigh = { value: new THREE.Color(TONE.high) };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGlacier = glow;
    shader.uniforms.uToneLow = toneLow;
    shader.uniforms.uToneHigh = toneHigh;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec4 aBar;\nvarying float vGlow;\nvarying float vTone;\nvarying vec2 vCap;",
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
        // aBar.x = height, aBar.y = top-cap glow, aBar.z = drop, aBar.w = footprint. The top
        // half of the unit box moves up to the bar's height, so the bevels keep their shape.
        transformed.y += step(0.0, position.y) * (aBar.x - 1.0) - aBar.z;
        transformed.xz *= aBar.w;
        // Height above the plate (the box spans -0.5..0.5 before the instance's +0.5).
        vTone = clamp((transformed.y + 0.5 + aBar.z) / ${H_MAX.toFixed(2)}, 0.0, 1.0);
        vGlow = aBar.y * smoothstep(0.55, 0.95, objectNormal.y);
        vCap = position.xz / ${(FOOT / 2).toFixed(3)};`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec3 uGlacier;\nuniform vec3 uToneLow;\nuniform vec3 uToneHigh;\nvarying float vGlow;\nvarying float vTone;\nvarying vec2 vCap;",
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.rgb = mix(uToneLow, uToneHigh, vTone);",
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
        // Brightest at the cap's centre, falling off toward its bevel.
        float core = 1.0 - smoothstep(0.1, 1.05, length(vCap));
        totalEmissiveRadiance += uGlacier * vGlow * (0.55 + 0.7 * core);`,
      );
  };
  material.customProgramCacheKey = () => "data-surface-bar";
  return material;
}

/**
 * Soft additive glow for lit caps where there is no bloom: one camera-facing quad per bar,
 * centred on its cap and pulled toward the lens so the cap never cuts it. Unlit bars
 * collapse their quad to a point (no fragments). Shares the bars' `aBar` attribute.
 */
function haloMaterial(color: THREE.Color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aBar;
      varying vec2 vUv;
      varying float vGlow;
      void main() {
        vGlow = aBar.y;
        vUv = position.xy * 2.0;
        // The cap's centre: the instance stands the unit box on y = 0, its top at aBar.x.
        vec4 centre = modelViewMatrix * instanceMatrix * vec4(0.0, aBar.x - 0.5 - aBar.z, 0.0, 1.0);
        float scale = length(modelViewMatrix[0].xyz);
        centre.xyz += normalize(-centre.xyz) * ${HALO.lift.toFixed(2)} * scale;
        centre.xy += position.xy * ${HALO.size.toFixed(2)} * scale * aBar.w * step(0.002, aBar.y);
        gl_Position = projectionMatrix * centre;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vGlow;
      void main() {
        float d = length(vUv);
        float a = exp(-d * d * 5.5) * (1.0 - smoothstep(0.7, 1.0, d));
        gl_FragColor = vec4(uColor * a * vGlow * uOpacity, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

/** Orientation of a label plane lying on the plate: its x / y axes → the given local axes. */
function lyingFlat(xAxis: THREE.Vector3, yAxis: THREE.Vector3) {
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
}

/**
 * Draws one axis: a tick per cell along the band's top edge (nearest the bars) and the
 * labels below them. `labels` are [position along the axis in cells, text].
 */
function axisTexture(cells: number, labels: [number, string][], family: string) {
  const canvas = document.createElement("canvas");
  canvas.width = cells * LABEL_PX;
  canvas.height = Math.round(LABEL_BAND * LABEL_PX);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  for (let i = 0; i < cells; i++) {
    const x = (i + 0.5) * LABEL_PX;
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.lineTo(x, LABEL_PX * 0.16);
    ctx.stroke();
  }
  ctx.font = `500 ${Math.round(LABEL_PX * 0.42)}px ${family}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${(LABEL_PX * 0.42 * 0.12).toFixed(1)}px`;
  ctx.textBaseline = "middle";
  labels.forEach(([at, text], i) => {
    ctx.textAlign = i === 0 ? "left" : i === labels.length - 1 ? "right" : "center";
    const x = (at + 0.5) * LABEL_PX + (i === 0 ? -LABEL_PX * 0.2 : i === labels.length - 1 ? LABEL_PX * 0.2 : 0);
    ctx.fillText(text, x, LABEL_PX * 0.6);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** "T−24H … T−6H NOW" along the columns; "00 … 13" along the rows. */
function buildAxes(grid: SurfaceGrid, family: string) {
  const { timePrefix, timeSuffix, now, hours } = hero.surface;
  const last = hours[0];
  const time: [number, string][] = [
    ...hours.map((h): [number, string] => [(1 - h / last) * (grid.cols - 1), `${timePrefix}${h}${timeSuffix}`]),
    [grid.cols - 1, now],
  ];
  const rows: [number, string][] = [0, 1, 2, 3, 4].map((i) => {
    const row = Math.round((i * (grid.rows - 1)) / 4);
    return [row, pad(row)];
  });
  return { front: axisTexture(grid.cols, time, family), side: axisTexture(grid.rows, rows, family) };
}

interface Ripple {
  x: number;
  z: number;
  age: number;
}

function Surface({ grid, mobile, halo }: { grid: SurfaceGrid; mobile: boolean; halo: boolean }) {
  const { cols, rows } = grid;
  const count = cols * rows;
  const plate = useMemo(() => plateBox(grid), [grid]);
  const rotation = mobile ? BASE_ROTATION.mobile : BASE_ROTATION.desktop;
  const fit = useMemo(() => fitMetrics(grid, rotation), [grid, rotation]);

  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const bars = useRef<THREE.InstancedMesh>(null);
  const halos = useRef<THREE.InstancedMesh>(null);
  const plateGroup = useRef<THREE.Group>(null);

  const glow = useMemo(
    () => ({ value: new THREE.Color(COLORS.glacier).multiplyScalar(halo ? CAP_GLOW.halo : CAP_GLOW.bloom) }),
    [halo],
  );
  const barAttribute = useMemo(() => {
    const attribute = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    attribute.setUsage(THREE.DynamicDrawUsage);
    return attribute;
  }, [count]);
  const barGeometry = useMemo(() => {
    const geometry = new RoundedBoxGeometry(FOOT, 1, FOOT, mobile ? 1 : 2, BEVEL);
    geometry.setAttribute("aBar", barAttribute);
    return geometry;
  }, [barAttribute, mobile]);
  const barMat = useMemo(() => barMaterial(glow), [glow]);
  const haloGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute("aBar", barAttribute);
    return geometry;
  }, [barAttribute]);
  const haloMat = useMemo(
    // The shader writes display values directly: glacier as authored (sRGB).
    () => haloMaterial(new THREE.Color(COLORS.glacier).convertLinearToSRGB().multiplyScalar(HALO.strength)),
    [],
  );
  const plateGeometry = useMemo(
    () => new RoundedBoxGeometry(plate.width, PLATE_THICKNESS, plate.depth, 2, 0.05),
    [plate],
  );
  const plateMat = useMemo(
    // Unlit: the slab is exactly its colour under any light, never a grey sheet.
    () => new THREE.MeshBasicMaterial({ color: PLATE_COLOR, transparent: true, toneMapped: false }),
    [],
  );
  const edge = useMemo(() => {
    const inset = 0.12;
    const y = 0.004;
    const points = [
      new THREE.Vector3(plate.minX + inset, y, plate.minZ + inset),
      new THREE.Vector3(plate.maxX - inset, y, plate.minZ + inset),
      new THREE.Vector3(plate.maxX - inset, y, plate.maxZ - inset),
      new THREE.Vector3(plate.minX + inset, y, plate.maxZ - inset),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: COLORS.glacier,
      transparent: true,
      opacity: 0.55,
      toneMapped: false,
    });
    return new THREE.LineLoop(geometry, material);
  }, [plate]);

  useEffect(
    () => () => {
      barGeometry.dispose();
      haloGeometry.dispose();
      plateGeometry.dispose();
      edge.geometry.dispose();
      (edge.material as THREE.Material).dispose();
    },
    [barGeometry, haloGeometry, plateGeometry, edge],
  );
  useEffect(
    () => () => {
      barMat.dispose();
      haloMat.dispose();
      plateMat.dispose();
    },
    [barMat, haloMat, plateMat],
  );

  // Axis labels, drawn in Geist Mono once it has loaded.
  const [axes, setAxes] = useState<ReturnType<typeof buildAxes> | null>(null);
  useEffect(() => {
    let cancelled = false;
    const family =
      getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim() ||
      "monospace";
    const ready = document.fonts ? document.fonts.load(`500 30px ${family}`) : Promise.resolve();
    ready
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) setAxes(buildAxes(grid, family));
      });
    return () => {
      cancelled = true;
    };
  }, [grid]);
  useEffect(
    () => () => {
      axes?.front?.dispose();
      axes?.side?.dispose();
    },
    [axes],
  );
  const labelMats = useMemo(
    () =>
      [axes?.front, axes?.side].map(
        (map) =>
          new THREE.MeshBasicMaterial({
            map: map ?? null,
            color: "#8A8F98",
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            toneMapped: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
          }),
      ),
    [axes],
  );
  useEffect(() => () => labelMats.forEach((material) => material.dispose()), [labelMats]);
  const labelOrientation = useMemo(
    () => ({
      front: lyingFlat(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1)),
      side: lyingFlat(new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0)),
    }),
    [],
  );

  // Bars stand on fixed cells; only their heights change (the aBar attribute).
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    for (const mesh of [bars.current, halos.current]) {
      if (!mesh) continue;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          matrix.makeTranslation(c - (cols - 1) / 2, 0.5, (rows - 1) / 2 - r);
          mesh.setMatrixAt(r * cols + c, matrix);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, [cols, rows, halo]);

  // What the frame loop mutates (uniform-like material values, the height attribute),
  // reached through a ref: the memoised objects themselves are never written after render.
  const live = useRef<{
    barAttribute: THREE.InstancedBufferAttribute;
    plateMat: THREE.MeshBasicMaterial;
    haloMat: THREE.ShaderMaterial;
    edge: THREE.LineLoop;
    labelMats: THREE.MeshBasicMaterial[];
  } | null>(null);
  useLayoutEffect(() => {
    live.current = { barAttribute, plateMat, haloMat, edge, labelMats };
  }, [barAttribute, plateMat, haloMat, edge, labelMats]);

  const state = useRef({
    time: 0,
    intro: 0,
    noise: createSimplex2D(0x5eed),
    heights: new Float32Array(count),
    sorted: new Float32Array(count),
    press: new Float32Array(count),
    ripples: [] as Ripple[],
    sinceRipple: 0,
    hovered: -1,
    tiltX: 0,
    tiltY: 0,
    raycaster: new THREE.Raycaster(),
  });

  useFrame((three, delta) => {
    const s = state.current;
    const group = root.current;
    const mesh = bars.current;
    if (!live.current || !group || !mesh || !tilt.current || !bob.current) return;
    const { barAttribute: attribute, plateMat: plateMaterial, haloMat: haloShader, edge: edgeLine, labelMats: labelMaterials } =
      live.current;
    const dt = Math.min(delta, 0.05);
    const { reducedMotion, loaded, timeline } = useSite.getState();

    // --- placement: the slot (DOM px) → the z = 0 plane through the resting hero camera
    const [slotX, slotY, slotW, slotH] = frame.heroSlot;
    const e = reducedMotion || !timeline ? 0 : heroExit(sectionAt(timeline, "hero", frame.progress));
    const fade = plateFade(e);
    if (slotW < 1 || surfaceGone(e)) {
      group.visible = false;
      frame.surfaceHover.opacity = 0;
      return;
    }
    group.visible = true;
    const { width: viewW, height: viewH } = three.size;
    const camera = heroCamera(mobile);
    const worldPerPx = visibleSize({ aspect: 1 }, camera.distance, camera.fov).height / viewH;
    let scale =
      Math.min((slotW * worldPerPx) / (2 * fit.halfX), (slotH * worldPerPx) / (2 * fit.halfY)) *
      (mobile ? FILL.mobile : FILL.desktop);
    scratchPos.set((slotX - viewW / 2) * worldPerPx, (viewH / 2 - slotY) * worldPerPx, 0);
    if (!mobile) {
      // Desktop's closer camera adds real perspective (the near corner projects larger), so
      // correct the flat fit against the projected box: its size, then its place — the
      // right edge on the box's right edge (the content edge), centred vertically.
      const right = slotX + slotW / 2;
      for (let pass = 0; pass < 3; pass++) {
        const box = projectedBox(fit.corners, scratchPos, scale, camera, viewW, viewH);
        scale *= Math.min(slotW / box.width, slotH / box.height);
        const moved = projectedBox(fit.corners, scratchPos, scale, camera, viewW, viewH);
        scratchPos.x += (right - (moved.x + moved.width / 2)) * worldPerPx;
        scratchPos.y -= (slotY - moved.y) * worldPerPx;
      }
    }

    // Rest matrix of the cell grid, for the burst particles: no bob, tilt or shrink.
    scratchMatrix.compose(scratchPos, scratchQuat.setFromEuler(rotation), scratchScale.setScalar(scale));
    scratchMatrix.multiply(scratchOffset.makeTranslation(-fit.center.x, -fit.center.y, -fit.center.z));
    scratchMatrix.toArray(frame.surfaceMatrix);
    frame.surfaceSize[0] = cols - 1;
    frame.surfaceSize[1] = rows - 1;

    // --- time, intro rise, float
    if (!reducedMotion) s.time += dt;
    else s.time = 12;
    s.intro = reducedMotion ? 1 + INTRO.stagger : loaded ? s.intro + dt / INTRO.duration : 0;
    group.position.copy(scratchPos);
    // The bars stay at their rest scale (the burst particles launch from it); only the
    // plate shrinks a little as it fades.
    group.scale.setScalar(scale);
    plateGroup.current?.scale.setScalar(1 - 0.12 * fade);
    bob.current.position.y = reducedMotion ? 0 : Math.sin(s.time * BOB.speed) * BOB.amplitude;

    // --- pointer: tilt toward it, and find the cell under it
    const pointing = !reducedMotion && frame.pointerActive > 0 && e < 0.12;
    const centerX = (slotX / viewW) * 2 - 1;
    const centerY = 1 - (slotY / viewH) * 2;
    const towardX = pointing ? THREE.MathUtils.clamp(frame.pointerX - centerX, -1, 1) : 0;
    const towardY = pointing ? THREE.MathUtils.clamp(frame.pointerY - centerY, -1, 1) : 0;
    s.tiltY = THREE.MathUtils.damp(s.tiltY, towardX * TILT.yaw, TILT.damping, dt);
    s.tiltX = THREE.MathUtils.damp(s.tiltX, -towardY * TILT.pitch, TILT.damping, dt);
    tilt.current.rotation.set(rotation.x + s.tiltX, rotation.y + s.tiltY, 0);

    let hovered = -1;
    if (pointing) {
      // Intersect the plane through the bars' mean height: closer to what the eye picks.
      const mean = frame.surfaceSize[2] || 1.4;
      const inner = bob.current;
      inner.updateWorldMatrix(true, false);
      scratchNormal.set(0, 1, 0).transformDirection(inner.matrixWorld);
      scratchHit.set(0, mean, 0).applyMatrix4(inner.matrixWorld);
      scratchPlane.setFromNormalAndCoplanarPoint(scratchNormal, scratchHit);
      s.raycaster.setFromCamera(scratchNdc.set(frame.pointerX, frame.pointerY), three.camera);
      if (s.raycaster.ray.intersectPlane(scratchPlane, scratchHit)) {
        inner.worldToLocal(scratchHit);
        const c = Math.round(scratchHit.x + (cols - 1) / 2);
        const r = Math.round((rows - 1) / 2 - scratchHit.z);
        if (c >= 0 && c < cols && r >= 0 && r < rows) hovered = r * cols + c;
      }
    }
    s.sinceRipple += dt;
    if (hovered >= 0 && hovered !== s.hovered && s.sinceRipple >= RIPPLE.every) {
      s.ripples.push({ x: hovered % cols, z: Math.floor(hovered / cols), age: 0 });
      if (s.ripples.length > RIPPLE.max) s.ripples.shift();
      s.sinceRipple = 0;
    }
    s.hovered = hovered;
    const lifetime = Math.hypot(cols, rows) / RIPPLE.speed + 1.6;
    for (const ripple of s.ripples) ripple.age += dt;
    while (s.ripples.length > 0 && s.ripples[0].age > lifetime) s.ripples.shift();

    // --- heights: two octaves of simplex drift plus a slow travelling wave — live, calm
    const noise = s.noise;
    const t = s.time;
    let sum = 0;
    for (let r = 0; r < rows; r++) {
      const nz = r / (rows - 1);
      for (let c = 0; c < cols; c++) {
        const nx = c / (cols - 1);
        const a = noise(nx * 2.1 + t * 0.045, nz * 1.7 - t * 0.03);
        const b = noise(nx * 4.4 - t * 0.07 + 7.1, nz * 3.9 + t * 0.05);
        const wave = Math.sin((nx * 1.25 - nz * 0.45) * Math.PI * 2 - t * 0.6);
        const v = clamp01(0.44 + 0.3 * a + 0.1 * b + 0.13 * wave);
        const h = H_MIN + (H_MAX - H_MIN) * Math.pow(v, 1.3);
        s.heights[r * cols + c] = h;
        sum += h;
      }
    }
    frame.surfaceSize[2] = sum / count;
    s.sorted.set(s.heights);
    s.sorted.sort();
    const lit = s.sorted[Math.floor(count * (1 - GLOW_SHARE))];
    const top = s.sorted[count - 1];

    const out = attribute.array as Float32Array;
    for (let r = 0; r < rows; r++) {
      const sink = barSink(r / (rows - 1), e);
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const base = s.heights[i];
        // Rows rise on load, front first, a little staggered across the columns.
        const rise = smoothstep(0, 1, s.intro - (r / rows) * INTRO.stagger * 0.6 - (c / cols) * INTRO.stagger * 0.4);
        let h = H_MIN + (base - H_MIN) * rise;
        // Ripples + the held press under the pointer.
        let dip = 0;
        for (const ripple of s.ripples) {
          const d = Math.hypot(c - ripple.x, r - ripple.z);
          const local = ripple.age - d / RIPPLE.speed;
          if (local <= 0) continue;
          dip += Math.sin(local * RIPPLE.omega) * Math.exp(-local * RIPPLE.damping - d * RIPPLE.falloff);
        }
        s.press[i] = THREE.MathUtils.damp(s.press[i], i === hovered ? 1 : 0, PRESS.rate, dt);
        h = Math.max(H_MIN, h - dip * RIPPLE.amplitude - s.press[i] * PRESS.depth);
        // Exit: the bar collapses to a tile, which shrinks away as its particles launch.
        const collapsed = H_MIN + (h - H_MIN) * (1 - smoothstep(0, 0.8, sink));
        // Glow scales with height above the lit threshold.
        const glowAmount =
          smoothstep(lit - 0.06, lit + 0.04, base) * (0.25 + 0.75 * clamp01((base - lit) / Math.max(top - lit, 1e-3)));
        const o = i * 4;
        out[o] = collapsed;
        out[o + 1] = glowAmount * rise * (1 - sink);
        out[o + 2] = smoothstep(0.5, 1, sink) * 0.2;
        out[o + 3] = 1 - smoothstep(0.6, 1, sink);
      }
    }
    attribute.needsUpdate = true;

    // --- fade the plate, its edge and labels while the back rows are still going
    plateMaterial.opacity = 1 - fade;
    // A fading plate must not keep hiding the particles behind it.
    plateMaterial.depthWrite = fade < 0.01;
    if (plateGroup.current) plateGroup.current.visible = fade < 1;
    (edgeLine.material as THREE.LineBasicMaterial).opacity = 0.55 * (1 - fade);
    labelMaterials.forEach((material) => {
      material.opacity = 0.5 * (1 - fade);
    });
    haloShader.uniforms.uOpacity.value = rise01(s.intro);

    // --- hover readout (desktop): screen position of the hovered bar's top
    const hover = frame.surfaceHover;
    if (hovered >= 0 && frame.pointerTouch === 0) {
      const c = hovered % cols;
      const r = Math.floor(hovered / cols);
      scratchHit.set(c - (cols - 1) / 2, out[hovered * 4], (rows - 1) / 2 - r);
      bob.current.localToWorld(scratchHit).project(three.camera);
      hover.x = (scratchHit.x * 0.5 + 0.5) * viewW;
      hover.y = (0.5 - scratchHit.y * 0.5) * viewH;
      hover.col = c;
      hover.cols = cols;
      hover.row = r;
      hover.value = clamp01((s.heights[hovered] - H_MIN) / (H_MAX - H_MIN));
      hover.opacity = 1 - fade;
    } else {
      hover.opacity = 0;
    }
  });

  return (
    <group ref={root} visible={false}>
      <group ref={tilt} rotation={rotation}>
        <group position={[-fit.center.x, -fit.center.y, -fit.center.z]}>
          <group ref={bob}>
            <group ref={plateGroup}>
              <mesh
                geometry={plateGeometry}
                material={plateMat}
                position={[plate.cx, -PLATE_THICKNESS / 2, plate.cz]}
              />
              <primitive object={edge} />
              {axes?.front ? (
                <mesh
                  material={labelMats[0]}
                  position={[0, 0.006, rows / 2 + 0.2 + LABEL_BAND / 2]}
                  quaternion={labelOrientation.front}
                >
                  <planeGeometry args={[cols, LABEL_BAND]} />
                </mesh>
              ) : null}
              {axes?.side ? (
                <mesh
                  material={labelMats[1]}
                  position={[cols / 2 + 0.2 + LABEL_BAND / 2, 0.006, 0]}
                  quaternion={labelOrientation.side}
                >
                  <planeGeometry args={[rows, LABEL_BAND]} />
                </mesh>
              ) : null}
            </group>
            <instancedMesh
              ref={bars}
              args={[barGeometry, barMat, count]}
              frustumCulled={false}
            />
            {halo ? (
              <instancedMesh
                ref={halos}
                args={[haloGeometry, haloMat, count]}
                frustumCulled={false}
                renderOrder={1}
              />
            ) : null}
          </group>
        </group>
      </group>
    </group>
  );
}

/**
 * HERO — the DATA SURFACE: a lit, instanced bar grid on a dark plate (one draw call for the
 * bars), placed in the hero's DOM slot. Heights drift like live data; the pointer ripples
 * it; scrolling sinks it front to back while its particles burst out (heroExit, shared with
 * the particle shader). Studio light comes from Lightformers — no HDR downloads.
 */
export function DataSurface() {
  const viewport = useSite((state) => state.viewport);
  const tier = useSite((state) => state.tier);
  const bloomAllowed = useSite((state) => state.bloomAllowed);
  const mobile = viewport?.isMobile ?? false;
  // Where there is no bloom pass (see Scene), the lit caps get their halo quads.
  const halo = mobile || tier !== "desktop" || !bloomAllowed;
  const grid = useMemo(
    () => (viewport ? surfaceGrid(viewport.isMobile, tier === "mobile") : null),
    [viewport, tier],
  );

  return (
    <>
      <ambientLight intensity={0.14} />
      {/* Key light: high, front left. Rim: glacier, from behind on the right, raking the
          bevels so their edges catch. */}
      <directionalLight position={[-4, 7, 7]} intensity={4.2} />
      <directionalLight position={[9, 3, -6]} intensity={6.5} color={COLORS.glacier} />
      {/*
        Studio strips for the clearcoat. From the hero camera, the bar tops (tilted 35°
        toward it) reflect the space above and slightly behind; the front faces reflect the
        floor (left dark, for form); the right faces reflect the back right (a glacier strip).
      */}
      <Environment resolution={128} frames={1} environmentIntensity={1.3}>
        {/* Narrow, so its reflection is a soft band across the tops, not a uniform grey. */}
        <Lightformer form="rect" intensity={1.6} position={[0, 7, -3]} rotation-x={Math.PI / 2.4} scale={[16, 0.9, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[-8, 2, 2]} rotation-y={Math.PI / 2} scale={[8, 2.4, 1]} />
        <Lightformer form="rect" intensity={2.6} color={COLORS.glacier} position={[7, -1.5, -6]} rotation-y={-Math.PI / 3} scale={[7, 1.6, 1]} />
        <Lightformer form="ring" intensity={1.1} position={[0, 3, 8]} scale={4} />
      </Environment>
      {grid ? (
        <Surface key={`${grid.cols}x${grid.rows}`} grid={grid} mobile={mobile} halo={halo} />
      ) : null}
    </>
  );
}
