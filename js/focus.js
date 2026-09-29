import { $ } from "./dom.js";
import { formatSeconds } from "./logic.js";

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const BEEP_HZ = 880;
const BEEP_SECONDS = 0.6;

let pomo = { mode: "focus", remaining: FOCUS_SECONDS, running: false };
let timer = null;

function render() {
  $("pomo-time").textContent = formatSeconds(pomo.remaining);
  $("pomo-mode").textContent = pomo.mode === "focus" ? "Focus" : "Break";
  $("pomo-start").textContent = pomo.running ? "Pause" : "Start";
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.value = BEEP_HZ;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + BEEP_SECONDS);
  } catch (err) {
    console.warn("Audio failed", err);
  }
}

function tick() {
  if (pomo.remaining > 1) {
    pomo = { ...pomo, remaining: pomo.remaining - 1 };
  } else {
    beep();
    const mode = pomo.mode === "focus" ? "break" : "focus";
    pomo = { ...pomo, mode, remaining: mode === "focus" ? FOCUS_SECONDS : BREAK_SECONDS };
  }
  render();
}

function toggle() {
  pomo = { ...pomo, running: !pomo.running };
  clearInterval(timer);
  if (pomo.running) timer = setInterval(tick, 1000);
  render();
}

function reset() {
  clearInterval(timer);
  pomo = { mode: "focus", remaining: FOCUS_SECONDS, running: false };
  render();
}

export function initFocus() {
  render();
  $("pomo-start").addEventListener("click", toggle);
  $("pomo-reset").addEventListener("click", reset);
}
