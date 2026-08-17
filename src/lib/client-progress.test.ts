import { describe, expect, it } from "vitest";
import { getContratadoProgress, getEstadoProgress } from "./client-progress";
import type { ContentEvent, Lead } from "@/types";

function makeLead(patch: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    tab: "CLIENTES",
    nombre: "Cliente",
    ...patch,
  } as Lead;
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
  it("returns null when the client has no contracted content", () => {
    expect(getContratadoProgress(makeLead())).toBeNull();
  });

  it("sums hecho/contratado across categories with contratado > 0", () => {
    const lead = makeLead({
      historiasHechas: 7, historiasContratadas: 7,
      reelsHechos: 0, reelsContratados: 8,
      publicacionesHechas: 0, publicacionesContratadas: 4,
    });
    // (7 + 0 + 0) / (7 + 8 + 4) = 7/19
    expect(getContratadoProgress(lead)).toBeCloseTo(7 / 19);
  });

  it("ignores categories with contratado = 0 or undefined", () => {
    const lead = makeLead({ historiasHechas: 2, historiasContratadas: 4 });
    expect(getContratadoProgress(lead)).toBe(0.5);
  });

  it("returns 1 when everything contracted is done", () => {
    const lead = makeLead({ reelsHechos: 3, reelsContratados: 3 });
    expect(getContratadoProgress(lead)).toBe(1);
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
