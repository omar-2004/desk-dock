import { onSettingsChange } from "./settings.js";
import { renderClock, renderQuote, renderWorldClocks } from "./clock.js";
import { initWeather, refreshWeather } from "./weather.js";
import { initFocus } from "./focus.js";
import { initTabs } from "./tabs.js";
import { initTodos } from "./todo.js";
import { initHabits, refreshHabits } from "./habits.js";
import { initCountdowns, refreshCountdowns } from "./countdowns.js";
import { initNotes } from "./notes.js";
import { initNight, renderNight } from "./night.js";
import { initSettingsUi } from "./settings-ui.js";

const TICK_MS = 1000;
let currentDay = new Date().toDateString();

function tick() {
  const now = new Date();
  renderClock(now);
  renderWorldClocks(now);
  renderQuote(now);
  renderNight(now);

  const day = now.toDateString();
  if (day !== currentDay) {
    currentDay = day;
    refreshHabits();
    refreshCountdowns();
  }
}

// Keep the screen on (Safari 16.4+). The lock drops when the app is hidden, so re-request on return.
async function keepAwake() {
  try {
    if ("wakeLock" in navigator) await navigator.wakeLock.request("screen");
  } catch (err) {
    console.warn("Wake lock unavailable", err);
  }
}

function init() {
  initTabs();
  initTodos();
  initHabits();
  initCountdowns();
  initNotes();
  initFocus();
  initNight();
  initSettingsUi();
  initWeather();

  tick();
  setInterval(tick, TICK_MS);
  onSettingsChange(() => {
    tick();
    refreshWeather();
  });

  document.addEventListener("click", keepAwake, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") keepAwake();
  });
}

init();
