import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializeManagementEvent } from "@/lib/supabase/serializers";
import type { ManagementEvent } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const { data } = await supabase.from("management_events").select("*").order("created_at");
  return NextResponse.json(
    (data ?? []).map((r) => ({
      id: r.id, clientId: r.client_id, title: r.title,
      type: r.type ?? "", datetime: r.datetime ?? undefined,
      done: r.done, notes: r.notes ?? undefined,
    }))
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const event: ManagementEvent = await req.json();
  const admin = createAdminClient();
  const { error } = await admin.from("management_events").upsert(serializeManagementEvent(event), { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
