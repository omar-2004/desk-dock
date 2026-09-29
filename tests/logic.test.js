import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aqiLabel, clamp, dateKey, describeWeather, formatSeconds, hourlyFrom, isNightTime,
  isValidLayout, lastNDays, nextStatus, pickOfWeek, quoteOfDay, remainingSeconds,
  resizeColumns, streak,
} from "../js/logic.js";
import { validateBackup } from "../js/storage.js";

const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

test("formatSeconds pads minutes and seconds", () => {
  assert.equal(formatSeconds(25 * 60), "25:00");
  assert.equal(formatSeconds(65), "01:05");
  assert.equal(formatSeconds(90 * 60), "90:00");
});

test("remainingSeconds rounds up and never goes negative", () => {
  assert.equal(remainingSeconds(10_500, 10_000), 1);
  assert.equal(remainingSeconds(70_000, 10_000), 60);
  assert.equal(remainingSeconds(5_000, 10_000), 0);
});

test("clamp keeps value in range", () => {
  assert.equal(clamp(3, 5, 10), 5);
  assert.equal(clamp(12, 5, 10), 10);
  assert.equal(clamp(7, 5, 10), 7);
});

test("dateKey uses local calendar date", () => {
  assert.equal(dateKey(at(2026, 1, 5, 23, 59)), "2026-01-05");
});

test("lastNDays returns oldest to today across month boundary", () => {
  assert.deepEqual(lastNDays(3, at(2026, 10, 1)), ["2026-09-29", "2026-09-30", "2026-10-01"]);
});

test("streak counts consecutive days ending today", () => {
  assert.equal(streak(["2026-09-27", "2026-09-28", "2026-09-29"], at(2026, 9, 29)), 3);
});

test("streak still counts from yesterday when today not done yet", () => {
  assert.equal(streak(["2026-09-27", "2026-09-28"], at(2026, 9, 29)), 2);
});

test("streak is zero after a missed day", () => {
  assert.equal(streak(["2026-09-26"], at(2026, 9, 29)), 0);
  assert.equal(streak([], at(2026, 9, 29)), 0);
});

test("isNightTime handles ranges crossing midnight", () => {
  assert.equal(isNightTime(at(2026, 9, 29, 23, 30), "22:00", "07:00"), true);
  assert.equal(isNightTime(at(2026, 9, 29, 6, 59), "22:00", "07:00"), true);
  assert.equal(isNightTime(at(2026, 9, 29, 7, 0), "22:00", "07:00"), false);
  assert.equal(isNightTime(at(2026, 9, 29, 14, 0), "22:00", "07:00"), false);
});

test("isNightTime handles same-day ranges and empty range", () => {
  assert.equal(isNightTime(at(2026, 9, 29, 13, 0), "12:00", "14:00"), true);
  assert.equal(isNightTime(at(2026, 9, 29, 15, 0), "12:00", "14:00"), false);
  assert.equal(isNightTime(at(2026, 9, 29, 12, 0), "12:00", "12:00"), false);
});

test("aqiLabel maps European AQI bands", () => {
  assert.equal(aqiLabel(10), "Good");
  assert.equal(aqiLabel(40), "Fair");
  assert.equal(aqiLabel(55), "Moderate");
  assert.equal(aqiLabel(150), "Extremely poor");
});

test("describeWeather falls back for unknown codes", () => {
  assert.deepEqual(describeWeather(0), ["☀️", "Clear"]);
  assert.deepEqual(describeWeather(1234), ["·", "—"]);
});

test("quoteOfDay is stable within a day and changes the next day", () => {
  const quotes = ["a", "b", "c"];
  assert.equal(quoteOfDay(quotes, at(2026, 9, 29, 1)), quoteOfDay(quotes, at(2026, 9, 29, 23)));
  assert.notEqual(quoteOfDay(quotes, at(2026, 9, 29)), quoteOfDay(quotes, at(2026, 9, 30)));
});

test("pickOfWeek is stable for 7 days then moves on", () => {
  const items = ["a", "b", "c", "d"];
  const first = pickOfWeek(items, at(2026, 10, 1)); // Thursday
  for (let d = 1; d <= 7; d += 1) assert.equal(pickOfWeek(items, at(2026, 10, d)), first);
  assert.notEqual(pickOfWeek(items, at(2026, 10, 8)), first);
  assert.equal(pickOfWeek([], at(2026, 10, 1)), null);
});

test("nextStatus cycles todo → reading → done → todo", () => {
  assert.equal(nextStatus("todo"), "reading");
  assert.equal(nextStatus("reading"), "done");
  assert.equal(nextStatus("done"), "todo");
  assert.equal(nextStatus("weird"), "todo");
});

test("hourlyFrom returns the hours after the current one", () => {
  const hourly = {
    time: ["2026-09-29T20:00", "2026-09-29T21:00", "2026-09-29T22:00", "2026-09-29T23:00"],
    temperature_2m: [15.4, 14.6, 13.2, 12.8],
    weather_code: [0, 1, 2, 3],
    precipitation_probability: [0, 10, null, 40],
  };
  assert.deepEqual(hourlyFrom(hourly, "2026-09-29T21:45", 2), [
    { time: "22:00", temp: 13, code: 2, rain: 0 },
    { time: "23:00", temp: 13, code: 3, rain: 40 },
  ]);
  assert.deepEqual(hourlyFrom(hourly, "2026-09-30T08:00", 2), []);
});

test("resizeColumns moves one border and keeps the total", () => {
  assert.deepEqual(resizeColumns([34, 33, 33], 0, 6, 20), [40, 27, 33]);
  assert.deepEqual(resizeColumns([34, 33, 33], 1, -3, 20), [34, 30, 36]);
});

test("resizeColumns stops at the minimum width", () => {
  assert.deepEqual(resizeColumns([34, 33, 33], 0, 50, 20), [47, 20, 33]);
  assert.deepEqual(resizeColumns([34, 33, 33], 0, -50, 20), [20, 47, 33]);
});

test("isValidLayout rejects bad saved layouts", () => {
  assert.equal(isValidLayout([34, 33, 33], 3, 20), true);
  assert.equal(isValidLayout([50, 50], 3, 20), false);
  assert.equal(isValidLayout([10, 45, 45], 3, 20), false);
  assert.equal(isValidLayout([40, 40, 40], 3, 20), false);
  assert.equal(isValidLayout("nope", 3, 20), false);
});

test("validateBackup accepts a real export", () => {
  const data = {
    "desk.settings": { city: "Paris" },
    "desk.todos": [],
    "desk.notes": "hi",
    "desk.habits": [],
    "desk.books": [],
    "desk.layout": [34, 33, 33],
    "desk.tab": "todo",
  };
  assert.deepEqual(validateBackup(data), { ok: true });
});

test("validateBackup rejects wrong shapes and unknown keys", () => {
  assert.equal(validateBackup([]).ok, false);
  assert.equal(validateBackup(null).ok, false);
  assert.equal(validateBackup({ "desk.todos": "nope" }).ok, false);
  assert.equal(validateBackup({ "evil.key": 1 }).ok, false);
});
