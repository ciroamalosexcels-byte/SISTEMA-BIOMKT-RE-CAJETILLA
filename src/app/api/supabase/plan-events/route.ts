import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializePlanEvent } from "@/lib/supabase/serializers";
import type { PlanEvent } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const { data } = await supabase.from("plan_events").select("*").order("event_order");
  return NextResponse.json(
    (data ?? []).map((r) => ({
      id: r.id, planId: r.plan_id, title: r.title,
      type: r.type ?? "", status: r.status ?? "",
      scheduledDate: r.scheduled_date ?? undefined,
      planSlot: r.plan_slot ?? undefined,
      frase: r.frase ?? undefined, notes: r.notes ?? undefined,
      assignee: r.assignee ?? undefined,
      timerSeconds: r.timer_seconds, timerRunning: r.timer_running,
      timerStartedAt: r.timer_started_at ?? undefined,
      order: r.event_order, done: r.done,
    }))
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const event: PlanEvent = await req.json();
  const admin = createAdminClient();
  const { error } = await admin.from("plan_events").upsert(serializePlanEvent(event), { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
