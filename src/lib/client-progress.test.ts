import { describe, expect, it } from "vitest";
import { getContratadoProgress, getEstadoProgress } from "./client-progress";
import type { ClientMonthlyContent, ContentEvent } from "@/types";

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

function makeEvent(patch: Partial<ContentEvent> = {}): ContentEvent {
  return {
    id: "ev-1",
    clientId: "lead-1",
    title: "Evento",
    type: "REEL",
    status: "SIN EDITAR",
    scheduledDate: "2026-08-05",
    order: 0,
    done: false,
    timerSeconds: 0,
    timerRunning: false,
    ...patch,
  } as ContentEvent;
}

describe("getContratadoProgress", () => {
  it("returns null when there is no record for the month", () => {
    expect(getContratadoProgress(undefined)).toBeNull();
  });

  it("returns null when the record has no contracted content", () => {
    expect(getContratadoProgress(makeRecord())).toBeNull();
  });

  it("sums hecho/contratado across categories with contratado > 0", () => {
    const record = makeRecord({
      historiasHechas: 7, historiasContratadas: 7,
      reelsHechos: 0, reelsContratados: 8,
      publicacionesHechas: 0, publicacionesContratadas: 4,
    });
    // (7 + 0 + 0) / (7 + 8 + 4) = 7/19
    expect(getContratadoProgress(record)).toBeCloseTo(7 / 19);
  });

  it("ignores categories with contratado = 0", () => {
    const record = makeRecord({ historiasHechas: 2, historiasContratadas: 4 });
    expect(getContratadoProgress(record)).toBe(0.5);
  });

  it("returns 1 when everything contracted is done", () => {
    const record = makeRecord({ reelsHechos: 3, reelsContratados: 3 });
    expect(getContratadoProgress(record)).toBe(1);
  });
});

describe("getEstadoProgress", () => {
  it("returns null when the client has no events this month", () => {
    expect(getEstadoProgress("lead-1", [], "2026-08")).toBeNull();
  });

  it("ignores events from other clients or other months", () => {
    const events = [
      makeEvent({ clientId: "otro" }),
      makeEvent({ scheduledDate: "2026-07-05" }),
    ];
    expect(getEstadoProgress("lead-1", events, "2026-08")).toBeNull();
  });

  it("averages the status score of this month's events for the client", () => {
    const events = [
      makeEvent({ status: "CALENDARIZADO" }), // 1.0
      makeEvent({ id: "ev-2", status: "COMPLETO" }), // 0.7
    ];
    expect(getEstadoProgress("lead-1", events, "2026-08")).toBeCloseTo(0.85);
  });
});
