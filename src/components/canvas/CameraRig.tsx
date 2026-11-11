"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { cameraParam, locate, nearestKeyframe } from "@/lib/timeline";
import { frame, useSite } from "@/store/site";

const scratchPosition = new THREE.Vector3();
const scratchTarget = new THREE.Vector3();

/** Higher = the camera catches up with scroll faster. */
const PROGRESS_DAMPING = 4.5;
const PARALLAX = { x: 0.35, y: 0.2, damping: 2.5 };

/**
 * Scroll-driven camera. The camera position follows one CatmullRom spline through every
 * section's keyframes and looks at a point on a second spline; global scroll progress picks
 * the point on both. Progress is damped here, once, and `frame.progress` is what the rest of
 * the scene reads so camera and formation morphs never drift apart.
 *
 * Runs at priority -1: before the particle field, without taking over rendering.
 */
export function CameraRig() {
  const timeline = useSite((state) => state.timeline);
  const local = useRef({ started: false, lastScrollY: 0, parallaxX: 0, parallaxY: 0 });

  const curves = useMemo(() => {
    if (!timeline || timeline.stops.length === 0) return null;
    const toVectors = (points: [number, number, number][]) => {
      const vectors = points.map((point) => new THREE.Vector3(...point));
      // A spline needs two points; a single keyframe is just a fixed camera.
      return vectors.length === 1 ? [vectors[0], vectors[0].clone()] : vectors;
    };
    return {
      position: new THREE.CatmullRomCurve3(toVectors(timeline.positions), false, "centripetal"),
      target: new THREE.CatmullRomCurve3(toVectors(timeline.targets), false, "centripetal"),
    };
  }, [timeline]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = local.current;
    const { reducedMotion } = useSite.getState();

    // --- scroll velocity → energy (0..1), quick to rise, slow to calm
    if (!s.started) s.lastScrollY = frame.scrollY;
    const velocity = Math.abs(frame.scrollY - s.lastScrollY) / Math.max(dt, 0.001);
    s.lastScrollY = frame.scrollY;
    const energyTarget = reducedMotion
      ? 0
      : Math.min(1, velocity / (state.size.height * 2.4));
    frame.energy = THREE.MathUtils.damp(
      frame.energy,
      energyTarget,
      energyTarget > frame.energy ? 5 : 2.2,
      dt,
    );

    // --- damped progress (no damping on the first frame or with reduced motion)
    frame.progress =
      reducedMotion || !s.started
        ? frame.target
        : THREE.MathUtils.damp(frame.progress, frame.target, PROGRESS_DAMPING, dt);
    s.started = true;

    if (!timeline || !curves) return;
    const camera = state.camera as THREE.PerspectiveCamera;
    const count = timeline.stops.length;

    let u: number;
    let fov: number;
    if (reducedMotion) {
      // Snap to the nearest keyframe instead of travelling.
      const index = nearestKeyframe(timeline, frame.progress);
      u = count > 1 ? index / (count - 1) : 0;
      fov = timeline.fovs[index];
    } else {
      u = cameraParam(timeline, frame.progress);
      const { index, local: t } = locate(timeline, frame.progress);
      const next = Math.min(index + 1, count - 1);
      fov = THREE.MathUtils.lerp(timeline.fovs[index], timeline.fovs[next], t);
    }

    curves.position.getPoint(u, scratchPosition);
    curves.target.getPoint(u, scratchTarget);

    // --- subtle depth parallax following the pointer
    const active = reducedMotion ? 0 : frame.pointerActive;
    s.parallaxX = THREE.MathUtils.damp(s.parallaxX, frame.pointerX * active, PARALLAX.damping, dt);
    s.parallaxY = THREE.MathUtils.damp(s.parallaxY, frame.pointerY * active, PARALLAX.damping, dt);

    camera.position.set(
      scratchPosition.x + s.parallaxX * PARALLAX.x,
      scratchPosition.y + s.parallaxY * PARALLAX.y,
      scratchPosition.z,
    );
    camera.lookAt(scratchTarget);
    if (Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, -1);

  return null;
}
