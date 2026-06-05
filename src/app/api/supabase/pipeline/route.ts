import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const admin = createAdminClient();
  const { data } = await admin
    .from("pipeline_stages")
    .select("id, stage_key, label, color, stage_order, is_won")
    .order("stage_order");

  return NextResponse.json(
    (data ?? []).map((r) => ({
      id:    r.stage_key,   // coincide con lead.tab ("CRM", "REUNION_1", etc.)
      label: r.label,
      color: r.color,
      order: r.stage_order,
    }))
  );
}
