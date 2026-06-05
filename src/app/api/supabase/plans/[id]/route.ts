import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializePlan } from "@/lib/supabase/serializers";
import type { Plan } from "@/types";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ ok: true });

    const plan: Plan = await req.json();
    const admin = createAdminClient();
    const { error } = await admin.from("plans").update(serializePlan(plan)).eq("id", id);
    if (error) {
      console.error("[plans PATCH]", JSON.stringify(error), error);
      return NextResponse.json({ error: error.message ?? "Supabase error", code: error.code }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[plans PATCH] Exception:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ ok: true });

    const admin = createAdminClient();
    const { error } = await admin.from("plans").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      console.error("[plans DELETE]", JSON.stringify(error), error);
      return NextResponse.json({ error: error.message ?? "Supabase error", code: error.code }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[plans DELETE] Exception:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
