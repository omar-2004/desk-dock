import { getSettings, onSettingsChange } from "./settings.js";
import { initLayout } from "./layout.js";
import { renderClock } from "./clock.js";
import { initWeather, refreshWeather } from "./weather.js";
import { refreshLocation } from "./location.js";
import { renderQuote } from "./quote.js";
import { initBooks } from "./books.js";
import { initFocus } from "./focus.js";
import { initTabs } from "./tabs.js";
import { initTodos } from "./todo.js";
import { initHabits, refreshHabits } from "./habits.js";
import { initNotes } from "./notes.js";
import { initNight, renderNight } from "./night.js";
import { initSettingsUi } from "./settings-ui.js";

const TICK_MS = 1000;
const placeOf = (s) => `${s.lat},${s.lon},${s.city}`;

let currentDay = new Date().toDateString();
let currentPlace = placeOf(getSettings());

function tick() {
  const now = new Date();
  renderClock(now);
  renderQuote(now);
  renderNight(now);

  const day = now.toDateString();
  if (day !== currentDay) {
    currentDay = day;
    refreshHabits();
  }
}

// Weather only refetches when the place actually changes (not on timer tweaks etc.).
function onSettings(settings) {
  tick();
  const place = placeOf(settings);
  if (place !== currentPlace) {
    currentPlace = place;
    refreshWeather();
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
  initLayout();
  initTabs();
  initTodos();
  initHabits();
  initNotes();
  initBooks();
  initFocus();
  initNight();
  initSettingsUi();
  initWeather();
  refreshLocation();

  tick();
  setInterval(tick, TICK_MS);
  onSettingsChange(onSettings);

  document.addEventListener("click", keepAwake, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") keepAwake();
  });
}

init();
