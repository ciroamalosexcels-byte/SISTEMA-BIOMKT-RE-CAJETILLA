import { describe, expect, it } from "vitest";
import {
  dateForMonth,
  planFutureOccurrences,
  planMaterializationOccurrences,
  planOccurrenceMonths,
} from "./bulk-events";

describe("bulk event recurrence planning", () => {
  it("treats repeatCount as additional occurrences for count recurrence", () => {
    expect(planOccurrenceMonths({
      startMonth: "2026-07",
      recurrence: "count",
      repeatCount: 2,
    }, "2026-07")).toEqual(["2026-07", "2026-08", "2026-09"]);
  });

  it("plans monthly recurrence through the month 12 months after the current month", () => {
    const occurrences = planFutureOccurrences({
      startMonth: "2026-05",
      recurrence: "monthly",
      repeatCount: 0,
      dayOfMonth: 20,
    }, "2026-07-15");

    expect(occurrences).toHaveLength(13);
    expect(occurrences[0]).toEqual({ month: "2026-07", date: "2026-07-20" });
    expect(occurrences.at(-1)).toEqual({ month: "2027-07", date: "2027-07-20" });
  });

  it("backfills every monthly occurrence since the start after downtime", () => {
    const occurrences = planMaterializationOccurrences({
      startMonth: "2026-05",
      recurrence: "monthly",
      repeatCount: 0,
      dayOfMonth: 31,
    }, "2026-07");

    expect(occurrences).toHaveLength(15);
    expect(occurrences.slice(0, 3)).toEqual([
      { month: "2026-05", date: "2026-05-31" },
      { month: "2026-06", date: "2026-06-30" },
      { month: "2026-07", date: "2026-07-31" },
    ]);
    expect(occurrences.at(-1)).toEqual({ month: "2027-07", date: "2027-07-31" });
  });

  it("retains a future monthly start beyond the rolling horizon", () => {
    expect(planFutureOccurrences({
      startMonth: "2028-01",
      recurrence: "monthly",
      repeatCount: 0,
      dayOfMonth: 10,
    }, "2026-07-15")).toEqual([{ month: "2028-01", date: "2028-01-10" }]);
  });

  it("clamps late month days in leap and non-leap February", () => {
    expect(dateForMonth("2028-02", 31)).toBe("2028-02-29");
    expect(dateForMonth("2027-02", 31)).toBe("2027-02-28");
  });

  it("filters concrete dates before today", () => {
    expect(planFutureOccurrences({
      startMonth: "2026-05",
      recurrence: "count",
      repeatCount: 3,
      dayOfMonth: 10,
    }, "2026-07-15")).toEqual([{ month: "2026-08", date: "2026-08-10" }]);
  });

  it("rejects count recurrence above the backend cap", () => {
    expect(() => planOccurrenceMonths({
      startMonth: "2026-07",
      recurrence: "count",
      repeatCount: 121,
    }, "2026-07")).toThrow("Repeat count must be an integer from 0 to 120");
  });
});
