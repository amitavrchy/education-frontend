import { describe, expect, it } from "vitest";
import { MAX_INTERVAL_DAYS, schedule } from "@/services/flashcards.service";

const fresh = { ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0 };
const now = new Date("2026-01-01T10:00:00Z");

describe("spaced repetition schedule (SM-2 lite)", () => {
  it("'again' resets repetitions, adds a lapse and is due in 10 minutes", () => {
    const r = schedule({ ...fresh, repetitions: 3, intervalDays: 10 }, "again", now);
    expect(r.repetitions).toBe(0);
    expect(r.lapses).toBe(1);
    expect(r.intervalDays).toBe(0);
    expect(new Date(r.dueAt).getTime() - now.getTime()).toBe(10 * 60_000);
  });
  it("first reviews follow the 1/3 then 3/6 day ladder", () => {
    expect(schedule(fresh, "medium", now).intervalDays).toBe(1);
    expect(schedule(fresh, "easy", now).intervalDays).toBe(3);
    expect(schedule({ ...fresh, repetitions: 1, intervalDays: 1 }, "hard", now).intervalDays).toBe(3);
    expect(schedule({ ...fresh, repetitions: 1, intervalDays: 1 }, "medium", now).intervalDays).toBe(6);
  });
  it("later intervals grow with ease, easy > medium > hard", () => {
    const card = { ...fresh, repetitions: 3, intervalDays: 10 };
    const hard = schedule(card, "hard", now).intervalDays;
    const med = schedule(card, "medium", now).intervalDays;
    const easy = schedule(card, "easy", now).intervalDays;
    expect(hard).toBeLessThan(med);
    expect(med).toBeLessThan(easy);
  });
  it("keeps ease between 1.3 and 2.8", () => {
    let c = { ...fresh };
    for (let i = 0; i < 20; i++) c = { ...c, ...schedule(c, "again", now) };
    expect(c.ease).toBe(1.3);
    for (let i = 0; i < 40; i++) c = { ...c, ...schedule(c, "easy", now) };
    expect(c.ease).toBeLessThanOrEqual(2.8);
  });
  it("caps the interval so repeated easy reviews never produce an invalid date", () => {
    let c = { ...fresh };
    for (let i = 0; i < 60; i++) c = { ...c, ...schedule(c, "easy", now) };
    expect(c.intervalDays).toBe(MAX_INTERVAL_DAYS);
  });
});
