import { KEYS, load, save } from "./storage.js";

const DEFAULT_TAB = "todo";

export function initTabs() {
  const buttons = [...document.querySelectorAll("#tabs button")];
  const panels = [...document.querySelectorAll(".panel")];

  const show = (name) => {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    panels.forEach((p) => { p.hidden = p.dataset.panel !== name; });
    save(KEYS.tab, name);
  };

  buttons.forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));
  const saved = load(KEYS.tab, DEFAULT_TAB);
  show(buttons.some((b) => b.dataset.tab === saved) ? saved : DEFAULT_TAB);
}
