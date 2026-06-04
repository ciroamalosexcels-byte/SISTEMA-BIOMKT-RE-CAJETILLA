import { describe, it, expect } from "vitest";
import { adaptTeamMember } from "./adapters";
import { STATUS91_ITEMS } from "@/lib/constants";

const baseMemberRow = {
  id: "member-1",
  sheet_id: "sheet-m1",
  nombre: "Ciro",
  edad: "28",
  equipo: "ventas",
  roles: "Líder",
  horarios: "9-18",
  sueno: "Escalar la agencia",
  telefono: "11-1111",
  mail: "ciro@bio.com",
  direccion: "Palermo",
  fecha_nacimiento: "1996-03-15",
  notas: "nota",
  signo: "Piscis",
  signo_chino: "Rata",
  badges: ["wood", "bronze"],
  profile_id: null,
  deleted_at: null,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

// ── Camino de LECTURA — Supabase → adaptTeamMember ───────────────────────────

describe("adaptTeamMember — lectura de status91 desde Supabase", () => {

  it("sin filas en team_status_91, todos los items del 9.1 vienen como string vacío", () => {
    const result = adaptTeamMember(baseMemberRow as any, [], []);
    STATUS91_ITEMS.forEach((k) => {
      expect(result.status91[k]).toBe("");
    });
    // Este test documenta el problema: si Supabase no tiene datos de status91
    // (porque nunca se guardan ahí), el reload siempre devuelve todo vacío.
  });

  it("con filas en team_status_91, el adapter mapea correctamente el color", () => {
    const status91Rows = [
      { member_id: "member-1", item: STATUS91_ITEMS[0], estado: "green" },
      { member_id: "member-1", item: STATUS91_ITEMS[1], estado: "red" },
    ] as any[];
    const result = adaptTeamMember(baseMemberRow as any, status91Rows, []);
    expect(result.status91[STATUS91_ITEMS[0]]).toBe("green");
    expect(result.status91[STATUS91_ITEMS[1]]).toBe("red");
  });

  it("status91 de otro integrante no contamina al integrante actual", () => {
    const status91Rows = [
      { member_id: "member-2", item: STATUS91_ITEMS[0], estado: "lime" },
      { member_id: "member-1", item: STATUS91_ITEMS[0], estado: "yellow" },
    ] as any[];
    const result = adaptTeamMember(baseMemberRow as any, status91Rows, []);
    expect(result.status91[STATUS91_ITEMS[0]]).toBe("yellow");
  });
});

describe("adaptTeamMember — lectura de monthlyPoints desde Supabase", () => {

  it("sin filas en team_monthly_points, monthlyPoints es array vacío", () => {
    const result = adaptTeamMember(baseMemberRow as any, [], []);
    expect(result.monthlyPoints).toEqual([]);
    // Mismo problema: si monthlyPoints nunca se escriben a Supabase, el reload
    // siempre devuelve un array vacío borrando los datos del usuario.
  });

  it("mapea correctamente puntos, detalles, fecha y estado", () => {
    const pointsRows = [
      { member_id: "member-1", puntos: "150", detalles: "Excelente mes", fecha: "2025-06-01", estado: "green" },
    ] as any[];
    const result = adaptTeamMember(baseMemberRow as any, [], pointsRows);
    expect(result.monthlyPoints?.[0]).toEqual({
      puntos: "150",
      detalles: "Excelente mes",
      fecha: "2025-06-01",
      estado: "green",
    });
  });

  it("estado null en la DB se convierte en string vacío", () => {
    const pointsRows = [
      { member_id: "member-1", puntos: "0", detalles: null, fecha: "2025-05-01", estado: null },
    ] as any[];
    const result = adaptTeamMember(baseMemberRow as any, [], pointsRows);
    expect(result.monthlyPoints?.[0].estado).toBe("");
    expect(result.monthlyPoints?.[0].detalles).toBe("");
  });
});

// ── Camino de ESCRITURA — documenta los gaps ─────────────────────────────────

describe("Gap de persistencia: datos que se pierden al recargar página", () => {

  it("status91 y monthlyPoints solo se guardan en localStorage, no en Supabase", () => {
    /**
     * PROBLEMA DOCUMENTADO:
     *
     * Al editar un KPI en member-profile.tsx:
     *   patchStatus(key, value)
     *   → updateMember(id, { status91: {...} })
     *   → storage.setTeam()         ← solo localStorage
     *
     * Al recargar la página (app-shell.tsx):
     *   loadTeamFromSupabase()
     *   → GET /api/supabase/team
     *   → SELECT * FROM team_status_91  ← tabla VACÍA (nunca se escribe)
     *   → useTeamStore.setState({ members: supaTeam })  ← sobreescribe localStorage
     *
     * Resultado: status91 y monthlyPoints se pierden en cada recarga.
     *
     * FIX REQUERIDO:
     *   Agregar PATCH /api/supabase/team/[id]/status91 que upserte en team_status_91
     *   Agregar PATCH /api/supabase/team/[id]/points que upserte en team_monthly_points
     *   Llamar a esas rutas desde updateMember() cuando el patch incluye esos campos.
     */

    // Este test siempre pasa — documenta el comportamiento actual como especificación.
    // Cuando se implemente el fix, agregar tests de integración para las nuevas rutas.
    const STATUS91_SUPABASE_TABLE = "team_status_91";
    const MONTHLY_POINTS_TABLE = "team_monthly_points";

    const missingWritePaths = [
      { field: "status91",      table: STATUS91_SUPABASE_TABLE,  route: "PATCH /api/supabase/team/[id]/status91" },
      { field: "monthlyPoints", table: MONTHLY_POINTS_TABLE,     route: "PATCH /api/supabase/team/[id]/points" },
    ];

    // Documenta cuáles rutas API faltan para cerrar el gap
    expect(missingWritePaths.map((p) => p.route)).toEqual([
      "PATCH /api/supabase/team/[id]/status91",
      "PATCH /api/supabase/team/[id]/points",
    ]);
  });
});
