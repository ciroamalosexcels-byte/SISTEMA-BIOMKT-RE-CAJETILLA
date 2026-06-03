import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

interface PointRow { puntos: string; detalles?: string; fecha: string; estado?: string; }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Verificar sesión con cliente de usuario
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const points: PointRow[] = await req.json();

  if (!Array.isArray(points) || points.length === 0) return NextResponse.json({ ok: true });

  // Usar service role para bypassear RLS (política requiere admin)
  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await admin.from("team_monthly_points").delete().eq("member_id", id);

  const rows = points
    .filter((p) => p.fecha)
    .map((p) => ({
      member_id: id,
      fecha: p.fecha,
      puntos: p.puntos ?? "",
      detalles: p.detalles ?? null,
      estado: p.estado ?? null,
    }));

  if (rows.length === 0) return NextResponse.json({ ok: true });

  const { error } = await admin.from("team_monthly_points").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: rows.length });
}
