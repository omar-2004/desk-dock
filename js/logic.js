// Pure helpers: no DOM, no storage. Covered by tests/logic.test.js.

const DAY_MS = 24 * 60 * 60 * 1000;

const WEATHER_CODES = {
  0: ["☀️", "Clear"], 1: ["🌤️", "Mostly clear"], 2: ["⛅", "Partly cloudy"], 3: ["☁️", "Overcast"],
  45: ["🌫️", "Fog"], 48: ["🌫️", "Fog"],
  51: ["🌦️", "Light drizzle"], 53: ["🌦️", "Drizzle"], 55: ["🌧️", "Heavy drizzle"],
  61: ["🌦️", "Light rain"], 63: ["🌧️", "Rain"], 65: ["🌧️", "Heavy rain"],
  71: ["🌨️", "Light snow"], 73: ["🌨️", "Snow"], 75: ["❄️", "Heavy snow"],
  80: ["🌦️", "Showers"], 81: ["🌧️", "Showers"], 82: ["⛈️", "Violent showers"],
  95: ["⛈️", "Thunderstorm"], 96: ["⛈️", "Thunderstorm"], 99: ["⛈️", "Thunderstorm"],
};

// European AQI bands: [upper bound, label]
const AQI_BANDS = [
  [20, "Good"], [40, "Fair"], [60, "Moderate"], [80, "Poor"], [100, "Very poor"],
];

export function describeWeather(code) {
  return WEATHER_CODES[code] || ["·", "—"];
}

export function aqiLabel(aqi) {
  const band = AQI_BANDS.find(([max]) => aqi <= max);
  return band ? band[1] : "Extremely poor";
}

export function formatSeconds(total) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// Local calendar date as "YYYY-MM-DD".
export function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

export function daysUntil(isoDate, today) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target - startOfDay(today)) / DAY_MS);
}

export function daysLabel(n) {
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 1 ? `${n} days` : `${-n} days ago`;
}

// Oldest → today.
export function lastNDays(n, today) {
  return Array.from({ length: n }, (_, i) => dateKey(addDays(today, i - n + 1)));
}

// Consecutive days done, ending today (or yesterday if today isn't done yet).
export function streak(days, today) {
  const done = new Set(days);
  const start = done.has(dateKey(today)) ? 0 : 1;
  let count = 0;
  while (done.has(dateKey(addDays(today, -(start + count))))) count += 1;
  return count;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Handles ranges that cross midnight, e.g. 22:00 → 07:00.
export function isNightTime(now, start, end) {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === e) return false;
  const t = now.getHours() * 60 + now.getMinutes();
  return s < e ? t >= s && t < e : t >= s || t < e;
}

export function quoteOfDay(quotes, date) {
  const dayOfYear = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
      - Date.UTC(date.getFullYear(), 0, 0)) / DAY_MS,
  );
  return quotes[dayOfYear % quotes.length];
}

// Next `count` hours after the location's current hour.
export function hourlyFrom(hourly, currentTime, count) {
  const hourKey = currentTime.slice(0, 13);
  const start = hourly.time.findIndex((t) => t.slice(0, 13) === hourKey);
  if (start < 0) return [];
  return hourly.time.slice(start + 1, start + 1 + count).map((time, i) => {
    const idx = start + 1 + i;
    return {
      time: time.slice(11, 16),
      temp: Math.round(hourly.temperature_2m[idx]),
      code: hourly.weather_code[idx],
      rain: hourly.precipitation_probability[idx] ?? 0,
    };
  });
}
