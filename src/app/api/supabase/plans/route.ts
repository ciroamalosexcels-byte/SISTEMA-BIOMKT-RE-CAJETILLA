import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializePlan } from "@/lib/supabase/serializers";
import type { Plan } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const { data } = await supabase.from("plans").select("*").is("deleted_at", null);
  return NextResponse.json(
    (data ?? []).map((r) => ({
      id: r.id, nombre: r.nombre,
      descripcion: r.descripcion ?? undefined,
      createdAt: r.created_at,
    }))
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const plan: Plan = await req.json();
  const admin = createAdminClient();
  const { error } = await admin.from("plans").upsert(serializePlan(plan), { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
