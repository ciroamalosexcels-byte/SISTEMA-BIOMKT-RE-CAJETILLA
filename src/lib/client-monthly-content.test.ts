import { describe, expect, it } from "vitest";
import { findMonthlyRecord, getMostRecentContratado, resolveMonthlyContent } from "./client-monthly-content";
import type { ClientMonthlyContent } from "@/types";

function makeRecord(patch: Partial<ClientMonthlyContent> = {}): ClientMonthlyContent {
  return {
    id: "cmc-1",
    clientId: "lead-1",
    month: "2026-08",
    historiasHechas: 0,
    historiasContratadas: 0,
    reelsHechos: 0,
    reelsContratados: 0,
    publicacionesHechas: 0,
    publicacionesContratadas: 0,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    ...patch,
  };
}

describe("findMonthlyRecord", () => {
  it("finds the record for a client and month", () => {
    const records = [makeRecord({ month: "2026-07" }), makeRecord({ month: "2026-08" })];
    expect(findMonthlyRecord(records, "lead-1", "2026-08")?.month).toBe("2026-08");
  });

  it("returns undefined when there is no match", () => {
    expect(findMonthlyRecord([], "lead-1", "2026-08")).toBeUndefined();
    expect(findMonthlyRecord([makeRecord({ clientId: "otro" })], "lead-1", "2026-08")).toBeUndefined();
  });
});

describe("getMostRecentContratado", () => {
  it("picks the most recent month before beforeMonth that has contratado data", () => {
    const records = [
      makeRecord({ month: "2026-06", historiasContratadas: 5 }),
      makeRecord({ month: "2026-07", historiasContratadas: 7, reelsContratados: 8, publicacionesContratadas: 4 }),
    ];
    expect(getMostRecentContratado(records, "lead-1", "2026-08")).toEqual({
      historiasContratadas: 7, reelsContratados: 8, publicacionesContratadas: 4,
    });
  });

  it("ignores months with all-zero contratado values", () => {
    const records = [
      makeRecord({ month: "2026-06", historiasContratadas: 5 }),
      makeRecord({ month: "2026-07" }), // all zero
    ];
    expect(getMostRecentContratado(records, "lead-1", "2026-08").historiasContratadas).toBe(5);
  });

  it("returns all zeros when there is no prior record", () => {
    expect(getMostRecentContratado([], "lead-1", "2026-08")).toEqual({
      historiasContratadas: 0, reelsContratados: 0, publicacionesContratadas: 0,
    });
  });

  it("ignores records from the same month or later", () => {
    const records = [makeRecord({ month: "2026-08", historiasContratadas: 7 })];
    expect(getMostRecentContratado(records, "lead-1", "2026-08").historiasContratadas).toBe(0);
  });
});

describe("resolveMonthlyContent", () => {
  it("returns the explicit record for the month when one exists", () => {
    const records = [makeRecord({ month: "2026-08", historiasHechas: 3, historiasContratadas: 7 })];
    expect(resolveMonthlyContent(records, "lead-1", "2026-08")).toEqual(records[0]);
  });

  it("carries the last contracted amounts forward with hecho at 0 when the month has no record", () => {
    const records = [
      makeRecord({ month: "2026-06", historiasHechas: 7, historiasContratadas: 7, reelsHechos: 2, reelsContratados: 3 }),
    ];
    // "2026-08" never had its own record — repeats June's contratado, but hecho resets.
    expect(resolveMonthlyContent(records, "lead-1", "2026-08")).toEqual({
      historiasHechas: 0, historiasContratadas: 7,
      reelsHechos: 0, reelsContratados: 3,
      publicacionesHechas: 0, publicacionesContratadas: 0,
    });
  });

  it("does not let a later explicit change leak backward into earlier months", () => {
    const records = [
      makeRecord({ month: "2026-08", historiasHechas: 7, historiasContratadas: 7 }),
      makeRecord({ month: "2026-12", historiasHechas: 0, historiasContratadas: 10 }), // changed in December
    ];
    // September (before December) still carries August's 7, unaffected by December's 10.
    expect(resolveMonthlyContent(records, "lead-1", "2026-09")?.historiasContratadas).toBe(7);
    // January repeats December's new value forward.
    expect(resolveMonthlyContent(records, "lead-1", "2027-01")?.historiasContratadas).toBe(10);
  });

  it("returns undefined when the client never had anything contracted", () => {
    expect(resolveMonthlyContent([], "lead-1", "2026-08")).toBeUndefined();
  });
});
