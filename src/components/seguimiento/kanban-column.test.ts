import { describe, expect, it } from "vitest";
import type { Lead } from "@/types";
import { groupLeadsByStageDate } from "./kanban-date-groups";

function lead(id: string, fechaContacto: string, proximoSeguimientoFecha?: string): Lead {
  return {
    id,
    nombre: id,
    empresa: "",
    observaciones: "",
    telefono: "",
    responsable1: "",
    responsable2: "",
    direccion: "",
    empresaBio: "BIOMARKETING",
    medio: "",
    fechaContacto,
    proximoSeguimientoFecha,
    tab: "CRM",
  };
}

describe("groupLeadsByStageDate", () => {
  it("orders prospect leads by contact date and time, with missing dates last", () => {
    const groups = groupLeadsByStageDate([
      lead("sin-fecha", ""),
      lead("ayer", "2026-07-21T18:00"),
      lead("hoy-temprano", "2026-07-22T09:00"),
      lead("hoy-reciente", "2026-07-22T15:30"),
    ], "CRM");

    expect(groups.map(group => group.date)).toEqual(["2026-07-22", "2026-07-21", ""]);
    expect(groups[0].leads.map(item => item.id)).toEqual(["hoy-reciente", "hoy-temprano"]);
    expect(groups[2].leads.map(item => item.id)).toEqual(["sin-fecha"]);
  });

  it("keeps using the follow-up date outside the prospect stage", () => {
    const groups = groupLeadsByStageDate([
      lead("contacto-reciente", "2026-07-22", "2026-07-20"),
      lead("seguimiento-reciente", "2026-07-01", "2026-07-25"),
    ], "SEGUIMIENTO");

    expect(groups.map(group => group.date)).toEqual(["2026-07-25", "2026-07-20"]);
  });
});
