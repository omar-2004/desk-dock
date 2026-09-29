import { $, el } from "./dom.js";
import { getSettings } from "./settings.js";
import { aqiLabel, describeWeather, hourlyFrom } from "./logic.js";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const AQI_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const REFRESH_MS = 15 * 60 * 1000;
const HOURS_SHOWN = 12;
const DAYS_SHOWN = 4;

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function forecastUrl(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max",
    timezone: "auto",
    forecast_days: String(DAYS_SHOWN + 1),
  });
  return `${FORECAST_URL}?${params}`;
}

function aqiUrl(lat, lon) {
  return `${AQI_URL}?${new URLSearchParams({ latitude: lat, longitude: lon, current: "european_aqi" })}`;
}

function stat(label, value) {
  const box = el("div", "stat");
  box.append(el("div", "k", label), el("div", "v", value));
  return box;
}

function renderNow(current, city) {
  const [icon, label] = describeWeather(current.weather_code);
  $("w-icon").textContent = icon;
  $("w-temp").textContent = `${Math.round(current.temperature_2m)}°`;
  $("w-desc").textContent = `${label} · ${getSettings().useLocation ? "📍 " : ""}${city}`;
}

function renderDetails(current, daily, aqi) {
  const air = aqi === null ? "—" : `${aqiLabel(aqi)} ${Math.round(aqi)}`;
  $("w-details").replaceChildren(
    stat("Feels like", `${Math.round(current.apparent_temperature)}°`),
    stat("Humidity", `${current.relative_humidity_2m}%`),
    stat("Wind", `${Math.round(current.wind_speed_10m)} km/h`),
    stat("Rain today", `${daily.precipitation_probability_max[0] ?? 0}%`),
    stat("UV max", `${Math.round(daily.uv_index_max[0] ?? 0)}`),
    stat("Air", air),
    stat("Sunrise", daily.sunrise[0].slice(11, 16)),
    stat("Sunset", daily.sunset[0].slice(11, 16)),
  );
}

function renderHourly(hourly, currentTime) {
  const hours = hourlyFrom(hourly, currentTime, HOURS_SHOWN).map((h) => {
    const box = el("div", "hour");
    box.append(
      el("div", "", h.time),
      el("div", "i", describeWeather(h.code)[0]),
      el("div", "", `${h.temp}°`),
      el("div", "r", `${h.rain}%`),
    );
    return box;
  });
  $("w-hourly").replaceChildren(...hours);
}

function weekday(isoDate) {
  return new Date(`${isoDate}T12:00`).toLocaleDateString([], { weekday: "short" });
}

function renderDaily(daily) {
  const rows = daily.time.slice(1, 1 + DAYS_SHOWN).map((date, idx) => {
    const i = idx + 1;
    const row = el("div", "day");
    row.append(
      el("span", "", weekday(date)),
      el("span", "", describeWeather(daily.weather_code[i])[0]),
      el("span", "r", `💧 ${daily.precipitation_probability_max[i] ?? 0}%`),
      el("span", "", `${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°`),
    );
    return row;
  });
  $("w-daily").replaceChildren(...rows);
}

export async function refreshWeather() {
  const { lat, lon, city } = getSettings();
  const [forecast, air] = await Promise.allSettled([getJson(forecastUrl(lat, lon)), getJson(aqiUrl(lat, lon))]);
  if (forecast.status === "rejected") {
    console.warn("Forecast failed", forecast.reason);
    $("w-desc").textContent = "Weather unavailable. Check Wi-Fi.";
    return;
  }
  const aqi = air.status === "fulfilled" ? air.value.current?.european_aqi ?? null : null;
  try {
    const data = forecast.value;
    renderNow(data.current, city);
    renderDetails(data.current, data.daily, aqi);
    renderHourly(data.hourly, data.current.time);
    renderDaily(data.daily);
  } catch (err) {
    console.warn("Unexpected weather data", err);
    $("w-desc").textContent = "Weather data looks wrong. Try again later.";
  }
}

export function initWeather() {
  refreshWeather();
  setInterval(refreshWeather, REFRESH_MS);
}
