import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { syncLeads, syncTeam } from "@/lib/google-sheets/sync";
import type { Database } from "@/types/supabase";

export async function POST(request: NextRequest) {
  // ── Auth — dos caminos válidos ───────────────────────────────────────────────
  // 1. Service key header (bootstrap / CI): x-sync-secret = SUPABASE_SERVICE_ROLE_KEY
  // 2. Usuario logueado con role admin (flujo normal del botón en sidebar)

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const incomingSecret = request.headers.get("x-sync-secret");

  let supabase;
  let triggeredById: string | null = null;

  if (incomingSecret && serviceKey && incomingSecret === serviceKey) {
    // Bootstrap: usa service role — saltea la sesión de usuario
    supabase = createAdminClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    );
  } else {
    // Flujo normal: verifica sesión + role admin
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: profile } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Se requiere rol admin" }, { status: 403 });
    }

    supabase = userClient;
    triggeredById = user.id;
  }

  // ── Validar env vars ─────────────────────────────────────────────────────────
  if (
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    !process.env.GOOGLE_SHEET_ID
  ) {
    return NextResponse.json(
      { error: "Credenciales de Google no configuradas. Completar GOOGLE_* en .env.local" },
      { status: 500 }
    );
  }

  // ── Crear registro de sync ────────────────────────────────────────────────────
  const { data: leadsSource } = await supabase
    .from("sheet_sources")
    .select("id")
    .eq("name", "Leads")
    .single();

  const { data: syncRun } = await supabase
    .from("sheet_sync_runs")
    .insert({
      source_id: leadsSource!.id,
      direction: "pull",
      status: "running",
      triggered_by: triggeredById,
    })
    .select("id")
    .single();

  const runId = syncRun?.id;

  // ── Ejecutar sync ─────────────────────────────────────────────────────────────
  const result: {
    leads?: ReturnType<typeof Object>;
    team?: ReturnType<typeof Object>;
    error?: string;
  } = {};

  let finalStatus: "success" | "partial" | "error" = "success";
  let totalRows = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrored = 0;
  let errorMessage: string | null = null;

  try {
    const leadsStats = await syncLeads(supabase);
    result.leads = leadsStats;
    totalRows += leadsStats.total;
    totalCreated += leadsStats.inserted;
    totalUpdated += leadsStats.updated;
    totalSkipped += leadsStats.skipped;
    totalErrored += leadsStats.errors.length;
    if (leadsStats.errors.length > 0) finalStatus = "partial";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.leads = { error: msg };
    finalStatus = "error";
    errorMessage = `Leads: ${msg}`;
  }

  try {
    const teamStats = await syncTeam(supabase);
    result.team = teamStats;
    totalRows += teamStats.total;
    totalCreated += teamStats.inserted;
    totalUpdated += teamStats.updated;
    totalSkipped += teamStats.skipped;
    totalErrored += teamStats.errors.length;
    if (teamStats.errors.length > 0 && finalStatus !== "error") finalStatus = "partial";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.team = { error: msg };
    if (finalStatus !== "error") finalStatus = "partial";
    errorMessage = errorMessage ? `${errorMessage} | Team: ${msg}` : `Team: ${msg}`;
  }

  // ── Cerrar registro de sync ───────────────────────────────────────────────────
  if (runId) {
    await supabase
      .from("sheet_sync_runs")
      .update({
        status: finalStatus,
        finished_at: new Date().toISOString(),
        rows_processed: totalRows,
        rows_created: totalCreated,
        rows_updated: totalUpdated,
        rows_skipped: totalSkipped,
        rows_errored: totalErrored,
        error_message: errorMessage,
      })
      .eq("id", runId);
  }

  const statusCode = finalStatus === "error" ? 500 : 200;

  return NextResponse.json(
    {
      status: finalStatus,
      summary: {
        total: totalRows,
        created: totalCreated,
        updated: totalUpdated,
        skipped: totalSkipped,
        errored: totalErrored,
      },
      details: result,
    },
    { status: statusCode }
  );
}

// Solo dev — permite disparar el sync desde el browser sin auth
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Solo disponible en desarrollo" }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY no configurado" }, { status: 500 });
  }

  const fakeRequest = new Request("http://localhost/api/google-sheets/sync", {
    method: "POST",
    headers: { "x-sync-secret": serviceKey },
  });

  return POST(fakeRequest as NextRequest);
}
