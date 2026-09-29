import { $, el } from "./dom.js";
import { getSettings } from "./settings.js";
import { quoteOfDay } from "./logic.js";
import { QUOTES } from "./quotes.js";

let quoteDay = "";

export function formatTime(date, timeZone) {
  return date.toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", hour12: !getSettings().h24, timeZone,
  });
}

export function formatDate(date) {
  return date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
}

export function renderClock(now) {
  $("time").textContent = formatTime(now);
  $("date").textContent = formatDate(now);
}

function safeTime(now, tz) {
  try {
    return formatTime(now, tz);
  } catch (err) {
    console.warn("Bad time zone", tz, err);
    return "--:--";
  }
}

export function renderWorldClocks(now) {
  const rows = getSettings().worldClocks.map(({ city, tz }) => {
    const row = el("div", "world-row");
    row.append(el("span", "", city), el("span", "t", safeTime(now, tz)));
    return row;
  });
  $("world").replaceChildren(...rows);
}

export function renderQuote(now) {
  const key = now.toDateString();
  if (key === quoteDay) return;
  quoteDay = key;
  const quote = quoteOfDay(QUOTES, now);
  $("quote").replaceChildren(el("span", "", `“${quote.text}”`), el("cite", "", `— ${quote.author}`));
}
