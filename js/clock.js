import { $ } from "./dom.js";
import { getSettings } from "./settings.js";

export function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: !getSettings().h24 });
}

export function formatDate(date) {
  return date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
}

export function renderClock(now) {
  $("time").textContent = formatTime(now);
  $("date").textContent = formatDate(now);
}
