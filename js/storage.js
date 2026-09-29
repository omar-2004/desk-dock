// Everything is saved in this device's browser (localStorage).
// Export/import turns it into a settings.json file you can back up or move.

export const KEYS = {
  settings: "desk.settings",
  todos: "desk.todos",
  notes: "desk.notes",
  countdowns: "desk.countdowns", // legacy (v2), kept so old backups still import
  habits: "desk.habits",
  books: "desk.books",
  layout: "desk.layout",
  tab: "desk.tab",
};

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isString = (v) => typeof v === "string";

const BACKUP_SCHEMA = {
  [KEYS.settings]: isObject,
  [KEYS.todos]: Array.isArray,
  [KEYS.notes]: isString,
  [KEYS.countdowns]: Array.isArray,
  [KEYS.habits]: Array.isArray,
  [KEYS.books]: Array.isArray,
  [KEYS.layout]: Array.isArray,
  [KEYS.tab]: isString,
};

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (err) {
    console.warn("Storage read failed", key, err);
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("Storage write failed", key, err);
  }
}

// A saved array plus a callback that re-renders whenever it changes.
export function createListStore(key, onChange) {
  const saved = load(key, []);
  let items = Array.isArray(saved) ? saved : [];
  return {
    get: () => items,
    set(next) {
      items = next;
      save(key, items);
      onChange(items);
    },
  };
}

export function exportAll() {
  return Object.fromEntries(
    Object.values(KEYS)
      .map((key) => [key, load(key, null)])
      .filter(([, value]) => value !== null),
  );
}

export function validateBackup(data) {
  if (!isObject(data)) return { ok: false, error: "File is not a dashboard backup." };
  for (const [key, value] of Object.entries(data)) {
    const check = BACKUP_SCHEMA[key];
    if (!check) return { ok: false, error: `Unknown entry "${key}" in file.` };
    if (!check(value)) return { ok: false, error: `Entry "${key}" has the wrong format.` };
  }
  return { ok: true };
}

export function importAll(data) {
  Object.entries(data).forEach(([key, value]) => save(key, value));
}
