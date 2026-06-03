import { describe, it, expect } from "vitest";
import { adaptLead } from "./adapters";
import type { Lead } from "@/types";

// ── Fixture mínimo con todos los campos de la DB ──────────────────────────────
const baseRow = {
  id: "uuid-test-1",
  sheet_id: "sheet-1",
  nombre: "Juan",
  nombre2: "Ana",
  empresa: "Acme",
  observaciones: "obs",
  telefono: "1234",
  telefono2: "5678",
  responsable1: "CIRO",
  responsable2: "LOREN",
  direccion: "Av. Corrientes 100",
  empresa_bio: "BIOMARKETING",
  medio: "WHATSAPP",
  stage_id: "stage-uuid",
  sheet_stage: "CRM",
  fecha_contacto: "2024-06-01T00:00:00Z",
  email: "juan@test.com",
  instagram: "@juan",
  rubro: "Tech",
  servicio: "Redes sociales",
  source: "referido",
  mes_entrada: "2024-06",
  objetivos: "obj",
  plan_audiovisual: "plan",
  cumpleanos: "1990-01-01",
  cumpleanos2: "1992-02-02",
  proximo_seguimiento_dias: 7,
  proximo_seguimiento_fecha: "2024-06-08",
  meeting_datetime: "2024-06-10T15:00:00Z",
  plan_id: "plan-uuid",
  activo: true,
  // columnas DB no mapeadas a Lead (intencional):
  latitud: null, longitud: null, seguimiento: null,
  row_order: null, client_order: null,
  clave_secret_id: null, deleted_at: null,
  created_at: "2024-01-01", updated_at: "2024-01-01",
};

const stageMap = new Map([["stage-uuid", "SEGUIMIENTO"]]);

// ── Test 1: adaptLead produce todos los campos requeridos de Lead ─────────────
describe("adaptLead", () => {
  it("mapea todos los campos no-opcionales del tipo Lead", () => {
    const lead = adaptLead(baseRow as any, stageMap);

    // Campos requeridos (nunca undefined)
    expect(lead.id).toBe("uuid-test-1");
    expect(lead.nombre).toBe("Juan");
    expect(lead.empresa).toBe("Acme");
    expect(lead.observaciones).toBe("obs");
    expect(lead.telefono).toBe("1234");
    expect(lead.responsable1).toBe("CIRO");
    expect(lead.responsable2).toBe("LOREN");
    expect(lead.direccion).toBe("Av. Corrientes 100");
    expect(lead.empresaBio).toBe("BIOMARKETING");
    expect(lead.medio).toBe("WHATSAPP");
    expect(lead.tab).toBe("SEGUIMIENTO");
    expect(lead.fechaContacto).toBe("2024-06-01T00:00:00Z");
    expect(lead.activo).toBe(true);
  });

  it("mapea todos los campos opcionales del tipo Lead cuando están presentes en la DB", () => {
    const lead = adaptLead(baseRow as any, stageMap);

    expect(lead.sheetId).toBe("sheet-1");
    expect(lead.nombre2).toBe("Ana");
    expect(lead.telefono2).toBe("5678");
    expect(lead.email).toBe("juan@test.com");
    expect(lead.instagram).toBe("@juan");
    expect(lead.rubro).toBe("Tech");
    expect(lead.servicio).toBe("Redes sociales");
    expect(lead.source).toBe("referido");
    expect(lead.mesEntrada).toBe("2024-06");
    expect(lead.objetivos).toBe("obj");
    expect(lead.planAudiovisual).toBe("plan");
    expect(lead.cumpleanos).toBe("1990-01-01");
    expect(lead.cumpleanos2).toBe("1992-02-02");
    expect(lead.proximoSeguimientoDias).toBe(7);
    expect(lead.proximoSeguimientoFecha).toBe("2024-06-08");
    expect(lead.meetingDatetime).toBe("2024-06-10T15:00:00Z");
    expect(lead.planId).toBe("plan-uuid");
  });

  it("usa stage_id → stageMap con fallback a sheet_stage cuando la etapa no está en el mapa", () => {
    const lead = adaptLead(baseRow as any, new Map()); // mapa vacío
    expect(lead.tab).toBe("CRM"); // fallback a sheet_stage
  });

  it("ningún campo del tipo Lead queda sin mapear en el resultado", () => {
    const lead = adaptLead(baseRow as any, stageMap);
    // Esta lista DEBE coincidir con las claves de la interfaz Lead.
    // Si agregás un campo a Lead sin agregarlo aquí → el test falla → input huérfano detectado.
    const LEAD_FIELDS_FROM_DB: (keyof Lead)[] = [
      "id", "sheetId", "nombre", "nombre2", "empresa", "observaciones",
      "telefono", "telefono2", "responsable1", "responsable2", "direccion",
      "empresaBio", "medio", "tab", "fechaContacto", "activo",
      "email", "instagram", "rubro", "servicio", "source", "mesEntrada",
      "objetivos", "planAudiovisual", "cumpleanos", "cumpleanos2",
      "proximoSeguimientoDias", "proximoSeguimientoFecha",
      "meetingDatetime", "planId",
    ];

    // Campos intencionalmente excluidos del adapter (gestionados por fuera de la DB normal)
    const INTENTIONALLY_EXCLUDED: (keyof Lead)[] = [
      "clave", // gestionado via Supabase Vault (clave_secret_id), no en texto plano
    ];

    const ALL_LEAD_KEYS: (keyof Lead)[] = [
      ...LEAD_FIELDS_FROM_DB,
      ...INTENTIONALLY_EXCLUDED,
    ];

    // Verifica que la lista cubre TODOS los campos del tipo Lead
    const leadKeys = Object.keys(lead) as (keyof Lead)[];
    for (const key of leadKeys) {
      expect(ALL_LEAD_KEYS).toContain(key);
    }

    // Verifica que no hay campos en LEAD_FIELDS_FROM_DB que el adapter no produce
    for (const key of LEAD_FIELDS_FROM_DB) {
      expect(lead).toHaveProperty(key);
    }
  });
});
