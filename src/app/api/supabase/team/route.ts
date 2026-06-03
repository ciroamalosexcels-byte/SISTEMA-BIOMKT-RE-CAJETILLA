import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STATUS91_ITEMS } from "@/lib/constants";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const [{ data: members }, { data: status91 }, { data: points }] = await Promise.all([
    supabase.from("team_members").select("*").is("deleted_at", null),
    supabase.from("team_status_91").select("*"),
    supabase.from("team_monthly_points").select("*"),
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
