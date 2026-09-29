"use strict";

// ---------- Config ----------
const WEATHER_REFRESH_MS = 15 * 60 * 1000;
const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const STORAGE_KEYS = { settings: "desk.settings", todos: "desk.todos", notes: "desk.notes" };
const DEFAULT_SETTINGS = { city: "Paris", lat: 48.8566, lon: 2.3522, h24: true };

const WEATHER_CODES = {
  0: ["☀️", "Clear"], 1: ["🌤️", "Mostly clear"], 2: ["⛅", "Partly cloudy"], 3: ["☁️", "Overcast"],
  45: ["🌫️", "Fog"], 48: ["🌫️", "Fog"],
  51: ["🌦️", "Light drizzle"], 53: ["🌦️", "Drizzle"], 55: ["🌧️", "Heavy drizzle"],
  61: ["🌦️", "Light rain"], 63: ["🌧️", "Rain"], 65: ["🌧️", "Heavy rain"],
  71: ["🌨️", "Light snow"], 73: ["🌨️", "Snow"], 75: ["❄️", "Heavy snow"],
  80: ["🌦️", "Showers"], 81: ["🌧️", "Showers"], 82: ["⛈️", "Violent showers"],
  95: ["⛈️", "Thunderstorm"], 96: ["⛈️", "Thunderstorm"], 99: ["⛈️", "Thunderstorm"],
};

const $ = (id) => document.getElementById(id);

// ---------- Storage (safe) ----------
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (err) {
    console.warn("Storage read failed", key, err);
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("Storage write failed", key, err);
  }
}

let settings = { ...DEFAULT_SETTINGS, ...load(STORAGE_KEYS.settings, {}) };

// ---------- Clock ----------
function renderClock() {
  const now = new Date();
  $("time").textContent = now.toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", hour12: !settings.h24,
  });
  $("date").textContent = now.toLocaleDateString([], {
    weekday: "long", day: "numeric", month: "long",
  });
}

// ---------- Weather (Open-Meteo, no API key) ----------
function describe(code) {
  return WEATHER_CODES[code] || ["·", "—"];
}

async function fetchWeather() {
  const url = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${settings.lat}&longitude=${settings.lon}`
    + "&current=temperature_2m,weather_code"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min"
    + "&timezone=auto&forecast_days=4";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
  return res.json();
}

function renderForecast(daily) {
  const days = daily.time.slice(1).map((date, i) => {
    const [icon] = describe(daily.weather_code[i + 1]);
    const name = new Date(`${date}T12:00`).toLocaleDateString([], { weekday: "short" });
    const max = Math.round(daily.temperature_2m_max[i + 1]);
    const min = Math.round(daily.temperature_2m_min[i + 1]);
    return `<div class="forecast-day"><div>${name}</div><div class="icon">${icon}</div><div>${max}° / ${min}°</div></div>`;
  });
  $("forecast").innerHTML = days.join("");
}

async function renderWeather() {
  try {
    const data = await fetchWeather();
    const [icon, label] = describe(data.current.weather_code);
    $("weather-icon").textContent = icon;
    $("weather-temp").textContent = `${Math.round(data.current.temperature_2m)}°`;
    $("weather-desc").textContent = `${label} · ${settings.city}`;
    renderForecast(data.daily);
  } catch (err) {
    console.warn(err);
    $("weather-desc").textContent = "Weather unavailable. Check Wi-Fi.";
  }
}

async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(city)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);
  const data = await res.json();
  const hit = data.results && data.results[0];
  if (!hit) throw new Error(`City "${city}" not found`);
  return { city: hit.name, lat: hit.latitude, lon: hit.longitude };
}

// ---------- Pomodoro ----------
let pomo = { mode: "focus", remaining: FOCUS_SECONDS, running: false };
let pomoTimer = null;

function formatSeconds(total) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function renderPomo() {
  $("pomo-time").textContent = formatSeconds(pomo.remaining);
  $("pomo-mode").textContent = pomo.mode === "focus" ? "Focus" : "Break";
  $("pomo-start").textContent = pomo.running ? "Pause" : "Start";
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (err) {
    console.warn("Audio failed", err);
  }
}

function tickPomo() {
  if (pomo.remaining > 1) {
    pomo = { ...pomo, remaining: pomo.remaining - 1 };
  } else {
    beep();
    const nextMode = pomo.mode === "focus" ? "break" : "focus";
    const nextTime = nextMode === "focus" ? FOCUS_SECONDS : BREAK_SECONDS;
    pomo = { ...pomo, mode: nextMode, remaining: nextTime };
  }
  renderPomo();
}

function togglePomo() {
  pomo = { ...pomo, running: !pomo.running };
  clearInterval(pomoTimer);
  if (pomo.running) pomoTimer = setInterval(tickPomo, 1000);
  renderPomo();
}

function resetPomo() {
  clearInterval(pomoTimer);
  pomo = { mode: "focus", remaining: FOCUS_SECONDS, running: false };
  renderPomo();
}

// ---------- To-do ----------
let todos = load(STORAGE_KEYS.todos, []);

function setTodos(next) {
  todos = next;
  save(STORAGE_KEYS.todos, todos);
  renderTodos();
}

function renderTodos() {
  const list = $("todo-list");
  list.innerHTML = "";
  todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = todo.done ? "done" : "";

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = todo.done;
    box.addEventListener("change", () =>
      setTodos(todos.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t))));

    const text = document.createElement("span");
    text.textContent = todo.text;

    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "✕";
    del.addEventListener("click", () => setTodos(todos.filter((t) => t.id !== todo.id)));

    li.append(box, text, del);
    list.append(li);
  });
}

function addTodo(event) {
  event.preventDefault();
  const text = $("todo-input").value.trim();
  if (!text) return;
  setTodos([...todos, { id: Date.now(), text, done: false }]);
  $("todo-input").value = "";
}

// ---------- Notes ----------
function initNotes() {
  const area = $("notes");
  area.value = load(STORAGE_KEYS.notes, "");
  area.addEventListener("input", () => save(STORAGE_KEYS.notes, area.value));
}

// ---------- Settings ----------
function openSettings() {
  $("city-input").value = settings.city;
  $("h24-input").checked = settings.h24;
  $("settings-error").textContent = "";
  $("settings").showModal();
}

async function saveSettings(event) {
  if (event.submitter && event.submitter.value !== "save") return;
  event.preventDefault();
  const city = $("city-input").value.trim();
  try {
    const place = city && city !== settings.city ? await geocode(city) : {};
    settings = { ...settings, ...place, h24: $("h24-input").checked };
    save(STORAGE_KEYS.settings, settings);
    $("settings").close();
    renderClock();
    renderWeather();
  } catch (err) {
    $("settings-error").textContent = err.message;
  }
}

// ---------- Keep screen awake (Safari 16.4+) ----------
async function keepAwake() {
  try {
    if ("wakeLock" in navigator) await navigator.wakeLock.request("screen");
  } catch (err) {
    console.warn("Wake lock unavailable", err);
  }
}

// ---------- Boot ----------
function init() {
  renderClock();
  setInterval(renderClock, 1000);
  renderWeather();
  setInterval(renderWeather, WEATHER_REFRESH_MS);

  renderPomo();
  $("pomo-start").addEventListener("click", togglePomo);
  $("pomo-reset").addEventListener("click", resetPomo);

  renderTodos();
  $("todo-form").addEventListener("submit", addTodo);

  initNotes();

  $("settings-btn").addEventListener("click", openSettings);
  $("settings-form").addEventListener("submit", saveSettings);
  $("dim-btn").addEventListener("click", () => document.body.classList.toggle("dim"));

  document.addEventListener("click", keepAwake, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") keepAwake();
  });
}

init();
