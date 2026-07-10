import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATUS91_ITEMS } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const admin = createAdminClient();
  const [{ data: members }, { data: status91 }, { data: points }] = await Promise.all([
    admin.from("team_members").select("*").is("deleted_at", null),
    admin.from("team_status_91").select("*").eq("mes", new Date().toISOString().slice(0, 7)),
    admin.from("team_monthly_points").select("*"),
  ]);

  const mapped = (members ?? []).map((m) => {
    const s91: Record<string, string> = Object.fromEntries(
      STATUS91_ITEMS.map((k) => [k, ""])
    );
    (status91 ?? [])
      .filter((s) => s.member_id === m.id)
      .forEach((s) => { s91[s.item] = s.estado; });

    return {
      id: m.id,
      nombre: m.nombre,
      edad: m.edad ?? undefined,
      equipo: m.equipo ?? undefined,
      roles: m.roles ?? undefined,
      horarios: m.horarios ?? undefined,
      sueno: m.sueno ?? undefined,
      telefono: m.telefono ?? undefined,
      mail: m.mail ?? undefined,
      direccion: m.direccion ?? undefined,
      fechaNacimiento: m.fecha_nacimiento ?? undefined,
      notas: m.notas ?? undefined,
      signo: m.signo ?? undefined,
      signoChino: m.signo_chino ?? undefined,
      signoMaya: m.signo_maya ?? undefined,
      tonoMaya: m.tono_maya ?? undefined,
      colorMaya: m.color_maya ?? undefined,
      direccionMaya: m.direccion_maya ?? undefined,
      elementoMaya: m.elemento_maya ?? undefined,
      sueldo: (m as any).sueldo ?? undefined,
      activo: (m as any).activo ?? true,
      color: m.color ?? undefined,
      badges: m.badges as ("wood" | "bronze" | "silver" | "gold")[],
      status91: s91,
      monthlyPoints: (points ?? [])
        .filter((p) => p.member_id === m.id)
        .map((p) => ({
          puntos: p.puntos,
          detalles: p.detalles ?? "",
          fecha: p.fecha,
          estado: (p.estado ?? "") as "red" | "yellow" | "green" | "lime" | "",
        })),
    };
  });

  return NextResponse.json(mapped);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const str = (v: unknown): string | null => {
    if (v == null) return null;
    const s = String(v).trim();
    return s || null;
  };

  const { data, error } = await admin.from("team_members").insert({
    id:               body.id,
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
    fecha_nacimiento: str(body.fechaNacimiento),
    notas:            str(body.notas),
    signo:            str(body.signo),
    signo_chino:      str(body.signoChino),
    signo_maya:       str(body.signoMaya),
    tono_maya:        str(body.tonoMaya),
    color_maya:       str(body.colorMaya),
    direccion_maya:   str(body.direccionMaya),
    elemento_maya:    str(body.elementoMaya),
    badges:           Array.isArray(body.badges) ? body.badges : [],
    activo:           typeof body.activo === "boolean" ? body.activo : true,
    color:            str(body.color),
  } as any).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
