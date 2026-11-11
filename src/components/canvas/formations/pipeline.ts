import { experienceChronological } from "@/content/content";
import { AUX_KIND } from "@/lib/constants";
import { mulberry32 } from "@/lib/device";
import { pathFrame, pipelinePath, STATION, stationU, TUBE_RADIUS } from "@/lib/pipelinePath";
import type { Formation } from "./index";

/** Share of particles per station ring; then the flow; the rest is ambient dust. */
const STATION_SHARE = 0.034;
const FLOW_SHARE = 0.6;

function gaussian(rand: () => number) {
  const u = Math.max(rand(), 1e-6);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/**
 * PIPELINE — particles fill a tube around the experience path and flow along it; the shader
 * moves them (curve parameter + time), so the positions written here are only the rest pose.
 * Each station is a reticle of rings around the path: its particles circulate in the flow
 * just upstream until the camera approaches, then assemble (`uStation`).
 */
export const pipeline: Formation = (count, viewport) => {
  const positions = new Float32Array(count * 3);
  const aux = new Float32Array(count * 4);
  const rand = mulberry32(0x5eed04);

  const path = pipelinePath(viewport.isMobile);
  const stations = experienceChronological.length;
  const perStation = Math.floor(count * STATION_SHARE);
  const stationCount = perStation * stations;
  const flowCount = Math.floor(count * FLOW_SHARE);

  const write = (i: number, x: number, y: number, z: number) => {
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  };

  for (let i = 0; i < count; i++) {
    if (i < stationCount) {
      const station = i % stations;
      const u = stationU(station, stations);
      const frame = pathFrame(path, u);

      // Reticle: a solid main ring, a dashed inner ring, and short outer tick marks.
      const pick = rand();
      let angle = rand() * Math.PI * 2;
      let radius: number;
      let along = gaussian(rand) * 0.02;
      if (pick < 0.56) {
        radius = STATION.radius + gaussian(rand) * 0.012;
      } else if (pick < 0.8) {
        const dashes = 18;
        angle = ((Math.floor(rand() * dashes) + rand() * 0.55) / dashes) * Math.PI * 2;
        radius = STATION.radius * 0.66 + gaussian(rand) * 0.008;
      } else {
        const ticks = 12;
        angle = (Math.floor(rand() * ticks) / ticks) * Math.PI * 2 + gaussian(rand) * 0.004;
        radius = STATION.radius * (1.1 + rand() * 0.16);
        along = gaussian(rand) * 0.01;
      }
      const c = Math.cos(angle) * radius;
      const s = Math.sin(angle) * radius;
      write(
        i,
        frame.position[0] + frame.normal[0] * c + frame.binormal[0] * s + frame.tangent[0] * along,
        frame.position[1] + frame.normal[1] * c + frame.binormal[1] * s + frame.tangent[1] * along,
        frame.position[2] + frame.normal[2] * c + frame.binormal[2] * s + frame.tangent[2] * along,
      );

      aux[i * 4] = u - STATION.loopBefore;
      aux[i * 4 + 1] = rand() * Math.PI * 2;
      aux[i * 4 + 2] = TUBE_RADIUS * Math.sqrt(rand());
      aux[i * 4 + 3] = AUX_KIND.station + station;
    } else if (i < stationCount + flowCount) {
      const u = rand();
      const angle = rand() * Math.PI * 2;
      // Half on the tube wall, half filling it.
      const radius =
        rand() < 0.5 ? TUBE_RADIUS * (1 + gaussian(rand) * 0.04) : TUBE_RADIUS * Math.sqrt(rand());
      const frame = pathFrame(path, u);
      const c = Math.cos(angle) * radius;
      const s = Math.sin(angle) * radius;
      write(
        i,
        frame.position[0] + frame.normal[0] * c + frame.binormal[0] * s,
        frame.position[1] + frame.normal[1] * c + frame.binormal[1] * s,
        frame.position[2] + frame.normal[2] * c + frame.binormal[2] * s,
      );

      aux[i * 4] = u;
      aux[i * 4 + 1] = angle;
      aux[i * 4 + 2] = radius;
      aux[i * 4 + 3] = AUX_KIND.flow;
    } else {
      // Ambient dust loosely surrounding the path, clear of the tube itself.
      const frame = pathFrame(path, rand() * 1.1 - 0.05);
      const angle = rand() * Math.PI * 2;
      const radius = 2.2 + Math.abs(gaussian(rand)) * 5;
      write(
        i,
        frame.position[0] + Math.cos(angle) * radius * 1.3,
        frame.position[1] + Math.sin(angle) * radius * 0.8,
        frame.position[2] + gaussian(rand) * 3,
      );
    }
  }

  return { positions, aux };
};
