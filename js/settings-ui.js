import { $ } from "./dom.js";
import { getSettings, updateSettings } from "./settings.js";
import { geocode } from "./geo.js";
import { exportAll, importAll, validateBackup } from "./storage.js";

const WORLD_SLOTS = 3;
const EXPORT_NAME = "settings.json";
const slotIds = Array.from({ length: WORLD_SLOTS }, (_, i) => `s-world-${i}`);

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

function fill() {
  const s = getSettings();
  $("s-city").value = s.city;
  slotIds.forEach((id, i) => { $(id).value = s.worldClocks[i]?.city ?? ""; });
  $("s-h24").checked = s.h24;
  $("s-night-auto").checked = s.night.auto;
  $("s-night-start").value = s.night.start;
  $("s-night-end").value = s.night.end;
  $("s-error").textContent = "";
}

async function resolveCity(current) {
  const name = $("s-city").value.trim();
  if (!name || same(name, current.city)) return {};
  const place = await geocode(name);
  return { city: place.city, lat: place.lat, lon: place.lon };
}

function resolveWorldClocks(current) {
  const names = slotIds.map((id) => $(id).value.trim()).filter(Boolean);
  return Promise.all(names.map(async (name) => {
    const existing = current.find((c) => same(c.city, name));
    if (existing) return existing;
    const place = await geocode(name);
    return { city: place.city, tz: place.tz };
  }));
}

async function onSave(event) {
  event.preventDefault();
  const s = getSettings();
  const saveBtn = $("s-save");
  saveBtn.disabled = true;
  $("s-error").textContent = "";
  try {
    const [place, worldClocks] = await Promise.all([resolveCity(s), resolveWorldClocks(s.worldClocks)]);
    updateSettings({
      ...place,
      worldClocks,
      h24: $("s-h24").checked,
      night: {
        auto: $("s-night-auto").checked,
        start: $("s-night-start").value || s.night.start,
        end: $("s-night-end").value || s.night.end,
      },
    });
    $("settings").close();
  } catch (err) {
    $("s-error").textContent = err.message;
  } finally {
    saveBtn.disabled = false;
  }
}

function onExport() {
  const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = EXPORT_NAME;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function onImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const check = validateBackup(data);
    if (!check.ok) throw new Error(check.error);
    importAll(data);
    location.reload();
  } catch (err) {
    $("s-error").textContent = err instanceof SyntaxError ? "That file isn't valid JSON." : err.message;
  } finally {
    event.target.value = "";
  }
}

export function initSettingsUi() {
  $("settings-btn").addEventListener("click", () => {
    fill();
    $("settings").showModal();
  });
  $("s-cancel").addEventListener("click", () => $("settings").close());
  $("settings-form").addEventListener("submit", onSave);
  $("s-export").addEventListener("click", onExport);
  $("s-import").addEventListener("change", onImport);
}
