import { $ } from "./dom.js";
import { getSettings } from "./settings.js";
import { isNightTime } from "./logic.js";
import { formatDate, formatTime } from "./clock.js";

const SNOOZE_MS = 5 * 60 * 1000; // tap wakes the dashboard for 5 minutes

let manual = false;
let snoozeUntil = 0;

function shouldShow(now) {
  if (manual) return true;
  const { night } = getSettings();
  return night.auto && now.getTime() > snoozeUntil && isNightTime(now, night.start, night.end);
}

export function renderNight(now) {
  const show = shouldShow(now);
  $("night").hidden = !show;
  if (!show) return;
  $("night-time").textContent = formatTime(now);
  $("night-date").textContent = formatDate(now);
}

export function initNight() {
  $("night-btn").addEventListener("click", () => {
    manual = true;
    renderNight(new Date());
  });
  $("night").addEventListener("click", () => {
    manual = false;
    snoozeUntil = Date.now() + SNOOZE_MS;
    renderNight(new Date());
  });
}
