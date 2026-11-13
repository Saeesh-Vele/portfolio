/**
 * 2D simplex noise (Gustavson / Perlin's simplex construction), deterministic for a seed.
 * Returns roughly -1..1. Small and allocation-free: it runs a few hundred times per frame
 * for the hero's DATA SURFACE.
 */
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 0, 1, 0, -1];

export function createSimplex2D(seed = 1) {
  const perm = new Uint8Array(512);
  const source = new Uint8Array(256);
  for (let i = 0; i < 256; i++) source[i] = i;
  let s = seed >>> 0 || 1;
  for (let i = 255; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = source[i];
    source[i] = source[j];
    source[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = source[i & 255];

  const corner = (gi: number, x: number, y: number) => {
    let t = 0.5 - x * x - y * y;
    if (t < 0) return 0;
    t *= t;
    const g = (gi & 7) * 2;
    return t * t * (GRAD[g] * x + GRAD[g + 1] * y);
  };

  return (xin: number, yin: number) => {
    const skew = (xin + yin) * F2;
    const i = Math.floor(xin + skew);
    const j = Math.floor(yin + skew);
    const unskew = (i + j) * G2;
    const x0 = xin - (i - unskew);
    const y0 = yin - (j - unskew);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = 1 - i1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    return (
      70 *
      (corner(perm[ii + perm[jj]], x0, y0) +
        corner(perm[ii + i1 + perm[jj + j1]], x1, y1) +
        corner(perm[ii + 1 + perm[jj + 1]], x2, y2))
    );
  };
}
