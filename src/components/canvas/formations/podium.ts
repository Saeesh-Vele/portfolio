import { recognition } from "@/content/content";
import { AUX_KIND } from "@/lib/constants";
import { mulberry32 } from "@/lib/device";
import { PODIUM_VIEW } from "@/lib/phase4Layout";
import type { Formation } from "./index";
import { sampleText } from "./name";

const STEP_SHARE = 0.46;
const NUMERAL_SHARE = 0.26;
/** World height of one stacked layer of points, as in the STATS columns. */
const LAYER = 0.085;

function gaussian(rand: () => number) {
  const u = Math.max(rand(), 1e-6);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/**
 * PODIUM — a three-step podium of layered point-cloud blocks (2nd · 1st · 3rd, left to
 * right) and a large numeral sampled from the display font standing on the third step. The
 * numeral's particles carry how far they rise; the shader lifts them out of the step as the
 * section scrolls in (`uLift`).
 */
export const podium: Formation = (count, viewport) => {
  const positions = new Float32Array(count * 3);
  const aux = new Float32Array(count * 4);
  const rand = mulberry32(0x5eed07);
  const [bx, by, bz] = PODIUM_VIEW.base;
  const step = PODIUM_VIEW.step;
  // Left to right: 2nd, 1st, 3rd.
  const steps = [
    { x: -step, height: PODIUM_VIEW.heights[1] },
    { x: 0, height: PODIUM_VIEW.heights[0] },
    { x: step, height: PODIUM_VIEW.heights[2] },
  ];
  const third = steps[2];

  const sample =
    typeof document === "undefined" ? null : sampleText([recognition.place], viewport.fontFamily);
  const stepCount = Math.floor(count * STEP_SHARE);
  const numeralCount = sample ? Math.floor(count * NUMERAL_SHARE) : 0;

  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    let z: number;

    if (i < stepCount) {
      const block = steps[i % steps.length];
      const layers = Math.max(4, Math.round(block.height / LAYER));
      const layer = Math.floor(rand() * layers);
      let u = rand();
      let v = rand();
      const face = rand();
      if (face < 0.55) {
        const side = Math.floor(rand() * 4);
        if (side === 0) u = 0;
        else if (side === 1) u = 1;
        else if (side === 2) v = 0;
        else v = 1;
      }
      x = bx + block.x + (u - 0.5) * step * 0.96;
      // A share of points caps the block so its top reads as a surface to stand on.
      y = face > 0.88 ? by + block.height : by + ((layer + 0.5) / layers) * block.height;
      z = bz + (v - 0.5) * step;
      aux[i * 4 + 3] = AUX_KIND.podium;
    } else if (sample && i < stepCount + numeralCount) {
      const k = Math.floor(rand() * sample.xs.length);
      const glyphHeight = sample.maxY - sample.minY || 1;
      const scale = PODIUM_VIEW.numeralHeight / glyphHeight;
      const centerX = (sample.minX + sample.maxX) / 2;
      x = bx + third.x + (sample.xs[k] + rand() * 2 - centerX) * scale;
      y = by + third.height + 0.12 + (sample.maxY - sample.ys[k] - rand() * 2) * scale;
      z = bz + gaussian(rand) * 0.1;
      aux[i * 4] = PODIUM_VIEW.numeralHeight + 0.6;
      aux[i * 4 + 1] = rand();
      aux[i * 4 + 3] = AUX_KIND.podiumNumeral;
    } else {
      // Floor grid under the podium, then ambient dust.
      if (rand() < 0.3) {
        const grid = 0.6;
        // Kept under and to the right of the podium: the text sits to its left on desktop.
        x = bx + Math.round((rand() * 13 - 4) / grid) * grid;
        y = by;
        z = bz + 3 - Math.round((rand() * 16) / grid) * grid;
      } else {
        x = bx + (rand() * 2 - 1) * (viewport.isMobile ? 8 : 16);
        y = by + rand() * 12 - 2;
        z = bz - 2 - rand() * 22;
      }
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return { positions, aux };
};
