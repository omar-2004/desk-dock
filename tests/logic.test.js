import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aqiLabel, dateKey, daysLabel, daysUntil, describeWeather, formatSeconds,
  hourlyFrom, isNightTime, lastNDays, quoteOfDay, streak,
} from "../js/logic.js";
import { validateBackup } from "../js/storage.js";

const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

test("formatSeconds pads minutes and seconds", () => {
  assert.equal(formatSeconds(25 * 60), "25:00");
  assert.equal(formatSeconds(65), "01:05");
});

test("dateKey uses local calendar date", () => {
  assert.equal(dateKey(at(2026, 1, 5, 23, 59)), "2026-01-05");
});

test("daysUntil counts whole days, ignoring time of day", () => {
  const today = at(2026, 9, 29, 23, 0);
  assert.equal(daysUntil("2026-09-29", today), 0);
  assert.equal(daysUntil("2026-10-01", today), 2);
  assert.equal(daysUntil("2026-09-26", today), -3);
});

test("daysLabel reads naturally", () => {
  assert.equal(daysLabel(0), "Today");
  assert.equal(daysLabel(1), "Tomorrow");
  assert.equal(daysLabel(-1), "Yesterday");
  assert.equal(daysLabel(12), "12 days");
  assert.equal(daysLabel(-4), "4 days ago");
});

test("lastNDays returns oldest to today across month boundary", () => {
  assert.deepEqual(lastNDays(3, at(2026, 10, 1)), ["2026-09-29", "2026-09-30", "2026-10-01"]);
});

test("streak counts consecutive days ending today", () => {
  const days = ["2026-09-27", "2026-09-28", "2026-09-29"];
  assert.equal(streak(days, at(2026, 9, 29)), 3);
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

test("validateBackup accepts a real export", () => {
  const data = {
    "desk.settings": { city: "Paris" },
    "desk.todos": [],
    "desk.notes": "hi",
    "desk.habits": [],
    "desk.countdowns": [],
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
