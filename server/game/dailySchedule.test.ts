import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeWord } from "../../shared/words";
import { WORD_CATALOG, THEME_CATALOG, CATEGORY_HINTS } from "./dictionary";
import { DAILY_CATALOG_V2 } from "./dailyCatalogV2";
import { DAILY_CATALOG_V3, FREE_CATALOGS } from "./dailyCatalogV3";
import {
  createDailySchedule, DAILY_REPEAT_COOLDOWN, DAILY_V2_START, DAILY_V3_START,
  dayIndexForDate, isDailyDate,
} from "./dailySchedule";
import { getEntryForChallenge, getEntryForDate, getHintForChallenge } from "./engine";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

const DAY_MS = 86_400_000;
const start = Date.parse(`${DAILY_V3_START}T00:00:00Z`);
const dateAt = (offset: number) => new Date(start + offset * DAY_MS).toISOString().slice(0, 10);
const caller = appRouter.createCaller({
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

afterEach(() => vi.useRealTimers());

describe("versioned daily word selection", () => {
  it("has 360 distinct answers, unique clues and preserves the frozen catalogs", () => {
    expect(WORD_CATALOG).toHaveLength(50);
    expect(DAILY_CATALOG_V2).toHaveLength(300);
    expect(new Set(DAILY_CATALOG_V2.map(entry => normalizeWord(entry.word))).size).toBe(300);
    expect(DAILY_CATALOG_V2.length).toBeGreaterThan(DAILY_REPEAT_COOLDOWN);
    expect(DAILY_CATALOG_V3).toHaveLength(360);
    expect(new Set(DAILY_CATALOG_V3.map(entry => normalizeWord(entry.word))).size).toBe(360);
    expect(new Set(DAILY_CATALOG_V3.map(entry => entry.prompt)).size).toBe(360);
    expect(Object.values(FREE_CATALOGS).every(catalog => catalog.length > 0)).toBe(true);
    for (const entry of DAILY_CATALOG_V3) {
      expect(CATEGORY_HINTS[entry.category]).toBeTruthy();
      expect(entry.aliases[entry.word]).toBe(1);
      expect(Object.keys(entry.aliases).length).toBeGreaterThanOrEqual(5);
    }
  });

  it("keeps every historical answer before activation, including leap days", () => {
    const schedule = createDailySchedule();
    for (let day = 0; day < dayIndexForDate(DAILY_V2_START); day++) {
      const date = new Date(Date.parse("2024-01-01T00:00:00Z") + day * DAY_MS).toISOString().slice(0, 10);
      expect(schedule(date)).toBe(WORD_CATALOG[day % 50]);
    }
    expect(schedule("2026-09-18").word).toBe("chuva");
    expect(schedule("2023-12-31").word).toBe("ilha");
  });

  it("avoids the previous 180 days across 20 cycles and the legacy transition", () => {
    const schedule = createDailySchedule();
    const lastSeen = new Map<string, number>();
    for (let day = -DAILY_REPEAT_COOLDOWN; day < 6000; day++) {
      const word = normalizeWord(schedule(dateAt(day)).word);
      const previous = lastSeen.get(word);
      if (day >= 0 && previous !== undefined) {
        expect(day - previous, `${dateAt(day)}: ${word}`).toBeGreaterThan(DAILY_REPEAT_COOLDOWN);
      }
      lastSeen.set(word, day);
    }
    const catalog = DAILY_CATALOG_V3.map(entry => entry.word).sort();
    let previousOrder: string[] = [];
    for (let cycle = 0; cycle < 20; cycle++) {
      const order = Array.from({ length: 360 }, (_, day) => schedule(dateAt(cycle * 360 + day)).word);
      expect([...order].sort()).toEqual(catalog);
      expect(order).not.toEqual(previousOrder);
      previousOrder = order;
    }
  });

  it("reconstructs the same schedule after a restart or out-of-order requests", () => {
    const forward = createDailySchedule();
    const reverse = createDailySchedule();
    const expected = Array.from({ length: 800 }, (_, day) => forward(dateAt(day)).word);
    for (let day = 799; day >= 0; day--) {
      expect(reverse(dateAt(day)).word).toBe(expected[day]);
      expect(reverse(dateAt(day)).word).toBe(forward(dateAt(day)).word);
    }
  });

  it("locks published schedule examples against accidental seed or catalog changes", () => {
    const schedule = createDailySchedule();
    expect([
      "2026-09-19", "2026-09-20", "2027-04-07", "2027-04-08", "2028-02-29",
    ].map(date => schedule(date).word)).toEqual([
      "rua", "avião", "mesa", "ecossistema", "abacate",
    ]);
  });

  it("rejects malformed and impossible dates instead of silently normalizing them", () => {
    const schedule = createDailySchedule();
    for (const date of ["", "2026-9-19", "2026-02-29", "2026-02-30", "2026-13-01", "2026-09-19T00:00:00Z", "invalid"]) {
      expect(isDailyDate(date), date).toBe(false);
      expect(() => schedule(date)).toThrow(RangeError);
    }
    expect(isDailyDate("2028-02-29")).toBe(true);
  });
});

describe("daily challenge API", () => {
  it("makes every day of the current month playable with its original answer", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-18T12:00:00Z"));
    const archive = await caller.challenges.getDailyArchive();
    expect(archive.month).toBe("2026-09");
    expect(archive.today).toBe("2026-09-18");
    expect(archive.challenges).toHaveLength(18);
    expect(new Set(archive.challenges.map(day => day.challengeId)).size).toBe(18);
    expect(archive.challenges[0].challengeId).toBe("daily-2026-09-18");
    expect(archive.challenges.at(-1)?.challengeId).toBe("daily-2026-09-01");
    for (const day of archive.challenges) {
      expect(Object.keys(day).sort()).toEqual(["accent", "category", "challengeId", "label", "prompt"]);
      const date = day.challengeId.slice(6);
      expect(await caller.challenges.getDaily({ date })).toEqual(day);
      const entry = WORD_CATALOG[dayIndexForDate(date) % 50];
      await expect(caller.challenges.submitGuess({ challengeId: day.challengeId, word: entry.word }))
        .resolves.toMatchObject({ rank: 1, solved: true });
    }
    const entries = await Promise.all(archive.challenges.map(day => getEntryForChallenge(day.challengeId)));
    expect(new Set(entries.map(entry => entry?.word)).size).toBe(18);
    await expect(caller.challenges.getDaily({ date: "2026-09-19" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.challenges.getDaily({ date: "2026-02-30" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.each([
    ["2026-09-30", 30], ["2026-10-01", 1], ["2027-02-28", 28], ["2028-02-29", 29], ["2028-03-01", 1],
  ])("uses the Brazil-local month boundaries on %s", async (date, count) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${date}T23:59:59.999Z`));
    const archive = await caller.challenges.getDailyArchive();
    expect(archive.challenges).toHaveLength(count);
    expect(archive.challenges[0]).toEqual(await caller.challenges.getDaily());
    expect(archive.challenges.at(-1)?.challengeId).toBe(`daily-${date.slice(0, 7)}-01`);
    expect(archive.challenges.every(day => day.challengeId.slice(6) <= date)).toBe(true);
  });

  it("switches at midnight in São Paulo and returns metadata without answer data", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-19T02:59:59.999Z"));
    const before = await caller.challenges.getDaily();
    expect(before.challengeId).toBe("daily-2026-09-18");
    expect((await getEntryForChallenge(before.challengeId))?.word).toBe("chuva");
    vi.setSystemTime(new Date("2026-09-19T03:00:00Z"));
    const after = await caller.challenges.getDaily();
    expect(after.challengeId).toBe("daily-2026-09-19");
    expect(Object.keys(after).sort()).toEqual(["accent", "category", "challengeId", "label", "prompt"]);
    expect(after.label).toContain(`#${dayIndexForDate("2026-09-19") + 1}`);
    expect(await caller.challenges.getDaily()).toEqual(after);
    const entry = await getEntryForDate("2026-09-19");
    expect(await getHintForChallenge(after.challengeId)).toBe(entry.prompt);
    await expect(caller.challenges.submitGuess({ challengeId: after.challengeId, word: entry.word }))
      .resolves.toMatchObject({ rank: 1, proximity: 100, solved: true });
    const [alias, rank] = Object.entries(entry.aliases).find(([, value]) => value === 5)!;
    await expect(caller.challenges.submitGuess({ challengeId: after.challengeId, word: alias }))
      .resolves.toMatchObject({ rank, solved: false });
  });

  it("does not permit guesses or clues for future or invalid daily challenges", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-19T12:00:00Z"));
    for (const challengeId of ["daily-2026-09-20", "daily-9999-12-31", "daily-2026-02-30", "daily-invalid", "daily-"]) {
      expect(await getEntryForChallenge(challengeId)).toBeNull();
      expect(await getHintForChallenge(challengeId)).toBe(await getHintForChallenge("nonexistent"));
      await expect(caller.challenges.submitGuess({ challengeId, word: "casa" }))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    expect((await getEntryForChallenge("daily-2024-01-01"))?.word).toBe("farol");
    for (const theme of THEME_CATALOG) expect(await getEntryForChallenge(theme.id)).toBe(theme);
  });
});
