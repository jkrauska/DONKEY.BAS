/** Web Audio approximations of BASIC SOUND / PC speaker */

let ctx = null;
let unlocked = false;

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  unlocked = true;
}

function beep(freq, durationSec, type = "square", gain = 0.08) {
  if (!unlocked || !ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = Math.max(37, freq);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + durationSec);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durationSec);
}

/** SOUND 20000,1 — above hearing in the original; keep silent */
export function tick() {
  /* timing only in the original */
}

/** Lane switch SOUND 200,1 */
export function switchLane() {
  beep(200, 0.06, "square", 0.1);
}

/** Boom noise bursts */
export function boomBurst() {
  if (!unlocked || !ctx) return;
  const t0 = ctx.currentTime;
  const dur = 0.12;
  const bufferSize = (ctx.sampleRate * dur) | 0;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  const freq = 37 + Math.random() * 200;
  // Layer a low square for "SOUND 37+RND*200,4"
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = freq;
  const og = ctx.createGain();
  og.gain.value = 0.07;
  g.gain.value = 0.12;
  src.connect(g);
  g.connect(ctx.destination);
  osc.connect(og);
  og.connect(ctx.destination);
  src.start(t0);
  osc.start(t0);
  osc.stop(t0 + 0.18);
  src.stop(t0 + dur);
}
