import { NextResponse, type NextRequest } from "next/server";
import { todayBA } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adaptBulkEventSeriesRow,
  BulkEventSeriesConflictError,
  BulkEventSeriesValidationError,
  deleteBulkEventSeries,
  parseBulkEventSeriesInput,
  updateBulkEventSeries,
} from "@/lib/supabase/bulk-event-series";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorResponse(error: unknown) {
  if (error instanceof BulkEventSeriesValidationError || error instanceof SyntaxError) {
    return NextResponse.json({ error: error.message || "JSON inválido" }, { status: 400 });
  }
  if (error instanceof BulkEventSeriesConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  console.error("[bulk-event-series id]", error);
  return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
}

async function loadSeries(id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("bulk_event_series").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`No se pudo cargar la serie: ${error.message}`);
  return { admin, series: data ? adaptBulkEventSeriesRow(data) : null };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "ID de serie inválido" }, { status: 400 });

    const { admin, series: oldSeries } = await loadSeries(id);
    if (!oldSeries) return NextResponse.json({ error: "Serie no encontrada" }, { status: 404 });
    const input = parseBulkEventSeriesInput(await req.json());

    const today = todayBA();
    const series = await updateBulkEventSeries(admin, oldSeries, input, today);
    return NextResponse.json({ series });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "ID de serie inválido" }, { status: 400 });

    const { admin, series } = await loadSeries(id);
    if (!series) return NextResponse.json({ error: "Serie no encontrada" }, { status: 404 });

    await deleteBulkEventSeries(admin, series, todayBA());

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
