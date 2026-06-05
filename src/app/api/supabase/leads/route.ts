import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adaptLead } from "@/lib/supabase/adapters";
import { serializeLead } from "@/lib/supabase/serializers";
import type { Lead } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  // Verificar sesión
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  // Leer con admin para garantizar acceso independiente del role
  const admin = createAdminClient();
  const [{ data: stages }, { data: leads }] = await Promise.all([
    admin.from("pipeline_stages").select("id, stage_key"),
    admin
      .from("leads")
      .select("*")
      .is("deleted_at", null)
      .order("row_order", { ascending: true, nullsFirst: false }),
  ]);

  const stageMap = new Map(stages?.map((s) => [s.id, s.stage_key]) ?? []);
  const mapped = (leads ?? []).map((row) => adaptLead(row as any, stageMap));

  return NextResponse.json(mapped);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const lead: Lead = await req.json();
    const admin = createAdminClient();

    const { data: stages } = await admin.from("pipeline_stages").select("id, stage_key");
    const stageMap = new Map(stages?.map((s) => [s.stage_key, s.id]) ?? []);

    const serialized = serializeLead(lead, stageMap);
    const { error } = await admin.from("leads").upsert(serialized as any, { onConflict: "id" });

    if (error) {
      console.error("[leads POST] Supabase error:", JSON.stringify(error), error);
      return NextResponse.json(
        { error: error.message ?? "Supabase error", code: error.code, details: error.details },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[leads POST] Exception:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
