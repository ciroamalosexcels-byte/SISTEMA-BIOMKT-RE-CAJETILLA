import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { readSheetValues, rowsToObjects } from "./client";
import { normalizeLeadRow, normalizeTeamRow } from "./normalizer";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const BATCH_SIZE = 100;

export interface SyncStats {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; id: string; error: string }>;
}

type Supabase = SupabaseClient<Database>;

// ─── leads ────────────────────────────────────────────────────────────────────

export async function syncLeads(supabase: Supabase): Promise<SyncStats> {
  const stats: SyncStats = { total: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };

  // Traer etapas una sola vez para resolver stage_id
  const { data: stages, error: stagesError } = await supabase
    .from("pipeline_stages")
    .select("id, stage_key");

  if (stagesError) throw new Error(`No se pudieron cargar las etapas: ${stagesError.message}`);

  const stageMap = new Map(stages?.map((s) => [s.stage_key.toUpperCase(), s.id]) ?? []);

  const rows = await readSheetValues(SHEET_ID, "Leads!A1:AZ1000");

  if (rows.length === 0) throw new Error("La hoja Leads está vacía");
  if (rows.length === 1) throw new Error("La hoja Leads solo tiene encabezados, sin datos");

  const objects = rowsToObjects(rows);
  stats.total = objects.length;

  // IDs existentes para distinguir insert vs update
  const sheetIds = objects.map((r) => r.id).filter(Boolean);
  const { data: existing } = await supabase
    .from("leads")
    .select("sheet_id")
    .in("sheet_id", sheetIds);

  const existingIds = new Set(existing?.map((r) => r.sheet_id) ?? []);

  // Normalizar y acumular por batches
  const toUpsert: NonNullable<ReturnType<typeof normalizeLeadRow>>[] = [];

  for (let i = 0; i < objects.length; i++) {
    const row = objects[i];
    const normalized = normalizeLeadRow(row);

    if (!normalized) {
      stats.skipped++;
      if (row.id === undefined || row.id === "") {
        stats.errors.push({ row: i + 2, id: "(sin id)", error: "Fila sin id — omitida" });
      }
      continue;
    }

    normalized.stage_id = stageMap.get(normalized._stageKey) ?? null;
    toUpsert.push(normalized);

    if (existingIds.has(normalized.sheet_id ?? "")) {
      stats.updated++;
    } else {
      stats.inserted++;
    }
  }

  // Upsert en batches
  for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
    const batch = toUpsert.slice(i, i + BATCH_SIZE).map(({ _stageKey: _, ...lead }) => lead);

    const { error } = await supabase
      .from("leads")
      .upsert(batch, { onConflict: "sheet_id", ignoreDuplicates: false });

    if (error) {
      // Marcar todo el batch como error y restar de los contadores
      batch.forEach((lead, j) => {
        stats.errors.push({
          row: i + j + 2,
          id: lead.sheet_id ?? "(sin id)",
          error: error.message,
        });
      });
      stats.inserted -= batch.filter((l) => !existingIds.has(l.sheet_id ?? "")).length;
      stats.updated -= batch.filter((l) => existingIds.has(l.sheet_id ?? "")).length;
    }
  }

  return stats;
}

// ─── team members ─────────────────────────────────────────────────────────────

export async function syncTeam(supabase: Supabase): Promise<SyncStats> {
  const stats: SyncStats = { total: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };

  const rows = await readSheetValues(SHEET_ID, "Team!A1:AZ100");

  if (rows.length === 0) throw new Error("La hoja TeamMembers está vacía");
  if (rows.length === 1) throw new Error("La hoja TeamMembers solo tiene encabezados");

  const objects = rowsToObjects(rows);
  stats.total = objects.length;

  const sheetIds = objects.map((r) => r.id).filter(Boolean);
  const { data: existing } = await supabase
    .from("team_members")
    .select("sheet_id")
    .in("sheet_id", sheetIds);

  const existingIds = new Set(existing?.map((r) => r.sheet_id) ?? []);

  const toUpsert = [];

  for (let i = 0; i < objects.length; i++) {
    const normalized = normalizeTeamRow(objects[i]);
    if (!normalized) {
      stats.skipped++;
      stats.errors.push({ row: i + 2, id: "(sin id)", error: "Fila sin id — omitida" });
      continue;
    }
    toUpsert.push(normalized);
    if (existingIds.has(normalized.sheet_id ?? "")) {
      stats.updated++;
    } else {
      stats.inserted++;
    }
  }

  for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
    const batch = toUpsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("team_members")
      .upsert(batch, { onConflict: "sheet_id", ignoreDuplicates: false });

    if (error) {
      batch.forEach((m, j) => {
        stats.errors.push({ row: i + j + 2, id: m.sheet_id ?? "(sin id)", error: error.message });
      });
    }
  }

  return stats;
}
