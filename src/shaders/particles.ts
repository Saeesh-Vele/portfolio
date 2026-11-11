import { curlNoiseGLSL } from "@/shaders/noise";

/**
 * Particle field shader.
 *
 * Each particle morphs between two formation targets (aFrom → aTo) by uProgress, with a
 * per-particle delay so a morph reads as a wave, not a cross-fade. On top of that:
 *   - uIntro    0 → 1 once on load: particles fall in from a scattered noise cloud
 *   - curl-noise drift, strongest mid-morph and while scrolling (uEnergy), calm at rest
 *   - pointer repulsion around the pointer ray (scatter-and-heal)
 *   - size + alpha falloff by depth so particles can fly past the camera
 */
export const particleVertex = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform float uIntro;
uniform float uEnergy;
uniform float uDrift;
uniform float uSize;
uniform float uScale;
uniform float uMaxSize;
uniform float uDim;
uniform float uPointer;
uniform float uPointerRadius;
uniform vec3 uRayOrigin;
uniform vec3 uRayDir;

attribute vec3 aFrom;
attribute vec3 aTo;
attribute vec4 aSeed;

varying float vAlpha;
varying float vAccent;
varying float vStretch;
varying vec2 vDir;

${curlNoiseGLSL}

void main() {
  // --- formation morph, staggered per particle
  float delay = aSeed.w * 0.45;
  float p = smoothstep(delay, delay + 0.55, uProgress);
  vec3 pos = mix(aFrom, aTo, p);
  float mid = sin(p * 3.14159265);

  // --- intro: assemble out of raw noise
  vec3 scatterSeed = fract(aSeed.xyz * vec3(7.13, 11.71, 5.31) + aSeed.w);
  vec3 scatter = (scatterSeed - 0.5) * vec3(30.0, 18.0, 26.0) + vec3(0.0, 0.0, -5.0);
  float introDelay = aSeed.z * 0.45;
  float ip = smoothstep(introDelay, introDelay + 0.55, uIntro);
  ip = 1.0 - pow(1.0 - ip, 3.0);
  pos += scatter * (1.0 - ip);

  // --- curl-noise drift: calm at rest, peaks between sections and with scroll energy
  vec3 flow = curlNoise(pos * 0.32 + vec3(0.0, 0.0, uTime * 0.05) + aSeed.xyz * 0.15);
  float amplitude = uDrift * (0.009 + 0.22 * mid + 0.12 * (1.0 - ip)) + uEnergy * 0.07;
  pos += flow * amplitude;

  // --- pointer repulsion, measured from the pointer ray so it works at any depth
  vec3 toPoint = pos - uRayOrigin;
  vec3 radial = toPoint - uRayDir * dot(toPoint, uRayDir);
  float dist = length(radial);
  float push = (1.0 - smoothstep(0.0, uPointerRadius, dist)) * uPointer;
  pos += (radial / max(dist, 0.0001)) * push * 0.55 + flow * push * 0.08;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;

  // --- size attenuation
  vAccent = step(0.94, aSeed.x);
  float variation = mix(0.7, 1.45, fract(aSeed.y * 13.7));
  float size = uSize * variation * (1.0 + 0.35 * vAccent) * uScale / max(depth, 0.05);
  size *= 1.0 + uEnergy * 0.9;
  float clamped = clamp(size, 1.0, uMaxSize);
  gl_PointSize = clamped;

  // --- alpha: low for most, brighter accent; fades right at the camera and far away
  float base = mix(mix(0.16, 0.42, aSeed.y), 0.9, vAccent);
  float nearFade = smoothstep(0.4, 4.5, depth);
  float farFade = 1.0 - smoothstep(22.0, 46.0, depth);
  // Sub-pixel points keep their energy instead of popping to a full pixel.
  float coverage = clamp(size, 0.35, 1.0);
  vAlpha = base * nearFade * farFade * coverage * mix(1.0, 0.4, uDim);

  // Screen-space direction away from the centre = apparent motion while the camera travels.
  vec2 ndc = gl_Position.xy / max(gl_Position.w, 0.0001);
  vDir = normalize(ndc + vec2(0.0001, 0.0));
  vStretch = uEnergy;
}
`;

export const particleFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uAccent;

varying float vAlpha;
varying float vAccent;
varying float vStretch;
varying vec2 vDir;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  uv.y = -uv.y;

  // Squash the sprite across the motion direction so it reads as stretched along it.
  vec2 q = vec2(dot(uv, vDir), dot(uv, vec2(-vDir.y, vDir.x)));
  q.y *= 1.0 + vStretch * 1.6;

  float d = length(q) * 2.0;
  float alpha = (1.0 - smoothstep(0.2, 1.0, d)) * vAlpha;
  if (alpha < 0.003) discard;

  gl_FragColor = vec4(mix(uColor, uAccent, vAccent), alpha);
  #include <colorspace_fragment>
}
`;
