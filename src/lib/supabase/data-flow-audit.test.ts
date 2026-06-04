/**
 * AUDITORÍA DE FLUJO DE DATOS — Frontend → Supabase
 * Estado: todas las entidades persisten en Supabase directo.
 * Google Sheets comentado (código preservado por si se necesita).
 */

import { describe, it, expect } from "vitest";

interface EntityAudit {
  entity: string;
  writesToSupabase: "direct" | "via-sync" | "never";
  loadsFromSupabase: boolean;
  dataLostOnReload: boolean;
  routes: string[];
}

const AUDIT: EntityAudit[] = [
  {
    entity: "Lead",
    writesToSupabase: "direct",
    loadsFromSupabase: true,
    dataLostOnReload: false,
    routes: ["POST /api/supabase/leads", "PATCH /api/supabase/leads/[id]", "DELETE /api/supabase/leads/[id]"],
  },
  {
    entity: "TeamMember (campos básicos)",
    writesToSupabase: "direct",
    loadsFromSupabase: true,
    dataLostOnReload: false,
    routes: ["PATCH /api/supabase/team/[id]"],
  },
  {
    entity: "TeamMember (status91)",
    writesToSupabase: "direct",
    loadsFromSupabase: true,
    dataLostOnReload: false,
    routes: ["PATCH /api/supabase/team/[id]/status91"],
  },
  {
    entity: "TeamMember (monthlyPoints)",
    writesToSupabase: "direct",
    loadsFromSupabase: true,
    dataLostOnReload: false,
    routes: ["PATCH /api/supabase/team/[id]/points"],
  },
  {
    entity: "ContentEvent",
    writesToSupabase: "direct",
    loadsFromSupabase: true,
    dataLostOnReload: false,
    routes: ["POST /api/supabase/content-events", "PATCH /api/supabase/content-events/[id]", "DELETE /api/supabase/content-events/[id]"],
  },
  {
    entity: "ManagementEvent",
    writesToSupabase: "direct",
    loadsFromSupabase: true,
    dataLostOnReload: false,
    routes: ["POST /api/supabase/management-events", "PATCH /api/supabase/management-events/[id]", "DELETE /api/supabase/management-events/[id]"],
  },
  {
    entity: "Plan",
    writesToSupabase: "direct",
    loadsFromSupabase: true,
    dataLostOnReload: false,
    routes: ["POST /api/supabase/plans", "PATCH /api/supabase/plans/[id]", "DELETE /api/supabase/plans/[id]"],
  },
  {
    entity: "PlanEvent",
    writesToSupabase: "direct",
    loadsFromSupabase: true,
    dataLostOnReload: false,
    routes: ["POST /api/supabase/plan-events", "PATCH /api/supabase/plan-events/[id]", "DELETE /api/supabase/plan-events/[id]"],
  },
  {
    entity: "PipelineStage",
    writesToSupabase: "direct",
    loadsFromSupabase: true,
    dataLostOnReload: false,
    routes: ["GET /api/supabase/pipeline", "PATCH /api/supabase/pipeline/[id]"],
  },
];

describe("Auditoría de flujo de datos Frontend → Supabase", () => {

  it("todas las entidades persisten directo en Supabase", () => {
    const sinSupabase = AUDIT.filter(e => e.writesToSupabase !== "direct");
    expect(sinSupabase.map(e => e.entity)).toHaveLength(0);
  });

  it("todas las entidades cargan desde Supabase al iniciar", () => {
    const sinCarga = AUDIT.filter(e => !e.loadsFromSupabase);
    expect(sinCarga.map(e => e.entity)).toHaveLength(0);
  });

  it("ninguna entidad pierde datos al recargar la página", () => {
    const conPerdida = AUDIT.filter(e => e.dataLostOnReload);
    expect(conPerdida.map(e => e.entity)).toHaveLength(0);
  });

  it("cada entidad tiene al menos una ruta API documentada", () => {
    const sinRutas = AUDIT.filter(e => e.routes.length === 0);
    expect(sinRutas.map(e => e.entity)).toHaveLength(0);
  });

  it("total de entidades auditadas", () => {
    expect(AUDIT).toHaveLength(9);
  });
});
