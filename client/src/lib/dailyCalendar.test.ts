import { describe, expect, it } from "vitest";
import { dailyCalendarMonth } from "./dailyCalendar";

describe("daily calendar layout", () => {
  it("aligns September 2026 to Tuesday and includes future dates without overflow weeks", () => {
    const month = dailyCalendarMonth("2026-09-18");
    expect(month.label).toBe("setembro de 2026");
    expect(month.cells).toHaveLength(35);
    expect(month.cells.slice(0, 3)).toEqual([null, null, { day: 1, date: "2026-09-01" }]);
    expect(month.cells.filter(Boolean)).toHaveLength(30);
  });
  it("handles leap February and six-week months", () => {
    expect(dailyCalendarMonth("2028-02-01").cells.filter(Boolean)).toHaveLength(29);
    expect(dailyCalendarMonth("2027-02-01").cells.filter(Boolean)).toHaveLength(28);
    expect(dailyCalendarMonth("2026-08-01").cells).toHaveLength(42);
    expect(dailyCalendarMonth("2026-08-31").cells[36]).toEqual({ day: 31, date: "2026-08-31" });
  });
});
