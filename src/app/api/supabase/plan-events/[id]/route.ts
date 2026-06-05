import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializePlanEvent } from "@/lib/supabase/serializers";
import type { PlanEvent } from "@/types";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ ok: true });

    const event: PlanEvent = await req.json();
    const admin = createAdminClient();
    const { error } = await admin.from("plan_events").update(serializePlanEvent(event)).eq("id", id);
    if (error) {
      console.error("[plan-events PATCH]", JSON.stringify(error), error);
      return NextResponse.json({ error: error.message ?? "Supabase error", code: error.code }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[plan-events PATCH] Exception:", e);
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
    const { error } = await admin.from("plan_events").delete().eq("id", id);
    if (error) {
      console.error("[plan-events DELETE]", JSON.stringify(error), error);
      return NextResponse.json({ error: error.message ?? "Supabase error", code: error.code }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[plan-events DELETE] Exception:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
