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

  const str = (v: unknown): string | null => {
    if (v == null) return null;
    const s = String(v).trim();
    return s || null;
  };
  const row = {
    nombre:           str(body.nombre) ?? body.nombre,
    edad:             str(body.edad),
    equipo:           str(body.equipo),
    roles:            str(body.roles),
    horarios:         str(body.horarios),
    sueldo:           str(body.sueldo),
    sueno:            str(body.sueno),
    telefono:         str(body.telefono),
    mail:             str(body.mail),
    direccion:        str(body.direccion),
    fecha_nacimiento: str(body.fechaNacimiento), // date — string vacío → null
    notas:            str(body.notas),
    signo:            str(body.signo),
    signo_chino:      str(body.signoChino),
    badges:           Array.isArray(body.badges) ? body.badges : [],
  };

  const { error } = await admin.from("team_members").update(row as any).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
