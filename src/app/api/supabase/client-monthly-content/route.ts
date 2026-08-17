import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adaptClientMonthlyContentRow, serializeClientMonthlyContentInput } from "@/lib/supabase/client-monthly-content";
import { createClient } from "@/lib/supabase/server";
import type { ClientMonthlyContentInput } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const admin = createAdminClient();
  const { data, error } = await admin.from("client_monthly_content").select("*");
  if (error) {
    console.error("[client-monthly-content] GET", error);
    return NextResponse.json([]);
  }
  return NextResponse.json((data ?? []).map(adaptClientMonthlyContentRow));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const input: ClientMonthlyContentInput = await req.json();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_monthly_content")
    .upsert(serializeClientMonthlyContentInput(input), { onConflict: "client_id,month" })
    .select()
    .single();
  if (error) {
    console.error("[client-monthly-content] POST", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(adaptClientMonthlyContentRow(data));
}
