import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const admin = createAdminClient();

  const row = {
    nombre:          body.nombre,
    edad:            body.edad ?? null,
    equipo:          body.equipo ?? null,
    roles:           body.roles ?? null,
    horarios:        body.horarios ?? null,
    sueno:           body.sueno ?? null,
    telefono:        body.telefono ?? null,
    mail:            body.mail ?? null,
    direccion:       body.direccion ?? null,
    fecha_nacimiento: body.fechaNacimiento ?? null,
    notas:           body.notas ?? null,
    signo:           body.signo ?? null,
    signo_chino:     body.signoChino ?? null,
    badges:          body.badges ?? [],
  };

  const { error } = await admin.from("team_members").update(row).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
