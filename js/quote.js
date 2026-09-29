import { $, el } from "./dom.js";
import { quoteOfDay } from "./logic.js";
import { QUOTES } from "./quotes.js";

let shownDay = "";

export function renderQuote(now) {
  const day = now.toDateString();
  if (day === shownDay) return;
  shownDay = day;
  const quote = quoteOfDay(QUOTES, now);
  $("quote").replaceChildren(el("span", "", `“${quote.text}”`), el("cite", "", `— ${quote.author}`));
}
