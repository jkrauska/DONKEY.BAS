import {
  W,
  H,
  PALETTE_CSS,
  createBuffer,
  clear,
  fillRect,
  locatePrint,
  fitStage,
  blit,
} from "./cga.js";
import { buildSprites, putSprite, splitSprite } from "./sprites.js";
import * as sound from "./sound.js";

const display = document.getElementById("game");
const stageEl = document.getElementById("stage");
const soundToggle = document.getElementById("soundToggle");
const crtToggle = document.getElementById("crtToggle");
const cheatToggle = document.getElementById("cheatToggle");

const displayCtx = display.getContext("2d");
displayCtx.imageSmoothingEnabled = false;

const { canvas: buf, ctx } = createBuffer();
const sprites = buildSprites();

/** Driver-panel inset (POST_NO) — not full-screen. */
const POST_NO_X = 194;
const POST_NO_Y = 40;
const POST_NO_W = 100;
const POST_NO_H = 100;
const POST_NO_SCORE = 10;
/** Donkey-panel inset (WAFFLES) — source aspect preserved. */
const WAFFLES_X = 13;
const WAFFLES_Y = 48;
const WAFFLES_W = 77;
const WAFFLES_H = 140;
const WAFFLES_SCORE = 10;

const qs = new URLSearchParams(location.search);
const previewPostNo = qs.has("post_no");
const previewWaffles = qs.has("waffles");

const post_no = new Image();
let postNoReady = false;
post_no.onload = () => {
  postNoReady = true;
  maybeRedrawInsets();
};
post_no.src = "img/post_no.png";

const waffles = new Image();
let wafflesReady = false;
waffles.onload = () => {
  wafflesReady = true;
  maybeRedrawInsets();
};
waffles.src = "img/waffles.png";

function maybeRedrawInsets() {
  if (mode !== STATE.TITLE) {
    redrawPlay();
    blit(buf, displayCtx);
  }
}

const STATE = {
  TITLE: "title",
  PLAY: "play",
  BOOM: "boom",
  WIN: "win",
};

let mode = STATE.TITLE;
let sd = 0; // donkey score
let sm = 0; // driver score
let cx = 105;
let cy = 105;
let dx = 105;
let donkeyY = 0;
let dashPhase = 0;
let message = null;
let messageUntil = 0;
let boom = null;
let lastStep = 0;
let stepMs = 55;
let animFrame = 0;

const LEFT_LANE = 105;
const RIGHT_LANE = 147; // 252 - 105
const CAR_W = 29;
const CAR_H = 45;
const DNK_W = 33;
const DNK_H = 26;

function resize() {
  fitStage(display, stageEl);
}

function drawTitle() {
  clear(ctx, 0);
  // Approximate SCREEN 0 WIDTH 40 title
  locatePrint(ctx, 5, 19, "IBM", 3);
  locatePrint(ctx, 7, 12, "Personal Computer", 3);

  // Box with double-line feel (cyan)
  const bx = 8 * 8; // col 9
  const by = 9 * 8; // row 10
  const bw = 23 * 8;
  const bh = 5 * 8;
  fillRect(ctx, bx, by, bx + bw - 1, by + bh - 1, 1, false);
  locatePrint(ctx, 11, 12, "DONKEY", 1);
  locatePrint(ctx, 13, 13, "Version 1.10", 1);

  locatePrint(ctx, 17, 4, "(C) Copyright IBM Corp 1981, 1982", 3);
  locatePrint(ctx, 20, 6, "45 years of the IBM PC", 2);
  locatePrint(ctx, 23, 7, "Press space bar to continue", 3);
}

function drawPlayfieldBase() {
  clear(ctx, 0);
  // LINE (0,0)-(305,199),,B
  fillRect(ctx, 0, 0, 305, 199, 3, false);
  // Side panels cyan
  fillRect(ctx, 6, 6, 97, 195, 1, true);
  fillRect(ctx, 183, 6, 305, 195, 1, true);

  locatePrint(ctx, 3, 5, "Donkey", 0);
  locatePrint(ctx, 3, 29, "Driver", 0);

  locatePrint(ctx, 19, 25, "Press Space  ", 0);
  locatePrint(ctx, 20, 25, "Bar to switch", 0);
  locatePrint(ctx, 21, 25, "lanes        ", 0);
  locatePrint(ctx, 23, 25, "Press ESC    ", 0);
  locatePrint(ctx, 24, 25, "to exit      ", 0);

  // Lane walls
  fillRect(ctx, 100, 0, 100, 199, 3, true);
  fillRect(ctx, 180, 0, 180, 199, 3, true);
}

function drawDashes() {
  // FOR Y=4 TO 199 STEP 20: LINE(140,Y)-(140,Y+10)
  const offset = (dashPhase % 20);
  for (let y = 4 - offset; y < 199; y += 20) {
    const y1 = Math.max(0, y);
    const y2 = Math.min(199, y + 10);
    if (y2 > y1) fillRect(ctx, 140, y1, 140, y2, 3, true);
  }
}

function shouldShowPostNo() {
  return postNoReady && (previewPostNo || cheatToggle.checked || sm >= POST_NO_SCORE);
}

function shouldShowWaffles() {
  return wafflesReady && (previewWaffles || cheatToggle.checked || sd >= WAFFLES_SCORE);
}

function drawPostNo() {
  if (!shouldShowPostNo()) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(post_no, POST_NO_X, POST_NO_Y, POST_NO_W, POST_NO_H);
}

function drawWaffles() {
  if (!shouldShowWaffles()) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(waffles, WAFFLES_X, WAFFLES_Y, WAFFLES_W, WAFFLES_H);
}

function drawScores() {
  // Clear score cells on cyan panels
  fillRect(ctx, 40, 32, 40 + 4 * 8, 32 + 8, 1, true);
  fillRect(ctx, 240, 32, 240 + 4 * 8, 32 + 8, 1, true);
  locatePrint(ctx, 5, 6, String(sd), 0);
  locatePrint(ctx, 5, 31, String(sm), 0);
  drawWaffles();
  drawPostNo();
}

function startRound() {
  cx = LEFT_LANE;
  cy = 105;
  dx = LEFT_LANE + 42 * (Math.random() < 0.5 ? 0 : 1);
  donkeyY = (Math.random() * -4) * 8;
  dashPhase = 0;
  message = null;
  mode = STATE.PLAY;
  cheatDodge();
  redrawPlay();
}

function redrawPlay() {
  drawPlayfieldBase();
  drawDashes();
  drawScores();
  if (donkeyY >= 3) {
    putSprite(ctx, dx, donkeyY, sprites.donkey);
  }
  putSprite(ctx, cx, cy, sprites.car);
  if (message) {
    locatePrint(ctx, message.row, message.col, message.text, message.color ?? 0);
  }
}

function switchLanes() {
  sound.unlockAudio();
  // LINE erase car box
  fillRect(ctx, cx, cy, cx + 28, cy + 44, 0, true);
  cx = 252 - cx;
  putSprite(ctx, cx, cy, sprites.car);
  sound.switchLane();
}

/** If cheat is on and the car shares the donkey's lane, switch away. */
function cheatDodge() {
  if (!cheatToggle.checked || mode !== STATE.PLAY) return false;
  if (cx !== dx) return false;
  switchLanes();
  return true;
}

function onHit() {
  sd += 1;
  mode = STATE.BOOM;
  message = { row: 14, col: 6, text: "BOOM!", color: 0 };
  const midCar = 15;
  const midDnk = 17;
  const carParts = splitSprite(sprites.car, midCar);
  const dnkParts = splitSprite(sprites.donkey, midDnk);
  boom = {
    p: 6,
    c1x: cx,
    c1y: cy,
    c2x: cx + midCar,
    d1x: dx,
    d1y: donkeyY,
    d2x: dx + midDnk,
    carL: carParts.left,
    carR: carParts.right,
    dnkL: dnkParts.left,
    dnkR: dnkParts.right,
    ox: cx,
    oy: cy,
    odx: dx,
    ody: donkeyY,
    last: performance.now(),
  };
  sound.unlockAudio();
  redrawPlay();
}

function onDriverWin() {
  sm += 1;
  mode = STATE.WIN;
  message = { row: 7, col: 25, text: "Donkey loses!", color: 0 };
  messageUntil = performance.now() + 900;
  redrawPlay();
}

function advancePlay(now) {
  if (now - lastStep < stepMs) return;
  lastStep = now;

  // Original: each Y step SOUND + maybe scroll dashes
  sound.tick();
  donkeyY += 6;
  if ((donkeyY | 0) & 3) {
    dashPhase += 4;
  }

  // Cheat: always dodge into the empty lane (before collision check)
  cheatDodge();

  // Collision: CX=DX AND Y+25>=CY
  if (cx === dx && donkeyY + 25 >= cy) {
    onHit();
    return;
  }

  if (donkeyY > 124) {
    // Cleared donkey — car advances (CY=CY-4)
    cy -= 4;
    if (cy < 60) {
      onDriverWin();
      return;
    }
    dx = LEFT_LANE + 42 * (Math.random() < 0.5 ? 0 : 1);
    donkeyY = (Math.random() * -4) * 8;
    cheatDodge();
  }

  redrawPlay();
}

function advanceBoom(now) {
  if (!boom) return; // waiting for post-boom restart
  if (now - boom.last < 90) return;
  boom.last = now;

  // FOR P=6 TO 0: Z=1/(2^P): Z1=1-Z — then scatter halves
  const p = boom.p;
  const z = 1 / 2 ** p;
  const z1 = 1 - z;

  boom.c1x = boom.ox * z1;
  boom.d1y = boom.ody * z1;
  boom.c2x = boom.c2x + (291 - boom.c2x) * z;
  boom.d1x = boom.odx * z1;
  boom.c1y = boom.c1y + (155 - boom.c1y) * z;
  boom.d2x = boom.d2x + (294 - boom.d2x) * z;

  drawPlayfieldBase();
  drawDashes();
  drawScores();
  locatePrint(ctx, 14, 6, "BOOM!", 0);

  putSprite(ctx, boom.c1x, boom.c1y, boom.carL);
  putSprite(ctx, boom.c2x, boom.c1y, boom.carR);
  putSprite(ctx, boom.d1x, boom.d1y, boom.dnkL);
  putSprite(ctx, boom.d2x, boom.d1y, boom.dnkR);

  sound.boomBurst();

  boom.p -= 1;
  if (boom.p < 0) {
    boom = null;
    setTimeout(() => startRound(), 400);
  }
}

function frame(now) {
  animFrame = requestAnimationFrame(frame);

  if (mode === STATE.TITLE) {
    drawTitle();
  } else if (mode === STATE.PLAY) {
    advancePlay(now);
  } else if (mode === STATE.BOOM) {
    advanceBoom(now);
  } else if (mode === STATE.WIN) {
    if (now >= messageUntil) {
      startRound();
    }
  }

  blit(buf, displayCtx);
}

function moveDonkeyLane(dir) {
  // dir: -1 left, +1 right — secret A/D control
  const next = dir < 0 ? LEFT_LANE : RIGHT_LANE;
  if (dx === next) return;
  dx = next;
  cheatDodge();
  redrawPlay();
}

function onKey(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    if (mode !== STATE.TITLE) {
      mode = STATE.TITLE;
      boom = null;
      message = null;
    }
    return;
  }

  // Hidden secondary car control
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    e.preventDefault();
    if (mode === STATE.PLAY) {
      const want = e.key === "ArrowLeft" ? LEFT_LANE : RIGHT_LANE;
      if (cx !== want) switchLanes();
    }
    return;
  }

  // Secret donkey lane control (not shown in UI)
  if (e.key === "a" || e.key === "A" || e.key === "d" || e.key === "D") {
    e.preventDefault();
    if (mode === STATE.PLAY) {
      moveDonkeyLane(e.key === "a" || e.key === "A" ? -1 : 1);
    }
    return;
  }

  if (e.code === "Space" || e.key === " ") {
    e.preventDefault();
    sound.unlockAudio();
    if (mode === STATE.TITLE) {
      sd = 0;
      sm = 0;
      startRound();
      return;
    }
    if (mode === STATE.PLAY) {
      switchLanes();
    }
  }
}

function onPointer(e) {
  // One listener on stage only — canvas + stage both listening caused
  // bubble double-fire (switch + switch back = no visible move).
  e.preventDefault();
  sound.unlockAudio();
  if (mode === STATE.TITLE) {
    sd = 0;
    sm = 0;
    startRound();
    return;
  }
  if (mode === STATE.PLAY) {
    switchLanes();
  }
}

sound.setEnabled(soundToggle.checked);
soundToggle.addEventListener("change", () => {
  sound.setEnabled(soundToggle.checked);
  if (soundToggle.checked) sound.unlockAudio();
});

crtToggle.addEventListener("change", () => {
  stageEl.classList.toggle("crt", crtToggle.checked);
});


cheatToggle.addEventListener("change", () => {
  cheatDodge();
  if (mode !== STATE.TITLE) redrawPlay();
});

window.addEventListener("keydown", onKey);
stageEl.addEventListener("pointerdown", onPointer, { passive: false });
window.addEventListener("resize", resize);

resize();
const autostart = qs.has("play");
if (autostart) {
  sound.unlockAudio();
  startRound();
} else {
  drawTitle();
}
blit(buf, displayCtx);
requestAnimationFrame(frame);
