import { $, el, button } from "./dom.js";
import { KEYS, createListStore } from "./storage.js";

const store = createListStore(KEYS.todos, render);

function renderItem(todo) {
  const li = el("li", todo.done ? "done" : "");
  const box = el("input");
  box.type = "checkbox";
  box.checked = Boolean(todo.done);
  box.addEventListener("change", () =>
    store.set(store.get().map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t))));
  const del = button("✕", "del", () => store.set(store.get().filter((t) => t.id !== todo.id)));
  li.append(box, el("span", "grow", todo.text), del);
  return li;
}

function render(items) {
  $("todo-list").replaceChildren(...items.map(renderItem));
}

function add(event) {
  event.preventDefault();
  const input = $("todo-input");
  const text = input.value.trim();
  if (!text) return;
  store.set([...store.get(), { id: Date.now(), text, done: false }]);
  input.value = "";
}

export function initTodos() {
  render(store.get());
  $("todo-form").addEventListener("submit", add);
}
