import { $ } from "./dom.js";
import { getSettings, updateSettings } from "./settings.js";
import { clamp, formatSeconds, remainingSeconds } from "./logic.js";

const RANGES = {
  focusMin: { min: 5, max: 180, step: 5 },
  breakMin: { min: 1, max: 60, step: 1 },
};
const TICK_MS = 250;
const BEEP_HZ = 880;
const BEEP_SECONDS = 0.6;

const fullSeconds = (mode) => (mode === "focus" ? getSettings().focusMin : getSettings().breakMin) * 60;

// Counts down to a timestamp, so it stays correct even if the iPad pauses the page.
let state = { mode: "focus", running: false, remaining: fullSeconds("focus"), endsAt: 0 };

function render() {
  const s = getSettings();
  const full = fullSeconds(state.mode);
  $("pomo-time").textContent = formatSeconds(state.remaining);
  $("pomo-mode").textContent = state.mode === "focus" ? "Focus" : "Break";
  $("pomo-start").textContent = state.running ? "Pause" : "Start";
  $("pomo-bar").style.width = `${Math.min(100, (1 - state.remaining / full) * 100)}%`;
  $("pomo-bar").classList.toggle("break", state.mode === "break");
  $("focus-min").textContent = s.focusMin;
  $("break-min").textContent = s.breakMin;
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
  if (!state.running) return;
  const left = remainingSeconds(state.endsAt, Date.now());
  if (left > 0) {
    if (left !== state.remaining) {
      state = { ...state, remaining: left };
      render();
    }
    return;
  }
  beep();
  const mode = state.mode === "focus" ? "break" : "focus";
  const full = fullSeconds(mode);
  state = { mode, running: true, remaining: full, endsAt: Date.now() + full * 1000 };
  render();
}

function toggle() {
  state = state.running
    ? { ...state, running: false }
    : { ...state, running: true, endsAt: Date.now() + state.remaining * 1000 };
  render();
}

function reset() {
  state = { mode: "focus", running: false, remaining: fullSeconds("focus"), endsAt: 0 };
  render();
}

// Changing a duration while paused applies right away; while running it applies next round.
function adjust(key, direction) {
  const range = RANGES[key];
  updateSettings({ [key]: clamp(getSettings()[key] + direction * range.step, range.min, range.max) });
  if (!state.running) state = { ...state, remaining: fullSeconds(state.mode) };
  render();
}

export function initFocus() {
  render();
  setInterval(tick, TICK_MS);
  $("pomo-start").addEventListener("click", toggle);
  $("pomo-reset").addEventListener("click", reset);
  $("focus-dec").addEventListener("click", () => adjust("focusMin", -1));
  $("focus-inc").addEventListener("click", () => adjust("focusMin", 1));
  $("break-dec").addEventListener("click", () => adjust("breakMin", -1));
  $("break-inc").addEventListener("click", () => adjust("breakMin", 1));
}
