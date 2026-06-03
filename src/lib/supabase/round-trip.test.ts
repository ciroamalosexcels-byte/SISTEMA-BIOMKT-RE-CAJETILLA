import { describe, it, expect } from "vitest";
import { adaptLead } from "./adapters";
import type { Lead } from "@/types";

/**
 * Simula el ciclo completo: fila DB → adaptLead → JSON serializado → parseado.
 * Detecta campos que se pierden silenciosamente en la serialización.
 */

const fullRow = {
  id: "round-trip-uuid",
  sheet_id: "sheet-rt",
  nombre: "María",
  nombre2: "José",
  empresa: "TestCorp",
  observaciones: "seguimiento pendiente",
  telefono: "11-9999-0000",
  telefono2: "11-8888-0000",
  responsable1: "LOREN",
  responsable2: "FEDE",
  direccion: "Palermo 555",
  empresa_bio: "BIOESTRATEGIA",
  medio: "INSTAGRAM",
  stage_id: "stage-rt",
  sheet_stage: "SEGUIMIENTO",
  fecha_contacto: "2025-03-15T10:30:00Z",
  email: "maria@test.com",
  instagram: "@maria_corp",
  rubro: "Gastronomía",
  servicio: "Contenido mensual",
  source: "orgánico",
  mes_entrada: "2025-03",
  objetivos: "Aumentar ventas 20%",
  plan_audiovisual: "Plan premium",
  cumpleanos: "1988-07-22",
  cumpleanos2: "1990-12-01",
  proximo_seguimiento_dias: 14,
  proximo_seguimiento_fecha: "2025-03-29",
  meeting_datetime: "2025-03-20T14:00:00Z",
  plan_id: "plan-rt-uuid",
  activo: true,
  // columnas excluidas del tipo Lead:
  latitud: null, longitud: null, seguimiento: null,
  row_order: 1, client_order: 2,
  clave_secret_id: null, deleted_at: null,
  created_at: "2025-01-01", updated_at: "2025-03-01",
};

const stageMap = new Map([["stage-rt", "SEGUIMIENTO"]]);

describe("Round-trip de serialización Lead", () => {
  it("ningún campo se pierde al pasar por JSON.stringify → JSON.parse", () => {
    const lead = adaptLead(fullRow as any, stageMap);
    const serialized = JSON.parse(JSON.stringify(lead)) as Lead;

    // Todos los campos con valor deben sobrevivir la serialización
    expect(serialized.id).toBe(lead.id);
    expect(serialized.sheetId).toBe(lead.sheetId);
    expect(serialized.nombre).toBe(lead.nombre);
    expect(serialized.nombre2).toBe(lead.nombre2);
    expect(serialized.empresa).toBe(lead.empresa);
    expect(serialized.observaciones).toBe(lead.observaciones);
    expect(serialized.telefono).toBe(lead.telefono);
    expect(serialized.telefono2).toBe(lead.telefono2);
    expect(serialized.responsable1).toBe(lead.responsable1);
    expect(serialized.responsable2).toBe(lead.responsable2);
    expect(serialized.direccion).toBe(lead.direccion);
    expect(serialized.empresaBio).toBe(lead.empresaBio);
    expect(serialized.medio).toBe(lead.medio);
    expect(serialized.tab).toBe(lead.tab);
    expect(serialized.fechaContacto).toBe(lead.fechaContacto);
    expect(serialized.email).toBe(lead.email);
    expect(serialized.instagram).toBe(lead.instagram);
    expect(serialized.rubro).toBe(lead.rubro);
    expect(serialized.servicio).toBe(lead.servicio);
    expect(serialized.source).toBe(lead.source);
    expect(serialized.mesEntrada).toBe(lead.mesEntrada);
    expect(serialized.objetivos).toBe(lead.objetivos);
    expect(serialized.planAudiovisual).toBe(lead.planAudiovisual);
    expect(serialized.cumpleanos).toBe(lead.cumpleanos);
    expect(serialized.cumpleanos2).toBe(lead.cumpleanos2);
    expect(serialized.proximoSeguimientoDias).toBe(lead.proximoSeguimientoDias);
    expect(serialized.proximoSeguimientoFecha).toBe(lead.proximoSeguimientoFecha);
    expect(serialized.meetingDatetime).toBe(lead.meetingDatetime);
    expect(serialized.planId).toBe(lead.planId);
    expect(serialized.activo).toBe(lead.activo);
  });

  it("undefined fields no se serializan como null (JSON.stringify los omite correctamente)", () => {
    const rowSinOpcionales = {
      ...fullRow,
      nombre2: null, telefono2: null, email: null,
      instagram: null, sheet_id: null,
    };
    const lead = adaptLead(rowSinOpcionales as any, stageMap);
    const serialized = JSON.parse(JSON.stringify(lead)) as Partial<Lead>;

    expect(serialized.nombre2).toBeUndefined();
    expect(serialized.telefono2).toBeUndefined();
    expect(serialized.email).toBeUndefined();
    expect(serialized.instagram).toBeUndefined();
    expect(serialized.sheetId).toBeUndefined();
  });

  it("campos excluidos de la DB (latitud, longitud, seguimiento) no aparecen en el Lead", () => {
    const lead = adaptLead(fullRow as any, stageMap);
    expect(lead).not.toHaveProperty("latitud");
    expect(lead).not.toHaveProperty("longitud");
    expect(lead).not.toHaveProperty("seguimiento");
    expect(lead).not.toHaveProperty("clave_secret_id");
    expect(lead).not.toHaveProperty("row_order");
  });
});
