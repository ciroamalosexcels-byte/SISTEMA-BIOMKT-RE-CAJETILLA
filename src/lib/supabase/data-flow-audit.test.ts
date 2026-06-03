/**
 * AUDITORÍA DE FLUJO DE DATOS — Frontend → Supabase
 *
 * Este archivo documenta qué datos persisten a Supabase y cuáles se pierden.
 * Cada test que PASA documenta un comportamiento real (bueno o malo).
 * Los tests marcados [GAP] documentan datos que se pierden en el reload.
 */

import { describe, it, expect } from "vitest";

// ── Mapa canónico de entidades y su estado de persistencia ───────────────────

interface EntityAudit {
  entity: string;
  fields: string[];
  writesToLocalStorage: boolean;
  writesToSheets: "auto" | "manual" | "never";
  writesToSupabase: "direct" | "via-sync" | "never";
  loadsFromSupabase: boolean;
  dataLostOnReload: boolean;
  fixes: string[];
}

const AUDIT: EntityAudit[] = [
  {
    entity: "Lead",
    fields: [
      "nombre", "empresa", "telefono", "email", "instagram", "direccion",
      "responsable1", "responsable2", "medio", "empresaBio", "observaciones",
      "fechaContacto", "tab", "proximoSeguimientoFecha", "meetingDatetime",
      "activo", "rubro", "servicio", "objetivos", "planAudiovisual",
      "cumpleanos", "cumpleanos2", "proximoSeguimientoDias", "source",
    ],
    writesToLocalStorage: true,
    writesToSheets: "manual",         // botón "Guardar" → Apps Script
    writesToSupabase: "via-sync",     // solo después de POST /api/google-sheets/sync
    loadsFromSupabase: true,          // sobrescribe localStorage en cada carga
    dataLostOnReload: true,           // [GAP] editar lead → no guardar → recargar = perdido
    fixes: [
      "PATCH /api/supabase/leads/[id]  — llamar desde updateLead()",
      "POST  /api/supabase/leads       — llamar desde addLead()",
      "DELETE /api/supabase/leads/[id] — llamar desde deleteLead()",
    ],
  },
  {
    entity: "TeamMember (campos básicos)",
    fields: ["nombre", "edad", "roles", "horarios", "sueno", "telefono", "mail", "direccion"],
    writesToLocalStorage: true,
    writesToSheets: "manual",
    writesToSupabase: "via-sync",
    loadsFromSupabase: true,
    dataLostOnReload: true,           // [GAP] igual que leads
    fixes: [
      "PATCH /api/supabase/team/[id]  — llamar desde updateMember() para campos básicos",
    ],
  },
  {
    entity: "TeamMember (status91)",
    fields: ["status91.*"],
    writesToLocalStorage: true,
    writesToSheets: "manual",
    writesToSupabase: "direct",       // ✅ PATCH /api/supabase/team/[id]/status91
    loadsFromSupabase: true,
    dataLostOnReload: false,          // ✅ CORREGIDO
    fixes: [],
  },
  {
    entity: "TeamMember (monthlyPoints)",
    fields: ["puntos", "detalles", "fecha", "estado"],
    writesToLocalStorage: true,
    writesToSheets: "manual",
    writesToSupabase: "direct",       // ✅ PATCH /api/supabase/team/[id]/points
    loadsFromSupabase: true,
    dataLostOnReload: false,          // ✅ CORREGIDO
    fixes: [],
  },
  {
    entity: "ContentEvent",
    fields: [
      "clientId", "title", "type", "status", "scheduledDate", "done",
      "timerSeconds", "notes", "assignee", "objetivo", "frase", "copy", "archivo",
    ],
    writesToLocalStorage: true,
    writesToSheets: "never",          // [GAP] nunca se guarda en Sheets
    writesToSupabase: "never",        // [GAP] no existe ruta API
    loadsFromSupabase: false,         // se carga de Sheets (fetchFromSheets)
    dataLostOnReload: true,           // [GAP] si localStorage se borra, todo se pierde
    fixes: [
      "POST   /api/supabase/content-events      — llamar desde addContentEvent()",
      "PATCH  /api/supabase/content-events/[id] — llamar desde updateContentEvent()",
      "DELETE /api/supabase/content-events/[id] — llamar desde deleteContentEvent()",
    ],
  },
  {
    entity: "ManagementEvent",
    fields: ["clientId", "title", "type", "datetime", "done", "notes"],
    writesToLocalStorage: true,
    writesToSheets: "never",
    writesToSupabase: "never",
    loadsFromSupabase: false,
    dataLostOnReload: true,
    fixes: [
      "POST   /api/supabase/management-events      — llamar desde addManagementEvent()",
      "PATCH  /api/supabase/management-events/[id] — llamar desde updateManagementEvent()",
      "DELETE /api/supabase/management-events/[id] — llamar desde deleteManagementEvent()",
    ],
  },
  {
    entity: "Plan",
    fields: ["nombre", "descripcion", "createdAt"],
    writesToLocalStorage: true,
    writesToSheets: "never",
    writesToSupabase: "never",
    loadsFromSupabase: false,
    dataLostOnReload: true,
    fixes: [
      "POST   /api/supabase/plans      — llamar desde addPlan()",
      "PATCH  /api/supabase/plans/[id] — llamar desde updatePlan()",
      "DELETE /api/supabase/plans/[id] — llamar desde deletePlan()",
    ],
  },
  {
    entity: "PlanEvent",
    fields: ["planId", "title", "type", "status", "scheduledDate", "timerSeconds", "done"],
    writesToLocalStorage: true,
    writesToSheets: "never",
    writesToSupabase: "never",
    loadsFromSupabase: false,
    dataLostOnReload: true,
    fixes: [
      "POST   /api/supabase/plan-events      — llamar desde addPlanEvent()",
      "PATCH  /api/supabase/plan-events/[id] — llamar desde updatePlanEvent()",
    ],
  },
  {
    entity: "PipelineStage",
    fields: ["label", "color", "order"],
    writesToLocalStorage: true,
    writesToSheets: "never",
    writesToSupabase: "never",        // [GAP] cambios en UI nunca van a pipeline_stages
    loadsFromSupabase: true,          // Supabase tiene la tabla pipeline_stages
    dataLostOnReload: true,
    fixes: [
      "PATCH /api/supabase/pipeline/[id] — llamar desde updateStage()",
    ],
  },
];

// ── Tests que documentan el estado actual ────────────────────────────────────

describe("Auditoría de flujo de datos Frontend → Supabase", () => {

  it("todas las entidades tienen al menos localStorage", () => {
    const sinStorage = AUDIT.filter((e) => !e.writesToLocalStorage);
    expect(sinStorage.map((e) => e.entity)).toHaveLength(0);
  });

  it("entidades que SÍ persisten en Supabase correctamente", () => {
    const persistidas = AUDIT.filter(
      (e) => e.writesToSupabase === "direct" && !e.dataLostOnReload
    );
    expect(persistidas.map((e) => e.entity)).toEqual([
      "TeamMember (status91)",
      "TeamMember (monthlyPoints)",
    ]);
  });

  it("[GAP] entidades que se pierden al recargar la página", () => {
    const gaps = AUDIT
      .filter((e) => e.dataLostOnReload)
      .map((e) => e.entity);

    // Este test DOCUMENTA el problema — no falla, registra los gaps pendientes.
    // Cuando se implementen las rutas API, sacar la entidad de esta lista.
    expect(gaps).toEqual([
      "Lead",
      "TeamMember (campos básicos)",
      "ContentEvent",
      "ManagementEvent",
      "Plan",
      "PlanEvent",
      "PipelineStage",
    ]);
  });

  it("[GAP] entidades sin ninguna ruta API de escritura a Supabase", () => {
    const sinRuta = AUDIT
      .filter((e) => e.writesToSupabase === "never")
      .map((e) => e.entity);

    expect(sinRuta).toEqual([
      "ContentEvent",
      "ManagementEvent",
      "Plan",
      "PlanEvent",
      "PipelineStage",
    ]);
  });

  it("plan de fixes requeridos por entidad", () => {
    const pendientes = AUDIT
      .filter((e) => e.fixes.length > 0)
      .map((e) => ({ entity: e.entity, rutas: e.fixes.length }));

    // Verifica que el mapa de fixes está documentado
    expect(pendientes.length).toBeGreaterThan(0);
    expect(pendientes.find((e) => e.entity === "Lead")?.rutas).toBe(3);
    expect(pendientes.find((e) => e.entity === "ContentEvent")?.rutas).toBe(3);
  });

  it("riesgo crítico: auto-sync cada 5 min desde Supabase SOBREESCRIBE localStorage", () => {
    // app-shell.tsx línea 133-143: setInterval cada 5min llama loadTeamFromSupabase()
    // y useLeadsStore.setState({ rows: supaLeads }) — borra cambios no guardados
    const entidadesConRiesgoDeAutosync = AUDIT.filter(
      (e) => e.loadsFromSupabase && e.writesToSupabase !== "direct" && e.dataLostOnReload
    );
    expect(entidadesConRiesgoDeAutosync.map((e) => e.entity)).toEqual([
      "Lead",
      "TeamMember (campos básicos)",
      "PipelineStage",
    ]);
  });
});
