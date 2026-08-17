import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { dateForMonth } from "@/lib/bulk-events";
import { todayBA } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adaptBulkEventSeriesRow,
  BulkEventSeriesValidationError,
  createBulkEventSeries,
  materializeBulkEventSeries,
  parseBulkEventSeriesInput,
} from "@/lib/supabase/bulk-event-series";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof BulkEventSeriesValidationError || error instanceof SyntaxError) {
    return NextResponse.json({ error: error.message || "JSON inválido" }, { status: 400 });
  }
  console.error("[bulk-event-series]", error);
  return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin.from("bulk_event_series").select("*").order("created_at");
    if (error) throw new Error(`No se pudieron cargar las series: ${error.message}`);

    const series = (data ?? []).map(adaptBulkEventSeriesRow);
    const today = todayBA();
    for (const definition of series) {
      await materializeBulkEventSeries(admin, definition, today);
    }

    return NextResponse.json({ series });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const input = parseBulkEventSeriesInput(await req.json());
    const today = todayBA();
    if (dateForMonth(input.startMonth, input.dayOfMonth) < today) {
      throw new BulkEventSeriesValidationError("La primera fecha debe ser hoy o una fecha futura");
    }
    const admin = createAdminClient();
    const series = await createBulkEventSeries(admin, randomUUID(), input, today);
    return NextResponse.json({ series }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
