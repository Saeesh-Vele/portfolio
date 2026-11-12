import type { RefObject } from "react";
import gsap from "gsap";
import { MOBILE_BREAKPOINT } from "@/lib/constants";
import { frame } from "@/store/site";

/** How fast (1/s) the shift follows a change in the sheet's height. */
const RATE = 6;

/**
 * Portrait framing for a pinned chapter with a bottom sheet (Experience, Work). Returns a
 * ticker callback that writes `frame.viewShift[key]`: the vertical image shift (px) that
 * moves the camera's subject — which the mobile keyframes aim at dead centre — to the
 * centre of the visible scene area, between the HUD row (`top`) and the sheet's content
 * (`sheet`). Measured from the DOM every frame, so it holds at any viewport height (the iOS
 * address bar) and for sheets of any length. Desktop and an empty sheet: no shift.
 */
export function sheetShift(
  key: string,
  top: RefObject<HTMLElement | null>,
  sheet: RefObject<HTMLElement | null>,
  showing: RefObject<boolean>,
) {
  let shift = 0;
  return () => {
    const hud = top.current;
    const body = sheet.current;
    const section = body?.closest("section");
    let target = 0;
    if (hud && body && section && showing.current && window.innerWidth < MOBILE_BREAKPOINT) {
      const height = window.innerHeight;
      const stage = section.getBoundingClientRect();
      // Eases out as the stage scrolls away, so the next formation arrives unshifted.
      const weight = Math.min(1, Math.max(0, (stage.bottom - height * 0.5) / (height * 0.5)));
      if (weight > 0 && stage.top < height) {
        const sceneTop = hud.getBoundingClientRect().bottom;
        const sceneBottom = body.getBoundingClientRect().top;
        target = (height / 2 - (sceneTop + sceneBottom) / 2) * weight;
      }
    }
    const dt = gsap.ticker.deltaRatio(60) / 60;
    shift += (target - shift) * (1 - Math.exp(-RATE * dt));
    if (Math.abs(shift - target) < 0.05) shift = target;
    frame.viewShift[key] = shift;
  };
}
