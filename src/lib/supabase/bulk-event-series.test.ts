import { describe, expect, it } from "vitest";
import type { BulkEventSeriesInput } from "@/types/content-event";
import {
  BulkEventSeriesValidationError,
  buildBulkEventRows,
  buildFutureOccurrenceIds,
  deterministicOccurrenceId,
  parseBulkEventSeriesInput,
} from "./bulk-event-series";

const validInput = {
  kind: "content",
  title: "Publicar historia",
  type: "HISTORIA",
  clientIds: ["11111111-1111-4111-8111-111111111111"],
  dayOfMonth: 31,
  time: "19:00",
  startMonth: "2026-07",
  recurrence: "monthly",
  repeatCount: 0,
} satisfies BulkEventSeriesInput;

describe("bulk event series persistence helpers", () => {
  it("creates stable UUIDv5 occurrence ids per client and month", () => {
    const seriesId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const first = deterministicOccurrenceId(seriesId, "content", validInput.clientIds[0], "2026-07");
    const same = deterministicOccurrenceId(seriesId, "content", validInput.clientIds[0], "2026-07");
    const nextMonth = deterministicOccurrenceId(seriesId, "content", validInput.clientIds[0], "2026-08");

    expect(first).toBe(same);
    expect(first).not.toBe(nextMonth);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("normalizes valid input and removes duplicate clients", () => {
    expect(parseBulkEventSeriesInput({
      ...validInput,
      title: "  Publicar historia  ",
      clientIds: [...validInput.clientIds, ...validInput.clientIds],
    })).toEqual(validInput);
  });

  it("rejects a type that does not belong to the selected calendar", () => {
    expect(() => parseBulkEventSeriesInput({ ...validInput, type: "Cobro" }))
      .toThrow(BulkEventSeriesValidationError);
  });

  it("accepts repeatCount 120 and rejects values above it", () => {
    expect(parseBulkEventSeriesInput({
      ...validInput,
      recurrence: "count",
      repeatCount: 120,
    }).repeatCount).toBe(120);

    expect(() => parseBulkEventSeriesInput({
      ...validInput,
      recurrence: "count",
      repeatCount: 121,
    })).toThrow("repeatCount debe ser un entero entre 0 y 120");
  });

  it("requires at least one repetition for count recurrence", () => {
    expect(() => parseBulkEventSeriesInput({
      ...validInput,
      recurrence: "count",
      repeatCount: 0,
    })).toThrow("repeatCount debe ser al menos 1 para count");
  });

  it("builds deterministic materialization payloads including elapsed months", () => {
    const series = {
      ...validInput,
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      createdAt: "2026-05-01T00:00:00Z",
      updatedAt: "2026-05-01T00:00:00Z",
      startMonth: "2026-05",
    } as const;

    const first = buildBulkEventRows(series, "2026-07-15");
    const second = buildBulkEventRows(series, "2026-07-15");

    expect(first).toEqual(second);
    expect(first.managementRows).toEqual([]);
    expect(first.contentRows).toHaveLength(15);
    expect(first.contentRows[0]).toMatchObject({
      id: deterministicOccurrenceId(series.id, "content", series.clientIds[0], "2026-05"),
      scheduled_date: "2026-05-31T19:00",
      status: "SIN EDITAR",
    });
  });

  it("keeps mutation rows and deterministic cleanup ids future-only", () => {
    const series = {
      ...validInput,
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      createdAt: "2026-05-01T00:00:00Z",
      updatedAt: "2026-05-01T00:00:00Z",
      startMonth: "2026-05",
      dayOfMonth: 10,
    } as const;

    const rows = buildBulkEventRows(series, "2026-07-15", "future");
    const ids = buildFutureOccurrenceIds(series, "2026-07-15");

    expect(rows.contentRows).toHaveLength(12);
    expect(rows.contentRows[0].scheduled_date).toBe("2026-08-10T19:00");
    expect(ids.contentIds).toHaveLength(12);
    expect(ids.contentIds[0]).toBe(
      deterministicOccurrenceId(series.id, "content", series.clientIds[0], "2026-08"),
    );
    expect(ids.managementIds).toEqual([]);
  });
});
