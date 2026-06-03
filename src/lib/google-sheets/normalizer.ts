import type { LeadInsert, TablesInsert } from "@/types/supabase";

type SheetRow = Record<string, string>;

type TeamMemberInsert = TablesInsert<"team_members">;

// ─── helpers ──────────────────────────────────────────────────────────────────

function str(v: string | undefined): string | null {
  const s = v?.trim();
  return s ? s : null;
}

function int(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function parseIsoDate(v: string | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseDateOnly(v: string | undefined): string | null {
  const iso = parseIsoDate(v);
  return iso ? iso.split("T")[0] : null;
}

function parseCoord(row: SheetRow, ...keys: string[]): number | null {
  for (const key of keys) {
    const v = parseFloat(row[key] ?? "");
    if (!isNaN(v) && v !== 0) return v;
  }
  return null;
}

function parseCoordenadas(raw: string | undefined): [number | null, number | null] {
  if (!raw) return [null, null];
  const parts = raw.split(",");
  if (parts.length !== 2) return [null, null];
  const lat = parseFloat(parts[0].trim());
  const lng = parseFloat(parts[1].trim());
  return [isNaN(lat) ? null : lat, isNaN(lng) ? null : lng];
}

const VALID_EMPRESA_BIO = ["BIOMARKETING", "BIOESTRATEGIA"] as const;
const VALID_MEDIO = ["PRESENCIAL", "LLAMADA", "WHATSAPP", "INSTAGRAM", "MAIL"] as const;

// ─── leads ────────────────────────────────────────────────────────────────────

export type NormalizedLead = LeadInsert & {
  _stageKey: string;
};

export function normalizeLeadRow(row: SheetRow): NormalizedLead | null {
  if (!row.id) return null;

  const [coordLat, coordLng] = parseCoordenadas(row.coordenadas);

  const latitud =
    parseCoord(row, "lat", "latitude", "latitud", "mapLat") ?? coordLat;
  const longitud =
    parseCoord(row, "lng", "longitude", "longitud", "mapLng") ?? coordLng;

  const rawEmpresa = (row.empresaBio ?? "").toUpperCase().trim();
  const empresa_bio = (
    VALID_EMPRESA_BIO.includes(rawEmpresa as (typeof VALID_EMPRESA_BIO)[number])
      ? rawEmpresa
      : "BIOMARKETING"
  ) as "BIOMARKETING" | "BIOESTRATEGIA";

  const rawMedio = (row.medio ?? "").toUpperCase().trim();
  const medio = (
    VALID_MEDIO.includes(rawMedio as (typeof VALID_MEDIO)[number]) ? rawMedio : null
  ) as LeadInsert["medio"];

  const stageKey = (row.etapa ?? row.tab ?? "CRM").toUpperCase().trim();

  return {
    _stageKey: stageKey,

    sheet_id: row.id,
    sheet_stage: str(row.etapa ?? row.tab),

    nombre: str(row.nombre) ?? "",
    nombre2: str(row.nombre2),
    empresa: str(row.empresa) ?? "",
    observaciones: str(row.observaciones),
    telefono: str(row.telefono),
    telefono2: str(row.telefono2),
    responsable1: str(row.responsable1) ?? "",
    responsable2: str(row.responsable2),
    direccion: str(row.direccion),

    empresa_bio,
    medio,

    email: str(row.email),
    instagram: str(row.instagram),
    rubro: str(row.rubro),
    servicio: str(row.servicio),
    source: str(row.source),
    mes_entrada: str(row.mesEntrada),
    objetivos: str(row.objetivos),
    plan_audiovisual: str(row.planAudiovisual),
    seguimiento: str(row.seguimiento),

    fecha_contacto: parseIsoDate(row.fechaContacto) ?? new Date().toISOString(),
    cumpleanos: parseDateOnly(row.cumpleanos),
    cumpleanos2: parseDateOnly(row.cumpleanos2),
    proximo_seguimiento_fecha: parseDateOnly(row.proximoSeguimientoFecha ?? row.proximaFecha),
    proximo_seguimiento_dias: int(row.proximoSeguimientoDias),
    meeting_datetime: parseIsoDate(row.meetingDatetime),

    row_order: int(row.rowOrder),
    client_order: int(row.clientOrder ?? row.ordenCliente),

    latitud: latitud ?? null,
    longitud: longitud ?? null,

    activo: row.activo !== "false",
  };
}

// ─── team members ─────────────────────────────────────────────────────────────

export function normalizeTeamRow(row: SheetRow): TeamMemberInsert | null {
  if (!row.id) return null;

  return {
    sheet_id: row.id,
    nombre: str(row.nombre) ?? "",
    edad: str(row.edad),
    equipo: str(row.equipo),
    roles: str(row.roles),
    horarios: str(row.horarios),
    sueno: str(row.sueno),
    telefono: str(row.telefono),
    mail: str(row.mail),
    direccion: str(row.direccion),
    fecha_nacimiento: parseDateOnly(row.fechaNacimiento),
    notas: str(row.notas),
    signo: str(row.signo),
    signo_chino: str(row.signoChino),
    badges: [],
  };
}
