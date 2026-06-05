import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializeContentEvent } from "@/lib/supabase/serializers";
import type { ContentEvent } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const admin = createAdminClient();
  const { data } = await admin.from("content_events").select("*").order("event_order");
  return NextResponse.json(
    (data ?? []).map((r) => ({
      id: r.id, clientId: r.client_id, title: r.title,
      type: r.type ?? "", status: r.status ?? "",
      scheduledDate: r.scheduled_date ?? undefined,
      done: r.done, timerSeconds: r.timer_seconds,
      timerRunning: r.timer_running,
      timerStartedAt: r.timer_started_at ?? undefined,
      notes: r.notes ?? undefined, order: r.event_order,
      assignee: r.assignee ?? undefined, objetivo: r.objetivo ?? undefined,
      frase: r.frase ?? undefined, copy: r.copy ?? undefined,
      archivo: r.archivo ?? undefined,
    }))
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const event: ContentEvent = await req.json();
  const admin = createAdminClient();
  const { error } = await admin.from("content_events").upsert(serializeContentEvent(event), { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
