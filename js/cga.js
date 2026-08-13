/** CGA SCREEN 1, palette 1 (COLOR 8,1) — cyan / magenta / white */
export const W = 320;
export const H = 200;

export const PALETTE = [
  0x000000ff, // 0 background (road)
  0x55ffffff, // 1 cyan
  0xff55ffff, // 2 magenta
  0xffffffff, // 3 white
];

/** CSS hex for DOM/canvas fillStyle convenience */
export const PALETTE_CSS = ["#000000", "#55ffff", "#ff55ff", "#ffffff"];

export function createBuffer() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

export function clear(ctx, color = 0) {
  ctx.fillStyle = PALETTE_CSS[color];
  ctx.fillRect(0, 0, W, H);
}

export function setPixel(ctx, x, y, color) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  ctx.fillStyle = PALETTE_CSS[color & 3];
  ctx.fillRect(x | 0, y | 0, 1, 1);
}

export function getPixelIndex(imageData, x, y) {
  if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) return -1;
  const i = (y * imageData.width + x) * 4;
  const r = imageData.data[i];
  const g = imageData.data[i + 1];
  const b = imageData.data[i + 2];
  const a = imageData.data[i + 3];
  if (a < 128) return -1;
  // Match nearest CGA color
  let best = 0;
  let bestD = Infinity;
  for (let c = 0; c < 4; c++) {
    const p = PALETTE[c];
    const pr = (p >>> 24) & 255;
    const pg = (p >>> 16) & 255;
    const pb = (p >>> 8) & 255;
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/**
 * Scale logical 320×200 onto the display.
 * Desktop: integer nearest-neighbor scale.
 * Mobile: fill viewport width (fractional scale OK; CSS keeps pixels crisp).
 */
export function fitStage(displayCanvas, stageEl) {
  const narrow = window.matchMedia("(max-width: 720px)").matches;
  // Side borders are 2px each; on mobile we drop them for edge-to-edge.
  const frameX = narrow ? 0 : 4;
  const padX = narrow ? 0 : 48;
  // Header, hints, about peek — leave room so the canvas is the hero
  const padY = narrow
    ? Math.min(200, Math.max(100, window.innerHeight * 0.22))
    : Math.min(280, Math.max(160, window.innerHeight * 0.28));
  const maxW = Math.max(W, window.innerWidth - padX - frameX);
  const maxH = Math.max(H, window.innerHeight - padY);
  let scale = Math.min(maxW / W, maxH / H);
  if (!narrow) {
    scale = Math.floor(scale);
    if (scale < 1) scale = 1;
  } else if (scale < 0.5) {
    scale = 0.5;
  }
  const cssW = Math.round(W * scale);
  const cssH = Math.round(H * scale);
  displayCanvas.style.width = `${cssW}px`;
  displayCanvas.style.height = `${cssH}px`;
  stageEl.style.width = `${cssW}px`;
  return scale;
}

export function blit(bufferCanvas, displayCtx) {
  displayCtx.imageSmoothingEnabled = false;
  displayCtx.clearRect(0, 0, displayCtx.canvas.width, displayCtx.canvas.height);
  displayCtx.drawImage(bufferCanvas, 0, 0);
}

/** 8x8 bitmap font for SCREEN 1 LOCATE text (subset) */
const FONT = {
  " ": [0, 0, 0, 0, 0, 0, 0, 0],
  "!": [0x18, 0x18, 0x18, 0x18, 0x18, 0, 0x18, 0],
  '"': [0x6c, 0x6c, 0x24, 0, 0, 0, 0, 0],
  "#": [0x6c, 0xfe, 0x6c, 0x6c, 0xfe, 0x6c, 0, 0],
  "'": [0x18, 0x18, 0x10, 0, 0, 0, 0, 0],
  "(": [0x0c, 0x18, 0x30, 0x30, 0x30, 0x18, 0x0c, 0],
  ")": [0x30, 0x18, 0x0c, 0x0c, 0x0c, 0x18, 0x30, 0],
  "+": [0, 0x18, 0x18, 0x7e, 0x18, 0x18, 0, 0],
  ",": [0, 0, 0, 0, 0, 0x18, 0x18, 0x30],
  "-": [0, 0, 0, 0x7e, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x18, 0x18, 0],
  "/": [0x06, 0x0c, 0x18, 0x30, 0x60, 0xc0, 0x80, 0],
  "0": [0x3c, 0x66, 0x6e, 0x76, 0x66, 0x66, 0x3c, 0],
  "1": [0x18, 0x38, 0x18, 0x18, 0x18, 0x18, 0x7e, 0],
  "2": [0x3c, 0x66, 0x06, 0x0c, 0x18, 0x30, 0x7e, 0],
  "3": [0x3c, 0x66, 0x06, 0x1c, 0x06, 0x66, 0x3c, 0],
  "4": [0x0c, 0x1c, 0x3c, 0x6c, 0x7e, 0x0c, 0x0c, 0],
  "5": [0x7e, 0x60, 0x7c, 0x06, 0x06, 0x66, 0x3c, 0],
  "6": [0x1c, 0x30, 0x60, 0x7c, 0x66, 0x66, 0x3c, 0],
  "7": [0x7e, 0x06, 0x0c, 0x18, 0x30, 0x30, 0x30, 0],
  "8": [0x3c, 0x66, 0x66, 0x3c, 0x66, 0x66, 0x3c, 0],
  "9": [0x3c, 0x66, 0x66, 0x3e, 0x06, 0x0c, 0x38, 0],
  ":": [0, 0x18, 0x18, 0, 0, 0x18, 0x18, 0],
  ";": [0, 0x18, 0x18, 0, 0, 0x18, 0x18, 0x30],
  "=": [0, 0, 0x7e, 0, 0x7e, 0, 0, 0],
  "?": [0x3c, 0x66, 0x06, 0x0c, 0x18, 0, 0x18, 0],
  A: [0x18, 0x3c, 0x66, 0x66, 0x7e, 0x66, 0x66, 0],
  B: [0x7c, 0x66, 0x66, 0x7c, 0x66, 0x66, 0x7c, 0],
  C: [0x3c, 0x66, 0x60, 0x60, 0x60, 0x66, 0x3c, 0],
  D: [0x78, 0x6c, 0x66, 0x66, 0x66, 0x6c, 0x78, 0],
  E: [0x7e, 0x60, 0x60, 0x7c, 0x60, 0x60, 0x7e, 0],
  F: [0x7e, 0x60, 0x60, 0x7c, 0x60, 0x60, 0x60, 0],
  G: [0x3c, 0x66, 0x60, 0x6e, 0x66, 0x66, 0x3c, 0],
  H: [0x66, 0x66, 0x66, 0x7e, 0x66, 0x66, 0x66, 0],
  I: [0x7e, 0x18, 0x18, 0x18, 0x18, 0x18, 0x7e, 0],
  J: [0x3e, 0x0c, 0x0c, 0x0c, 0x0c, 0x6c, 0x38, 0],
  K: [0x66, 0x6c, 0x78, 0x70, 0x78, 0x6c, 0x66, 0],
  L: [0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x7e, 0],
  M: [0x63, 0x77, 0x7f, 0x6b, 0x63, 0x63, 0x63, 0],
  N: [0x66, 0x76, 0x7e, 0x7e, 0x6e, 0x66, 0x66, 0],
  O: [0x3c, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3c, 0],
  P: [0x7c, 0x66, 0x66, 0x7c, 0x60, 0x60, 0x60, 0],
  Q: [0x3c, 0x66, 0x66, 0x66, 0x6a, 0x6c, 0x36, 0],
  R: [0x7c, 0x66, 0x66, 0x7c, 0x78, 0x6c, 0x66, 0],
  S: [0x3c, 0x66, 0x60, 0x3c, 0x06, 0x66, 0x3c, 0],
  T: [0x7e, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0],
  U: [0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3c, 0],
  V: [0x66, 0x66, 0x66, 0x66, 0x66, 0x3c, 0x18, 0],
  W: [0x63, 0x63, 0x63, 0x6b, 0x7f, 0x77, 0x63, 0],
  X: [0x66, 0x66, 0x3c, 0x18, 0x3c, 0x66, 0x66, 0],
  Y: [0x66, 0x66, 0x66, 0x3c, 0x18, 0x18, 0x18, 0],
  Z: [0x7e, 0x06, 0x0c, 0x18, 0x30, 0x60, 0x7e, 0],
};

/** LOCATE row,col (1-based) then PRINT — SCREEN 1 cells are 8×8 */
export function locatePrint(ctx, row, col, text, color = 3) {
  const x0 = (col - 1) * 8;
  const y0 = (row - 1) * 8;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i].toUpperCase();
    const glyph = FONT[ch] || FONT["?"];
    for (let y = 0; y < 8; y++) {
      const bits = glyph[y];
      for (let x = 0; x < 8; x++) {
        if (bits & (0x80 >> x)) {
          setPixel(ctx, x0 + i * 8 + x, y0 + y, color);
        }
      }
    }
  }
}

export function fillRect(ctx, x1, y1, x2, y2, color, filled = true) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const w = Math.abs(x2 - x1) + (filled ? 1 : 0);
  const h = Math.abs(y2 - y1) + (filled ? 1 : 0);
  ctx.fillStyle = PALETTE_CSS[color & 3];
  if (filled) {
    ctx.fillRect(left, top, w, h);
  } else {
    ctx.fillRect(left, top, w, 1);
    ctx.fillRect(left, top + h - 1, w, 1);
    ctx.fillRect(left, top, 1, h);
    ctx.fillRect(left + w - 1, top, 1, h);
  }
}
