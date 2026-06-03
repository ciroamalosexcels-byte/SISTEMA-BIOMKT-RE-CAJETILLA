import { describe, it, expect } from "vitest";
import { normalizeLeadRow } from "./normalizer";

const baseRow = {
  id: "sheet-1",
  nombre: "Juan",
  empresa: "Acme",
  etapa: "CRM",
};

describe("normalizeLeadRow — consistencia de nombres de campo con Lead TS", () => {

  // ── Bug 1: mismatch proximoSeguimientoFecha vs proximaFecha ────────────────
  it("mapea proximoSeguimientoFecha (nombre del tipo Lead TS) a proximo_seguimiento_fecha", () => {
    const row = { ...baseRow, proximoSeguimientoFecha: "2025-06-15" };
    const result = normalizeLeadRow(row);
    expect(result?.proximo_seguimiento_fecha).toBe("2025-06-15");
  });

  it("también acepta proximaFecha como alias (compatibilidad con Sheets existentes)", () => {
    const row = { ...baseRow, proximaFecha: "2025-06-20" };
    const result = normalizeLeadRow(row);
    expect(result?.proximo_seguimiento_fecha).toBe("2025-06-20");
  });

  it("cuando ambas claves existen, proximoSeguimientoFecha tiene precedencia", () => {
    const row = { ...baseRow, proximoSeguimientoFecha: "2025-06-15", proximaFecha: "2025-06-01" };
    const result = normalizeLeadRow(row);
    expect(result?.proximo_seguimiento_fecha).toBe("2025-06-15");
  });

  // ── Campos del tipo Lead TS que deben mapearse correctamente ───────────────
  it("mapea mesEntrada (Lead TS) → mes_entrada (DB)", () => {
    const result = normalizeLeadRow({ ...baseRow, mesEntrada: "2025-06" });
    expect(result?.mes_entrada).toBe("2025-06");
  });

  it("mapea planAudiovisual (Lead TS) → plan_audiovisual (DB)", () => {
    const result = normalizeLeadRow({ ...baseRow, planAudiovisual: "Plan Gold" });
    expect(result?.plan_audiovisual).toBe("Plan Gold");
  });

  it("mapea empresaBio (Lead TS) → empresa_bio (DB) con validación de dominio", () => {
    const result = normalizeLeadRow({ ...baseRow, empresaBio: "BIOESTRATEGIA" });
    expect(result?.empresa_bio).toBe("BIOESTRATEGIA");
  });

  it("empresa_bio inválida cae a BIOMARKETING", () => {
    const result = normalizeLeadRow({ ...baseRow, empresaBio: "OTRA" });
    expect(result?.empresa_bio).toBe("BIOMARKETING");
  });

  it("medio inválido resulta en null", () => {
    const result = normalizeLeadRow({ ...baseRow, medio: "TELEGRAMA" });
    expect(result?.medio).toBeNull();
  });

  it("activo=false se mapea como false", () => {
    const result = normalizeLeadRow({ ...baseRow, activo: "false" });
    expect(result?.activo).toBe(false);
  });

  it("retorna null para filas sin id", () => {
    const result = normalizeLeadRow({ nombre: "Juan" });
    expect(result).toBeNull();
  });
});

describe("normalizeLeadRow — dominios válidos", () => {
  const VALID_MEDIOS = ["PRESENCIAL", "LLAMADA", "WHATSAPP", "INSTAGRAM", "MAIL"];

  for (const medio of VALID_MEDIOS) {
    it(`acepta medio="${medio}"`, () => {
      const result = normalizeLeadRow({ ...baseRow, medio });
      expect(result?.medio).toBe(medio);
    });
  }

  it("acepta empresa_bio BIOMARKETING", () => {
    const result = normalizeLeadRow({ ...baseRow, empresaBio: "BIOMARKETING" });
    expect(result?.empresa_bio).toBe("BIOMARKETING");
  });

  it("acepta empresa_bio BIOESTRATEGIA", () => {
    const result = normalizeLeadRow({ ...baseRow, empresaBio: "BIOESTRATEGIA" });
    expect(result?.empresa_bio).toBe("BIOESTRATEGIA");
  });
});
