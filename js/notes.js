import { $ } from "./dom.js";
import { KEYS, load, save } from "./storage.js";

export function initNotes() {
  const area = $("notes");
  const saved = load(KEYS.notes, "");
  area.value = typeof saved === "string" ? saved : "";
  area.addEventListener("input", () => save(KEYS.notes, area.value));
}
