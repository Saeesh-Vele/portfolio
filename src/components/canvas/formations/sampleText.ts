const FONT_PX = 220;
const LINE_HEIGHT = 0.9;
export const SAMPLE_STEP = 2;

/**
 * Rasterises text in the display font on an offscreen canvas and returns the lit pixels plus
 * their bounds. Used by formations that draw glyphs in particles (the PODIUM numeral).
 */
export function sampleText(lines: string[], fontFamily: string) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const font = `800 ${FONT_PX}px ${fontFamily}`;
  const spacing = `${-0.04 * FONT_PX}px`;
  const applyStyle = () => {
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    if ("letterSpacing" in ctx) ctx.letterSpacing = spacing;
  };

  applyStyle();
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const pad = FONT_PX * 0.25;
  canvas.width = Math.ceil(widest + pad * 2);
  canvas.height = Math.ceil(lines.length * FONT_PX * LINE_HEIGHT + pad * 2);
  // Resizing a canvas resets its context state.
  applyStyle();
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, pad + (i + 0.5) * FONT_PX * LINE_HEIGHT);
  });

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const xs: number[] = [];
  const ys: number[] = [];
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  for (let y = 0; y < height; y += SAMPLE_STEP) {
    for (let x = 0; x < width; x += SAMPLE_STEP) {
      if (data[(y * width + x) * 4 + 3] > 128) {
        xs.push(x);
        ys.push(y);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (xs.length === 0) return null;
  return { xs, ys, minX, maxX, minY, maxY };
}
