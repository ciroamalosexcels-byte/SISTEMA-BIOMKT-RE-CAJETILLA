import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ProgressMode } from "@/types/content-event";

export const runtime = "nodejs";

const VALID_MODES: ProgressMode[] = ["estado", "contratado"];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ mode: "estado" satisfies ProgressMode });

  const admin = createAdminClient();
  const { data, error } = await admin.from("progress_mode").select("mode").eq("id", 1).single();
  if (error) {
    console.error("[progress-mode] GET", error);
    return NextResponse.json({ mode: "estado" satisfies ProgressMode });
  }

  return NextResponse.json({ mode: data.mode as ProgressMode });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const mode = body?.mode;
  if (!VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: "mode inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("progress_mode")
    .update({ mode, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) {
    console.error("[progress-mode] PATCH", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mode: mode as ProgressMode });
}
