import { $ } from "./dom.js";
import { getSettings, updateSettings } from "./settings.js";

const REVERSE_URL = "https://api-bdc.io/data/reverse-geocode-client";
const GEO_TIMEOUT_MS = 10_000;
const MAX_AGE_MS = 30 * 60 * 1000;
const PERMISSION_DENIED = 1;

// ~1 km precision: plenty for weather, and avoids refetching for tiny GPS jitter.
const round = (n) => Math.round(n * 100) / 100;

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Location not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: GEO_TIMEOUT_MS,
      maximumAge: MAX_AGE_MS,
      enableHighAccuracy: false,
    });
  });
}

async function placeName(lat, lon) {
  try {
    const params = new URLSearchParams({ latitude: lat, longitude: lon, localityLanguage: "en" });
    const res = await fetch(`${REVERSE_URL}?${params}`);
    if (!res.ok) throw new Error(`Reverse geocode HTTP ${res.status}`);
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || "My location";
  } catch (err) {
    console.warn("Place name lookup failed", err);
    return "My location";
  }
}

async function locate() {
  const pos = await getPosition();
  const lat = round(pos.coords.latitude);
  const lon = round(pos.coords.longitude);
  const s = getSettings();
  if (lat === s.lat && lon === s.lon) return;
  updateSettings({ lat, lon, city: await placeName(lat, lon) });
}

// Uses the device location when enabled; otherwise keeps the saved city.
export async function refreshLocation() {
  const note = $("w-note");
  if (!getSettings().useLocation) {
    note.textContent = "";
    return;
  }
  try {
    await locate();
    note.textContent = "";
  } catch (err) {
    console.warn("Location failed", err);
    note.textContent = err.code === PERMISSION_DENIED
      ? "Location blocked. Showing saved city."
      : "Couldn't get location. Showing saved city.";
  }
}
