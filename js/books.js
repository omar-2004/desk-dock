import { $, el, button } from "./dom.js";
import { KEYS, createListStore, load, save } from "./storage.js";
import { nextStatus, pickOfWeek } from "./logic.js";
import { SEED_BOOKS } from "./book-seed.js";

const SEARCH_URL = "https://openlibrary.org/search.json";
const COVER_URL = "https://covers.openlibrary.org/b/id";
const LOOKUP_DELAY_MS = 400; // be polite to Open Library
const STATUS_LABEL = { todo: "To read", reading: "Reading", done: "Done" };
const STATUS_ORDER = { reading: 0, todo: 1, done: 2 };

if (load(KEYS.books, null) === null) {
  save(KEYS.books, SEED_BOOKS.map((book, i) => ({ id: i + 1, ...book, status: "todo" })));
}

const store = createListStore(KEYS.books, render);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setBook(id, patch) {
  store.set(store.get().map((b) => (b.id === id ? { ...b, ...patch } : b)));
}

async function searchBook(params) {
  const query = new URLSearchParams({ ...params, limit: "1", fields: "title,author_name,cover_i" });
  const res = await fetch(`${SEARCH_URL}?${query}`);
  if (!res.ok) throw new Error(`Open Library HTTP ${res.status}`);
  const data = await res.json();
  return data.docs?.[0] ?? null;
}

// Books without a coverId yet (seeds, or added while offline) get looked up once.
async function resolveMissingCovers() {
  const missing = store.get().filter((b) => b.coverId === undefined);
  for (const book of missing) {
    try {
      const params = book.author ? { title: book.title, author: book.author } : { q: book.title };
      const doc = await searchBook(params);
      setBook(book.id, { coverId: doc?.cover_i ?? null });
    } catch (err) {
      console.warn("Cover lookup failed; will retry next launch", book.title, err);
      return;
    }
    await sleep(LOOKUP_DELAY_MS);
  }
}

function cover(book, className) {
  const placeholder = () => el("div", `${className} cover-empty`, "📘");
  if (!book.coverId) return placeholder();
  const img = el("img", className);
  img.src = `${COVER_URL}/${book.coverId}-M.jpg`;
  img.alt = "";
  img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(placeholder()));
  return img;
}

function statusButton(book) {
  const status = STATUS_LABEL[book.status] ? book.status : "todo";
  return button(STATUS_LABEL[status], `status status-${status}`, () => setBook(book.id, { status: nextStatus(status) }));
}

function featured(items) {
  const reading = items.find((b) => b.status === "reading");
  if (reading) return { book: reading, label: "Now reading" };
  const pick = pickOfWeek(items.filter((b) => b.status === "todo"), new Date());
  return pick ? { book: pick, label: "Book of the week" } : null;
}

function renderFeatured(items) {
  const box = $("book-featured");
  const pick = featured(items);
  if (!pick) {
    $("book-heading").textContent = "Book of the week";
    box.replaceChildren(el("div", "muted", "All read! Add more books below."));
    return;
  }
  $("book-heading").textContent = pick.label;
  const info = el("div", "book-info");
  info.append(el("div", "book-title", pick.book.title), el("div", "muted", pick.book.author || ""), statusButton(pick.book));
  box.replaceChildren(cover(pick.book, "cover-lg"), info);
}

function renderItem(book) {
  const text = el("div", "grow");
  text.append(el("div", "book-name", book.title), el("div", "book-author", book.author || ""));
  const del = button("✕", "del", () => store.set(store.get().filter((b) => b.id !== book.id)));
  const li = el("li", book.status === "done" ? "done" : "");
  li.append(cover(book, "cover-sm"), text, statusButton(book), del);
  return li;
}

function render(items) {
  renderFeatured(items);
  const sorted = [...items].sort((a, b) => (STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1));
  $("book-list").replaceChildren(...sorted.map(renderItem));
}

async function add(event) {
  event.preventDefault();
  const input = $("book-input");
  const title = input.value.trim();
  if (!title) return;
  const addBtn = $("book-add");
  addBtn.disabled = true;
  $("book-error").textContent = "";
  try {
    const doc = await searchBook({ q: title });
    store.set([...store.get(), {
      id: Date.now(),
      title: doc?.title ?? title,
      author: doc?.author_name?.[0] ?? "",
      coverId: doc?.cover_i ?? null,
      status: "todo",
    }]);
  } catch (err) {
    console.warn("Book search failed", err);
    store.set([...store.get(), { id: Date.now(), title, author: "", status: "todo" }]);
    $("book-error").textContent = "Couldn't reach Open Library. Added without cover.";
  } finally {
    input.value = "";
    addBtn.disabled = false;
  }
}

export function initBooks() {
  render(store.get());
  $("book-form").addEventListener("submit", add);
  resolveMissingCovers();
}
