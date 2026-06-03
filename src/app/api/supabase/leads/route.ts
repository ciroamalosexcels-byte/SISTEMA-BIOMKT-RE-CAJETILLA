import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adaptLead } from "@/lib/supabase/adapters";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const [{ data: stages }, { data: leads }] = await Promise.all([
    supabase.from("pipeline_stages").select("id, stage_key"),
    supabase
      .from("leads")
      .select("*")
      .is("deleted_at", null)
      .order("row_order", { ascending: true, nullsFirst: false }),
  ]);

  const stageMap = new Map(stages?.map((s) => [s.id, s.stage_key]) ?? []);
  const mapped = (leads ?? []).map((row) => adaptLead(row as any, stageMap));

  return NextResponse.json(mapped);
}
