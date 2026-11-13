import {
  AUX_KIND,
  MAX_CLUSTERS,
  MAX_NODES,
  MAX_PROJECTS,
  MAX_STATIONS,
  MAX_STATS,
} from "@/lib/constants";
import { CLUSTER_PITCH } from "@/lib/clusterLayout";
import { STATION } from "@/lib/pipelinePath";
import { SURFACE_WAVE } from "@/components/sections/hero.config";
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
 *
 * Formations can also give each particle a behaviour (aFromAux / aToAux, see FormationData):
 *   - STATS columns rain in from above and stack, layer by layer, as uRise[column] runs 0 → 1
 *   - PIPELINE flow particles travel along the path texture (curve parameter + uTime)
 *   - PIPELINE station particles loop in the flow until uStation[i] assembles them into a ring
 *   - SURFACE burst particles wait inside the hero's bars and launch from their tops as the
 *     exit wave (uBurst) reaches their row
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
uniform float uGlow;
uniform float uDim;
uniform float uPointer;
uniform float uPointerRadius;
uniform vec3 uRayOrigin;
uniform vec3 uRayDir;

uniform highp sampler2D uPath;
uniform float uPathSamples;
uniform float uFlow;
uniform float uRise[${MAX_STATS}];
uniform float uStation[${MAX_STATIONS}];
uniform float uFocus[${MAX_PROJECTS}];
uniform vec3 uNode[${MAX_NODES}];
uniform float uClusterFocus[${MAX_CLUSTERS}];
uniform float uSpread[${MAX_CLUSTERS}];
uniform vec4 uClusterBox[${MAX_CLUSTERS}];
uniform vec4 uClusterHome;
uniform mat3 uClusterBasis;
uniform float uLift;
uniform float uBurst;
uniform mat4 uSurface;
uniform vec3 uSurfaceSize;

attribute vec3 aFrom;
attribute vec3 aTo;
attribute vec4 aFromAux;
attribute vec4 aToAux;
attribute vec4 aSeed;

varying float vAlpha;
varying float vAccent;
varying float vStretch;
varying vec2 vDir;

${curlNoiseGLSL}

// Point on the pipeline path (row 0 of uPath) plus its cross-section frame (row 1 = normal).
vec3 pathPoint(float t, out vec3 normal, out vec3 binormal) {
  float f = clamp(t, 0.0, 1.0) * (uPathSamples - 1.0);
  float i0 = min(floor(f), uPathSamples - 2.0);
  float fr = f - i0;
  int i = int(i0);
  vec3 p0 = texelFetch(uPath, ivec2(i, 0), 0).xyz;
  vec3 p1 = texelFetch(uPath, ivec2(i + 1, 0), 0).xyz;
  vec3 n0 = texelFetch(uPath, ivec2(i, 1), 0).xyz;
  vec3 n1 = texelFetch(uPath, ivec2(i + 1, 1), 0).xyz;
  normal = normalize(mix(n0, n1, fr));
  binormal = cross(normalize(p1 - p0), normal);
  return mix(p0, p1, fr);
}

// Where a particle of one formation actually is, given its behaviour (aux.w).
// fx.x = alpha multiplier, fx.y = brightness boost, fx.z = accent.
vec3 place(vec3 base, vec4 aux, out vec3 fx) {
  fx = vec3(1.0, 0.0, 0.0);
  float kind = aux.w;
  if (kind < 0.5) return base;

  if (kind > ${AUX_KIND.surfaceBurst - 0.5}) {
    // SURFACE burst: hidden in its bar until the exit wave reaches its row (aux.y, front to
    // back, the same wave the bars sink on), then thrown up out of the bar's top: fast out,
    // slow settle. Local grid units, through the surface's rest matrix.
    float launch = aux.y * ${SURFACE_WAVE.stagger.toFixed(3)};
    float t = clamp((uBurst - launch) / ${(SURFACE_WAVE.duration * 1.6).toFixed(3)}, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - t, 3.0);
    vec3 top = vec3(
      aux.x * uSurfaceSize.x,
      uSurfaceSize.z * (0.45 + 0.9 * fract(aux.z * 7.31)),
      (0.5 - aux.y) * uSurfaceSize.y
    );
    fx.x = smoothstep(0.0, 0.06, t);
    fx.y = 1.4 * (1.0 - e);
    fx.z = step(0.8, aux.z) * (1.0 - 0.6 * e);
    return (uSurface * vec4(top + base * e, 1.0)).xyz;
  }

  if (kind > ${AUX_KIND.horizon - 0.5}) {
    // HORIZON: a slow swell crossing the terrain. The calmest motion on the site.
    float swell = sin(base.x * 0.21 + uTime * 0.11) * cos(base.z * 0.17 - uTime * 0.08);
    return base + vec3(0.0, swell * 0.3, 0.0);
  }

  if (kind > ${AUX_KIND.podium - 0.5}) {
    // PODIUM: the steps are static; the numeral (aux.x = rise height, aux.y = random) rises
    // out of its step as uLift runs 0 → 1.
    if (kind < ${AUX_KIND.podiumNumeral - 0.5}) return base;
    float rise = smoothstep(aux.y * 0.35, aux.y * 0.35 + 0.65, uLift);
    fx.x = smoothstep(0.0, 0.4, rise);
    fx.y = 0.45 * rise;
    fx.z = rise * step(0.72, aux.y);
    return base - vec3(0.0, (1.0 - rise) * (1.0 - rise) * aux.x, 0.0);
  }

  if (kind > ${AUX_KIND.cluster - 0.5}) {
    // CLUSTERS: base is local to the cluster's shape. It turns slowly about its vertical
    // axis, tilts toward the viewer, and is placed in its box in front of the camera
    // (xyz = world centre, w = scale); uSpread slides it there out of the merged mass.
    int cluster = int(kind - ${AUX_KIND.cluster - 0.5});
    float own = uClusterFocus[cluster];
    float any = 0.0;
    for (int i = 0; i < ${MAX_CLUSTERS}; i++) any = max(any, uClusterFocus[i]);
    fx.x = mix(1.0, mix(0.4, 1.0, own), any);
    // The shapes are dense, so the lift is small: more would clip the nodes to white.
    fx.y = own * 0.22;
    fx.z = own * step(0.86, fract(dot(base, vec3(12.9898, 78.233, 37.719))));
    float yaw = 0.5 + 0.32 * sin(uTime * 0.17 + float(cluster) * 1.9);
    float cy = cos(yaw);
    float sy = sin(yaw);
    vec3 turned = vec3(base.x * cy + base.z * sy, base.y, base.z * cy - base.x * sy);
    vec3 shape = vec3(
      turned.x,
      turned.y * ${Math.cos(CLUSTER_PITCH).toFixed(5)} - turned.z * ${Math.sin(CLUSTER_PITCH).toFixed(5)},
      turned.y * ${Math.sin(CLUSTER_PITCH).toFixed(5)} + turned.z * ${Math.cos(CLUSTER_PITCH).toFixed(5)}
    );
    vec4 box = mix(uClusterHome, uClusterBox[cluster], uSpread[cluster]);
    return box.xyz + uClusterBasis * shape * box.w;
  }

  if (kind < ${AUX_KIND.flow - 0.5}) {
    // STATS column: this layer lands once the column's rise reaches its height.
    float rise = uRise[int(kind - ${AUX_KIND.statsColumn - 0.5})];
    float land = smoothstep(aux.x * 0.86, aux.x * 0.86 + 0.14, rise);
    fx.x = smoothstep(0.0, 0.3, land);
    return base + vec3(0.0, (1.0 - land * land) * (4.0 + 7.0 * aux.y), 0.0);
  }

  if (kind > ${AUX_KIND.graphNode - 0.5}) {
    // GRAPH: own = focus of the projects this particle belongs to, any = is anything focused.
    float own = 0.0;
    float any = 0.0;
    for (int i = 0; i < ${MAX_PROJECTS}; i++) {
      float bit = mod(floor(aux.x / exp2(float(i))), 2.0);
      own = max(own, bit * uFocus[i]);
      any = max(any, uFocus[i]);
    }
    vec3 pos = base;
    float edge = step(${AUX_KIND.graphEdge - 0.5}, kind);
    if (edge > 0.5) {
      // Drift from the project end to the tech end, keeping the particle's scatter.
      vec3 a = uNode[int(mod(aux.z, 16.0) + 0.5)];
      vec3 b = uNode[int(floor(aux.z / 16.0) + 0.5)];
      float t = fract(aux.y + uTime * uFlow * (1.4 + 2.2 * fract(aux.y * 17.3)));
      pos = mix(a, b, t) + (base - mix(a, b, aux.y));
      fx.x = smoothstep(0.0, 0.07, t) * (1.0 - smoothstep(0.93, 1.0, t));
    }
    // Focused: this project's parts brighten, everything else falls back.
    fx.x *= mix(1.0, mix(0.16, 1.0, own), any);
    fx.y = own * mix(0.4, 0.0, edge);
    // Accent, kept sparing: most of a lit edge or tech node, a sprinkle of the project node.
    float sprinkle = step(mix(0.9, 0.4, aux.z), fract(aux.y * 31.0));
    fx.z = own * mix(sprinkle, 0.7, edge);
    return pos;
  }

  // PIPELINE: flow along the path. A few faster, brighter particles read as data packets.
  float h = fract(aux.y * 7.31 + aux.z * 91.7);
  float packet = step(0.93, h);
  float speed = uFlow * (0.55 + 0.9 * h) * (1.0 + 1.6 * packet);
  float station = kind - ${AUX_KIND.station.toFixed(1)};
  float t;
  float fade;
  if (station < -0.5) {
    t = fract(aux.x + uTime * speed);
    fade = smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.96, 1.0, t));
  } else {
    // Station particles circulate just upstream of their station until it assembles.
    float loop = fract(h * 13.0 + uTime * speed * 5.0);
    t = aux.x + loop * ${STATION.loopSpan.toFixed(3)};
    fade = smoothstep(0.0, 0.15, loop) * (1.0 - smoothstep(0.85, 1.0, loop));
  }
  vec3 normal;
  vec3 binormal;
  vec3 flowPos = pathPoint(t, normal, binormal);
  flowPos += (cos(aux.y) * normal + sin(aux.y) * binormal) * aux.z;
  fx.x = fade;
  fx.y = packet * 0.9;
  if (station < -0.5) return flowPos;

  float level = uStation[int(station + 0.5)];
  float a = smoothstep(h * 0.5, h * 0.5 + 0.5, level);
  fx.x = mix(fade, 1.0, a);
  fx.y = mix(fx.y, 1.0, a);
  fx.z = a * step(0.8, fract(h * 29.0));
  return mix(flowPos, base, a);
}

void main() {
  // --- formation morph, staggered per particle
  float delay = aSeed.w * 0.45;
  float p = smoothstep(delay, delay + 0.55, uProgress);
  vec3 fxFrom;
  vec3 fxTo;
  vec3 fromPos = place(aFrom, aFromAux, fxFrom);
  vec3 toPos = place(aTo, aToAux, fxTo);
  vec3 pos = mix(fromPos, toPos, p);
  vec3 fx = mix(fxFrom, fxTo, p);
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
  // Cluster shapes sit close to text, so the pointer only ruffles them.
  float clustered = mix(
    step(${AUX_KIND.cluster - 0.5}, aFromAux.w) * step(aFromAux.w, ${AUX_KIND.podium - 0.5}),
    step(${AUX_KIND.cluster - 0.5}, aToAux.w) * step(aToAux.w, ${AUX_KIND.podium - 0.5}),
    p
  );
  push *= 1.0 - 0.7 * clustered;
  pos += (radial / max(dist, 0.0001)) * push * 0.55 + flow * push * 0.08;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;

  // --- size attenuation
  vAccent = max(step(0.94, aSeed.x), fx.z);
  float variation = mix(0.7, 1.45, fract(aSeed.y * 13.7));
  float restSize = uSize * variation * (1.0 + 0.35 * vAccent) * uScale / max(depth, 0.05);
  float size = restSize * (1.0 + 0.3 * fx.y);
  size *= 1.0 + uEnergy * 0.9;
  // The glow sprite (uGlow) spends its extra size on the halo; the core stays as large.
  float clamped = clamp(size * (1.0 + 0.7 * uGlow), 1.0, uMaxSize);
  gl_PointSize = clamped;

  // --- alpha: low for most, brighter accent; fades right at the camera and far away
  float base = mix(mix(0.16, 0.42, aSeed.y), 0.9, vAccent);
  // Inside ~1.5 units of the lens a particle is gone, so nothing passes the camera as a big
  // blurry disc; one whose resting size runs into the cap (it is that close) fades out
  // instead of flattening into a disc. Resting size: scroll energy must not trigger it.
  float nearFade = smoothstep(1.5, 5.0, depth) * (1.0 - smoothstep(0.6 * uMaxSize, uMaxSize, restSize));
  float farFade = 1.0 - smoothstep(22.0, 46.0, depth);
  // Sub-pixel points keep their energy instead of popping to a full pixel.
  float coverage = clamp(size, 0.35, 1.0);
  vAlpha = base * nearFade * farFade * coverage * mix(1.0, 0.4, uDim);
  vAlpha = min(1.0, vAlpha * fx.x * (1.0 + 0.9 * fx.y));

  // Screen-space direction away from the centre = apparent motion while the camera travels.
  vec2 ndc = gl_Position.xy / max(gl_Position.w, 0.0001);
  vDir = normalize(ndc + vec2(0.0001, 0.0));
  vStretch = uEnergy;
}
`;

export const particleFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uGlow;

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
  float disc = 1.0 - smoothstep(0.2, 1.0, d);
  // Glow without postprocessing (screens without bloom): a bright core about the size of the
  // plain disc (the sprite is 1.7× larger) and a soft radial halo. Additive blending does the
  // rest where particles overlap.
  float core = 1.0 - smoothstep(0.05, 0.5, d);
  float halo = exp(-d * d * 5.0) * (1.0 - smoothstep(0.7, 1.0, d));
  float alpha = mix(disc, core + 0.32 * halo, uGlow) * vAlpha;
  if (alpha < 0.003) discard;

  gl_FragColor = vec4(mix(uColor, uAccent, vAccent), alpha);
  #include <colorspace_fragment>
}
`;
