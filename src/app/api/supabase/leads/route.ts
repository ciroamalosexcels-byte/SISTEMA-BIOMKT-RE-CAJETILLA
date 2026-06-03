import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const [{ data: stages }, { data: leads }] = await Promise.all([
    supabase.from("pipeline_stages").select("id, stage_key"),
    supabase
      .from("leads")
      .select("*")
      .is("deleted_at", null)
      .order("row_order", { ascending: true, nullsFirst: false }),
  ]);

  const stageMap = new Map(stages?.map((s) => [s.id, s.stage_key]) ?? []);

  const mapped = (leads ?? []).map((row) => ({
    id: row.id,
    sheetId: row.sheet_id ?? undefined,
    nombre: row.nombre,
    nombre2: row.nombre2 ?? undefined,
    empresa: row.empresa,
    observaciones: row.observaciones ?? "",
    telefono: row.telefono ?? "",
    telefono2: row.telefono2 ?? undefined,
    responsable1: row.responsable1,
    responsable2: row.responsable2 ?? "",
    direccion: row.direccion ?? "",
    empresaBio: (row.empresa_bio ?? "BIOMARKETING") as "BIOMARKETING" | "BIOESTRATEGIA",
    medio: (row.medio ?? "") as "PRESENCIAL" | "LLAMADA" | "WHATSAPP" | "INSTAGRAM" | "MAIL" | "",
    tab: stageMap.get(row.stage_id ?? "") ?? row.sheet_stage ?? "CRM",
    fechaContacto: row.fecha_contacto,
    email: row.email ?? undefined,
    instagram: row.instagram ?? undefined,
    rubro: row.rubro ?? undefined,
    servicio: row.servicio ?? undefined,
    source: row.source ?? undefined,
    mesEntrada: row.mes_entrada ?? undefined,
    objetivos: row.objetivos ?? undefined,
    planAudiovisual: row.plan_audiovisual ?? undefined,
    cumpleanos: row.cumpleanos ?? undefined,
    cumpleanos2: row.cumpleanos2 ?? undefined,
    proximoSeguimientoDias: row.proximo_seguimiento_dias ?? undefined,
    proximoSeguimientoFecha: row.proximo_seguimiento_fecha ?? undefined,
    meetingDatetime: row.meeting_datetime ?? undefined,
    planId: row.plan_id ?? undefined,
    activo: row.activo,
  }));

  return NextResponse.json(mapped);
}
