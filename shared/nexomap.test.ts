import { describe, expect, it } from "vitest";
import { calculateProgress, canViewMap, type ProgressSession } from "./nexomap";
const session = (
  day: string,
  changes: Partial<ProgressSession> = {}
): ProgressSession => ({
  challengeId: "daily-" + day,
  completedAt: day + "T14:00:00Z",
  solved: 1,
  verified: 1,
  guesses: 4,
  retryCount: 0,
  ...changes,
});
describe("NexoMap progression", () => {
  it("counts unique completed challenges and uses separate achievement conditions", () => {
    const result = calculateProgress(
      [
        session("2026-09-16"),
        session("2026-09-16"),
        session("2026-09-17", { guesses: 9 }),
        session("2026-09-18", { retryCount: 1 }),
        session("2026-09-15", { solved: 0 }),
      ],
      new Date("2026-09-18T20:00:00Z")
    );
    expect(result.solved).toBe(3);
    expect(result.precise).toBe(1);
    expect(result.streak).toBe(3);
    expect(result.achievements.find(a => a.id === "spark")?.unlocked).toBe(
      true
    );
    expect(result.achievements.find(a => a.id === "explorer")?.unlocked).toBe(
      false
    );
  });
  it("does not turn archive completions or legacy counters into daily streaks or precision", () => {
    const result = calculateProgress(
      [
        session("2026-09-16", { completedAt: "2026-09-18T12:00:00Z" }),
        session("2026-09-17", { verified: 0, completedAt: null }),
        session("2026-09-18"),
      ],
      new Date("2026-09-18T20:00:00Z")
    );
    expect(result.streak).toBe(1);
    expect(result.precise).toBe(2);
    expect(result.legacy).toBe(1);
    expect(result.weekly).toBe(2);
    expect(result.activity.at(-1)?.count).toBe(2);
  });
  it("preserves the longest streak after inactivity, across month and year boundaries", () => {
    const sessions = ["2025-12-30", "2025-12-31", "2026-01-01"].map(d =>
      session(d)
    );
    expect(
      calculateProgress(sessions, new Date("2026-01-02T20:00:00Z")).streak
    ).toBe(3);
    const later = calculateProgress(sessions, new Date("2026-01-03T00:00:00Z"));
    expect(later.streak).toBe(0);
    expect(later.longestStreak).toBe(3);
    expect(later.achievements.find(a => a.id === "spark")?.unlocked).toBe(true);
  });
  it("uses UTC completion dates rather than local dates", () => {
    const result = calculateProgress(
      [session("2026-09-18", { completedAt: "2026-09-17T21:10:00-03:00" })],
      new Date("2026-09-18T01:00:00Z")
    );
    expect(result.streak).toBe(1);
  });
  it("keeps a fresh account empty", () => {
    const p = calculateProgress([], new Date("2026-09-18"));
    expect(p.xp).toBe(0);
    expect(p.level).toBe(1);
    expect(p.achievements.some(a => a.unlocked)).toBe(false);
  });
});
describe("map visibility", () => {
  it.each([
    ["public", false, false, false, true],
    ["friends", false, false, false, false],
    ["friends", false, true, false, true],
    ["private", false, true, false, false],
    ["private", true, false, false, true],
    ["public", false, true, true, false],
  ] as const)(
    "%s, owner=%s friend=%s blocked=%s => %s",
    (scope, owner, friend, blocked, expected) => {
      expect(canViewMap(scope, owner, friend, blocked)).toBe(expected);
    }
  );
});
