import { PALETTE_CSS, setPixel, getPixelIndex } from "./cga.js";

/**
 * Minimal GW-BASIC DRAW interpreter (subset used by DONKEY.BAS).
 * Scale Sn: unit = n/4 pixels (S8 → 2px).
 */
export function drawCommands(ctx, commands, { x = 0, y = 0, color = 3, scale = 4 } = {}) {
  let cx = x;
  let cy = y;
  let col = color;
  let sc = scale;

  const unit = () => sc / 4;

  function plotLine(x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let px = x0;
    let py = y0;
    for (;;) {
      setPixel(ctx, Math.round(px), Math.round(py), col);
      if (Math.round(px) === Math.round(x1) && Math.round(py) === Math.round(y1)) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        px += sx;
      }
      if (e2 < dx) {
        err += dx;
        py += sy;
      }
    }
  }

  function move(dx, dy, draw, noUpdate) {
    const u = unit();
    const nx = cx + dx * u;
    const ny = cy + dy * u;
    if (draw) plotLine(cx, cy, nx, ny);
    if (!noUpdate) {
      cx = nx;
      cy = ny;
    }
  }

  for (const cmd of commands) {
    let i = 0;
    const s = cmd.replace(/\s+/g, "");
    while (i < s.length) {
      let noUpdate = false;
      if (s[i] === "N" || s[i] === "n") {
        noUpdate = true;
        i++;
      }
      let blank = false;
      if (s[i] === "B" || s[i] === "b") {
        blank = true;
        i++;
      }

      const ch = s[i];
      if (!ch) break;
      i++;

      if (ch === "C" || ch === "c") {
        const m = /^(\d+)/.exec(s.slice(i));
        col = m ? parseInt(m[1], 10) & 3 : col;
        i += m ? m[1].length : 0;
        continue;
      }
      if (ch === "S" || ch === "s") {
        const m = /^(\d+)/.exec(s.slice(i));
        sc = m ? parseInt(m[1], 10) : sc;
        i += m ? m[1].length : 0;
        continue;
      }
      if (ch === "M" || ch === "m") {
        const abs = s[i] !== "+" && s[i] !== "-";
        const m = /^([+-]?\d+)\s*,\s*([+-]?\d+)/.exec(s.slice(i));
        if (!m) continue;
        i += m[0].length;
        const mx = parseInt(m[1], 10);
        const my = parseInt(m[2], 10);
        if (abs) {
          const u = unit();
          // Absolute M in DRAW is pixel coords when used as BMx,y in practice with BM
          const nx = mx;
          const ny = my;
          if (!blank) plotLine(cx, cy, nx, ny);
          if (!noUpdate) {
            cx = nx;
            cy = ny;
          }
          // silence unused
          void u;
        } else {
          move(mx, my, !blank, noUpdate);
        }
        continue;
      }

      const numMatch = /^(\d*)/.exec(s.slice(i));
      const n = numMatch[1] === "" ? 1 : parseInt(numMatch[1], 10);
      i += numMatch[1].length;

      const draw = !blank;
      switch (ch.toUpperCase()) {
        case "U":
          move(0, -n, draw, noUpdate);
          break;
        case "D":
          move(0, n, draw, noUpdate);
          break;
        case "L":
          move(-n, 0, draw, noUpdate);
          break;
        case "R":
          move(n, 0, draw, noUpdate);
          break;
        case "E":
          move(n, -n, draw, noUpdate);
          break;
        case "F":
          move(n, n, draw, noUpdate);
          break;
        case "G":
          move(-n, n, draw, noUpdate);
          break;
        case "H":
          move(-n, -n, draw, noUpdate);
          break;
        default:
          break;
      }
    }
  }

  return { x: cx, y: cy, color: col, scale: sc };
}

/** Flood fill with color until boundary (non-bg or edge). */
export function paint(ctx, x, y, paintColor, boundaryColor = null) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const start = getPixelIndex(img, x, y);
  if (start < 0) return;
  const target = start;
  if (target === (paintColor & 3)) return;

  const stack = [[x, y]];
  const seen = new Uint8Array(w * h);

  while (stack.length) {
    const [px, py] = stack.pop();
    if (px < 0 || py < 0 || px >= w || py >= h) continue;
    const idx = py * w + px;
    if (seen[idx]) continue;
    const c = getPixelIndex(img, px, py);
    if (boundaryColor != null) {
      if (c === boundaryColor) continue;
    } else if (c !== target) {
      continue;
    }
    seen[idx] = 1;
    const off = idx * 4;
    const css = PALETTE_CSS[paintColor & 3];
    const r = parseInt(css.slice(1, 3), 16);
    const g = parseInt(css.slice(3, 5), 16);
    const b = parseInt(css.slice(5, 7), 16);
    img.data[off] = r;
    img.data[off + 1] = g;
    img.data[off + 2] = b;
    img.data[off + 3] = 255;
    stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
  }
  ctx.putImageData(img, 0, 0);
}

function presetPixel(ctx, x, y) {
  // Toggle toward background for "eye" dots on donkey
  setPixel(ctx, x, y, 0);
}

/**
 * Build car and donkey sprites from the original DRAW strings.
 * Returns ImageBitmaps / canvases sized like GET regions.
 */
export function buildSprites() {
  const car = buildCar();
  const donkey = buildDonkey();
  return { car, donkey };
}

function makeSheet(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PALETTE_CSS[0];
  ctx.fillRect(0, 0, w, h);
  return { canvas, ctx };
}

/**
 * Extract a GET-style sprite. If invertPreset, apply PUT PRESET mapping
 * (CGA 2-bit: 0↔3, 1↔2) so exterior-filled shapes become solid sprites.
 */
function extractSprite(ctx, x1, y1, x2, y2, { invertPreset = false } = {}) {
  const w = x2 - x1 + 1;
  const h = y2 - y1 + 1;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = false;
  octx.drawImage(ctx.canvas, x1, y1, w, h, 0, 0, w, h);
  const img = octx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    let c = 0;
    const r = img.data[i];
    const g = img.data[i + 1];
    const b = img.data[i + 2];
    if (r > 200 && g > 200 && b > 200) c = 3;
    else if (r > 200 && b > 200) c = 2;
    else if (g > 200 && b > 200) c = 1;
    else c = 0;

    if (invertPreset) c = 3 - c;

    if (c === 0) {
      img.data[i + 3] = 0;
    } else {
      const css = PALETTE_CSS[c];
      img.data[i] = parseInt(css.slice(1, 3), 16);
      img.data[i + 1] = parseInt(css.slice(3, 5), 16);
      img.data[i + 2] = parseInt(css.slice(5, 7), 16);
      img.data[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

function buildCar() {
  // Original: DRAW outline, LINE box, PAINT(1,1), GET, PUT … PRESET
  const { ctx } = makeSheet(48, 64);

  drawCommands(ctx, [
    "S8C3",
    "BM12,1r3m+1,3d2R1ND2u1r2d4l2u1l1",
    "d7R1nd2u2r3d6l3u2l1d3m-1,1l3",
    "m-1,-1u3l1d2l3u6r3d2nd2r1u7l1d1l2",
    "u4r2d1nd2R1U2",
    "M+1,-3",
    "BD10D2R3U2M-1,-1L1M-1,1",
    "BD3D1R1U1L1BR2R1D1L1U1",
    "BD2BL2D1R1U1L1BR2R1D1L1U1",
    "BD2BL2D1R1U1L1BR2R1D1L1U1",
  ]);

  // LINE(0,0)-(40,60),,B then PAINT (1,1) — fill exterior white
  for (let x = 0; x <= 40; x++) {
    setPixel(ctx, x, 0, 3);
    setPixel(ctx, x, 60, 3);
  }
  for (let y = 0; y <= 60; y++) {
    setPixel(ctx, 0, y, 3);
    setPixel(ctx, 40, y, 3);
  }
  paint(ctx, 1, 1, 3);

  return extractSprite(ctx, 1, 1, 29, 45, { invertPreset: true });
}

function buildDonkey() {
  const { ctx } = makeSheet(56, 32);

  drawCommands(ctx, [
    "S08",
    "BM14,18",
    "M+2,-4R8M+1,-1U1M+1,+1M+2,-1",
    "M-1,1M+1,3M-1,1M-1,-2M-1,2",
    "D3L1U3M-1,1D2L1U2L3D2L1U2M-1,-1",
    "D3L1U5M-2,3U1",
  ]);
  paint(ctx, 21, 14, 3);
  presetPixel(ctx, 37, 10);
  presetPixel(ctx, 40, 10);
  presetPixel(ctx, 37, 11);
  presetPixel(ctx, 40, 11);

  return extractSprite(ctx, 13, 0, 45, 25);
}

export function putSprite(ctx, x, y, sprite) {
  ctx.drawImage(sprite, x | 0, y | 0);
}

export function splitSprite(sprite, midX) {
  const left = document.createElement("canvas");
  const right = document.createElement("canvas");
  left.width = midX;
  left.height = sprite.height;
  right.width = sprite.width - midX;
  right.height = sprite.height;
  left.getContext("2d").drawImage(sprite, 0, 0, midX, sprite.height, 0, 0, midX, sprite.height);
  right
    .getContext("2d")
    .drawImage(sprite, midX, 0, right.width, sprite.height, 0, 0, right.width, sprite.height);
  return { left, right };
}
