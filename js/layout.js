import { $ } from "./dom.js";
import { KEYS, load, save } from "./storage.js";
import { isValidLayout, resizeColumns } from "./logic.js";

const DEFAULT_COLS = [34, 33, 33]; // percent
const MIN_PCT = 20;
const DOUBLE_TAP_MS = 350;
const TAP_SLOP_PX = 4;

const saved = load(KEYS.layout, null);
let cols = isValidLayout(saved, DEFAULT_COLS.length, MIN_PCT) ? saved : DEFAULT_COLS;
let lastTap = 0;

function apply() {
  const grid = $("grid");
  cols.forEach((c, i) => grid.style.setProperty(`--c${i + 1}`, `${c}fr`));
}

function reset() {
  cols = DEFAULT_COLS;
  apply();
  save(KEYS.layout, cols);
}

function startDrag(index, event) {
  event.preventDefault();
  const handle = event.currentTarget;
  const gridWidth = $("grid").getBoundingClientRect().width;
  const startX = event.clientX;
  const startCols = cols;
  handle.setPointerCapture(event.pointerId);
  handle.classList.add("dragging");

  const move = (e) => {
    cols = resizeColumns(startCols, index, ((e.clientX - startX) / gridWidth) * 100, MIN_PCT);
    apply();
  };

  const end = (e) => {
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", end);
    handle.removeEventListener("pointercancel", end);
    handle.classList.remove("dragging");
    const isTap = Math.abs(e.clientX - startX) < TAP_SLOP_PX;
    if (isTap && Date.now() - lastTap < DOUBLE_TAP_MS) {
      reset();
      return;
    }
    lastTap = isTap ? Date.now() : 0;
    save(KEYS.layout, cols);
  };

  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}

export function initLayout() {
  apply();
  document.querySelectorAll(".divider").forEach((handle) => {
    const index = Number(handle.dataset.index);
    handle.addEventListener("pointerdown", (e) => startDrag(index, e));
  });
}
