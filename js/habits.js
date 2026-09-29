import { $, el, button } from "./dom.js";
import { KEYS, createListStore } from "./storage.js";
import { dateKey, lastNDays, streak } from "./logic.js";

const HISTORY_LIMIT = 400; // days kept per habit
const WEEK_DOTS = 7;

const store = createListStore(KEYS.habits, render);

const daysOf = (habit) => (Array.isArray(habit.days) ? habit.days : []);

function toggleToday(habit) {
  const today = dateKey(new Date());
  const days = daysOf(habit);
  const next = days.includes(today)
    ? days.filter((d) => d !== today)
    : [...days, today].slice(-HISTORY_LIMIT);
  store.set(store.get().map((h) => (h.id === habit.id ? { ...h, days: next } : h)));
}

function renderItem(habit, week, now) {
  const days = daysOf(habit);
  const doneToday = days.includes(dateKey(now));
  const check = button("✓", doneToday ? "check-btn on" : "check-btn", () => toggleToday(habit));
  const dots = el("div", "dots");
  week.forEach((d) => dots.append(el("span", days.includes(d) ? "dot on" : "dot")));
  const count = streak(days, now);
  const del = button("✕", "del", () => store.set(store.get().filter((h) => h.id !== habit.id)));

  const li = el("li");
  li.append(check, el("span", "grow", habit.name), dots, el("span", "streak", count ? `🔥 ${count}` : ""), del);
  return li;
}

function render(items) {
  const now = new Date();
  const week = lastNDays(WEEK_DOTS, now);
  $("habit-list").replaceChildren(...items.map((h) => renderItem(h, week, now)));
}

function add(event) {
  event.preventDefault();
  const input = $("habit-input");
  const name = input.value.trim();
  if (!name) return;
  store.set([...store.get(), { id: Date.now(), name, days: [] }]);
  input.value = "";
}

export const refreshHabits = () => render(store.get());

export function initHabits() {
  refreshHabits();
  $("habit-form").addEventListener("submit", add);
}
