/** Glyphs a scrambling character cycles through: the readout alphabet plus a few marks. */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#_<>=+";
/** How often a still-scrambling character picks a new glyph. */
const SWAP_MS = 45;

export interface ScrambleOptions {
  /** Total time until the last character has resolved. */
  duration?: number;
}

/**
 * Mono character scramble: every character of `to` starts as a random glyph and resolves
 * left to right. Spaces stay spaces so the word shapes read immediately. Returns a cancel
 * function; cancelling leaves the element showing `to`.
 */
export function scramble(element: HTMLElement, to: string, { duration = 420 }: ScrambleOptions = {}) {
  const start = performance.now();
  const length = to.length;
  let raf = 0;
  let lastSwap = -Infinity;
  const current = Array.from(to, (char) => (char === " " ? " " : GLYPHS[0]));

  const tick = (now: number) => {
    const t = now - start;
    const swap = now - lastSwap >= SWAP_MS;
    if (swap) lastSwap = now;
    let done = true;
    for (let i = 0; i < length; i++) {
      // The first 30% is pure scramble; then characters lock in, left to right.
      const resolveAt = duration * (0.3 + 0.7 * ((i + 1) / length));
      if (t >= resolveAt || to[i] === " ") {
        current[i] = to[i];
      } else {
        done = false;
        if (swap) current[i] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
    }
    element.textContent = current.join("");
    if (!done) raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    element.textContent = to;
  };
}
