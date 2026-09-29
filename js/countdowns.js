import { $, el, button } from "./dom.js";
import { KEYS, createListStore } from "./storage.js";
import { daysLabel, daysUntil } from "./logic.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const store = createListStore(KEYS.countdowns, render);

function prettyDate(isoDate) {
  return new Date(`${isoDate}T12:00`).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function renderItem(item, now) {
  const n = daysUntil(item.date, now);
  const text = el("span", "grow");
  text.append(el("div", "", item.name), el("div", "cd-date", prettyDate(item.date)));
  const del = button("✕", "del", () => store.set(store.get().filter((c) => c.id !== item.id)));

  const li = el("li", n < 0 ? "done" : "");
  li.append(text, el("span", "cd-days", daysLabel(n)), del);
  return li;
}

function render(items) {
  const now = new Date();
  const valid = items.filter((c) => DATE_PATTERN.test(c.date));
  const sorted = [...valid].sort((a, b) => a.date.localeCompare(b.date));
  $("cd-list").replaceChildren(...sorted.map((c) => renderItem(c, now)));
}

function add(event) {
  event.preventDefault();
  const name = $("cd-name").value.trim();
  const date = $("cd-date").value;
  if (!name || !DATE_PATTERN.test(date)) return;
  store.set([...store.get(), { id: Date.now(), name, date }]);
  $("cd-name").value = "";
  $("cd-date").value = "";
}

export const refreshCountdowns = () => render(store.get());

export function initCountdowns() {
  refreshCountdowns();
  $("cd-form").addEventListener("submit", add);
}
