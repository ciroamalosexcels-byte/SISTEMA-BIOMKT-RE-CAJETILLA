import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

function currentMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Verificar sesión con cliente de usuario
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body: Record<string, string> = await req.json();
  const mes = body.mes ?? currentMes();

  const rows = Object.entries(body)
    .filter(([key]) => key !== "updatedAt" && key !== "mes")
    .map(([item, estado]) => ({ member_id: id, mes, item, estado }));

  if (rows.length === 0) return NextResponse.json({ ok: true });

  // Usar service role para bypassear RLS (política requiere admin)
  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await admin
    .from("team_status_91")
    .upsert(rows, { onConflict: "member_id,mes,item" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: rows.length });
}
