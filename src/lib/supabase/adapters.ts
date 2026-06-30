import { STATUS91_ITEMS } from "@/lib/constants";
import type { Lead, TeamMember, BadgeKey } from "@/types";
import type { StatusColor } from "@/types/team-member";
import type {
  LeadRow,
  TeamMemberRow,
  TeamStatus91Row,
  TeamMonthlyPointRow,
} from "@/types/supabase";

export function adaptLead(row: LeadRow, stageMap: Map<string, string>): Lead {
  return {
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
    empresaBio: (row.empresa_bio as Lead["empresaBio"]) ?? "BIOMARKETING",
    medio: (row.medio as Lead["medio"]) ?? "",
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
    ticket: (row as any).ticket ?? undefined,
    clave: row.clave ?? undefined,
    claveEmail: row.clave_email ?? undefined,
    clientOrder: row.client_order ?? undefined,
  };
}

export function adaptTeamMember(
  row: TeamMemberRow,
  allStatus91: TeamStatus91Row[],
  allPoints: TeamMonthlyPointRow[]
): TeamMember {
  const status91: Record<string, string> = Object.fromEntries(
    STATUS91_ITEMS.map((k) => [k, ""])
  );
  allStatus91
    .filter((s) => s.member_id === row.id)
    .forEach((s) => { status91[s.item] = s.estado; });

  const monthlyPoints = allPoints
    .filter((p) => p.member_id === row.id)
    .map((p) => ({
      puntos: p.puntos,
      detalles: p.detalles ?? "",
      fecha: p.fecha,
      estado: (p.estado ?? "") as StatusColor,
    }));

  return {
    id: row.id,
    nombre: row.nombre,
    edad: row.edad ?? undefined,
    equipo: row.equipo ?? undefined,
    roles: row.roles ?? undefined,
    horarios: row.horarios ?? undefined,
    sueldo: (row as any).sueldo ?? undefined,
    activo: (row as any).activo ?? true,
    sueno: row.sueno ?? undefined,
    telefono: row.telefono ?? undefined,
    mail: row.mail ?? undefined,
    direccion: row.direccion ?? undefined,
    fechaNacimiento: row.fecha_nacimiento ?? undefined,
    notas: row.notas ?? undefined,
    signo: row.signo ?? undefined,
    signoChino: row.signo_chino ?? undefined,
    badges: (row.badges as BadgeKey[]) ?? [],
    color: row.color ?? undefined,
    status91,
    monthlyPoints,
  };
}
