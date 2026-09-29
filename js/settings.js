import { KEYS, load, save } from "./storage.js";

const DEFAULTS = {
  city: "Paris",
  lat: 48.8566,
  lon: 2.3522,
  useLocation: true,
  h24: true,
  focusMin: 25,
  breakMin: 5,
  night: { auto: true, start: "22:00", end: "07:00" },
};

const listeners = [];

function merge(base, patch) {
  const safe = patch && typeof patch === "object" ? patch : {};
  return { ...base, ...safe, night: { ...base.night, ...(safe.night || {}) } };
}

let current = merge(DEFAULTS, load(KEYS.settings, {}));

export const getSettings = () => current;

export function updateSettings(patch) {
  current = merge(current, patch);
  save(KEYS.settings, current);
  listeners.forEach((fn) => fn(current));
}

export function onSettingsChange(fn) {
  listeners.push(fn);
}
