import { describe, it, expect } from "vitest";
import type { Lead } from "@/types";

/**
 * Columnas reales de la tabla `leads` en Supabase.
 * ACTUALIZAR AQUÍ cuando se agregue/elimine una columna en la DB.
 * Si el test falla porque agregaste una columna y no la pusiste acá → input huérfano detectado.
 */
const DB_LEADS_COLUMNS = [
  "id", "sheet_id", "nombre", "empresa", "telefono", "email", "instagram",
  "direccion", "cumpleanos", "nombre2", "telefono2", "cumpleanos2",
  "stage_id", "sheet_stage", "empresa_bio", "medio", "rubro", "servicio",
  "source", "mes_entrada", "responsable1", "responsable2", "observaciones",
  "objetivos", "seguimiento", "plan_audiovisual", "latitud", "longitud",
  "clave_secret_id", "proximo_seguimiento_dias", "proximo_seguimiento_fecha",
  "meeting_datetime", "plan_id", "fecha_contacto", "activo",
  "row_order", "client_order", "created_at", "updated_at", "deleted_at",
] as const;

/**
 * Columnas de la DB que NO tienen campo en el tipo Lead.
 * Cada exclusión debe tener una razón documentada.
 */
const DB_COLUMNS_INTENTIONALLY_EXCLUDED: { col: string; reason: string }[] = [
  { col: "sheet_stage",    reason: "Valor RAW de auditoría — resuelto a tab vía stageMap en adaptLead" },
  { col: "stage_id",       reason: "FK interna — resuelto a tab (string key) en adaptLead" },
  { col: "clave_secret_id",reason: "Credencial en Vault — no se expone en texto plano en el tipo Lead" },
  { col: "latitud",        reason: "Coordenadas de mapa — pendiente agregar mapLat/mapLng al tipo Lead" },
  { col: "longitud",       reason: "Coordenadas de mapa — pendiente agregar mapLat/mapLng al tipo Lead" },
  { col: "seguimiento",    reason: "Campo legado del Sheet — pendiente migrar o eliminar" },
  { col: "row_order",      reason: "Orden visual interno — no necesario en el tipo de dominio" },
  { col: "client_order",   reason: "Orden visual de clientes — no necesario en el tipo de dominio" },
  { col: "created_at",     reason: "Metadato de auditoría — no expuesto en el modelo de dominio" },
  { col: "updated_at",     reason: "Metadato de auditoría — no expuesto en el modelo de dominio" },
  { col: "deleted_at",     reason: "Soft-delete — no expuesto en el modelo de dominio" },
];

/** Mapeo canónico: columna DB → campo Lead TS */
const DB_TO_TS_MAP: Record<string, keyof Lead> = {
  id:                          "id",
  sheet_id:                    "sheetId",
  nombre:                      "nombre",
  nombre2:                     "nombre2",
  empresa:                     "empresa",
  observaciones:               "observaciones",
  telefono:                    "telefono",
  telefono2:                   "telefono2",
  responsable1:                "responsable1",
  responsable2:                "responsable2",
  direccion:                   "direccion",
  empresa_bio:                 "empresaBio",
  medio:                       "medio",
  fecha_contacto:              "fechaContacto",
  email:                       "email",
  instagram:                   "instagram",
  rubro:                       "rubro",
  servicio:                    "servicio",
  source:                      "source",
  mes_entrada:                 "mesEntrada",
  objetivos:                   "objetivos",
  plan_audiovisual:            "planAudiovisual",
  cumpleanos:                  "cumpleanos",
  cumpleanos2:                 "cumpleanos2",
  proximo_seguimiento_dias:    "proximoSeguimientoDias",
  proximo_seguimiento_fecha:   "proximoSeguimientoFecha",
  meeting_datetime:            "meetingDatetime",
  plan_id:                     "planId",
  activo:                      "activo",
};

const excludedCols = new Set(DB_COLUMNS_INTENTIONALLY_EXCLUDED.map((e) => e.col));

describe("Cobertura de esquema DB ↔ tipo Lead", () => {

  it("cada columna de leads en la DB está mapeada a Lead o documentada como exclusión intencional", () => {
    const unmapped: string[] = [];
    for (const col of DB_LEADS_COLUMNS) {
      const isMapped  = col in DB_TO_TS_MAP;
      const isExcluded = excludedCols.has(col);
      if (!isMapped && !isExcluded) unmapped.push(col);
    }
    expect(unmapped, `Columnas sin mapear ni excluir: ${unmapped.join(", ")}`).toHaveLength(0);
  });

  it("cada campo del tipo Lead tiene una columna DB correspondiente o está en la lista de excluidos del tipo", () => {
    // Campos TS que no vienen directamente de una columna (calculados o de otra fuente)
    const TS_FIELDS_NOT_FROM_COLUMN: (keyof Lead)[] = [
      "clave", // gestionado via Vault
    ];

    const mappedTsFields = new Set(Object.values(DB_TO_TS_MAP));
    const orphanTsFields: (keyof Lead)[] = [];

    // Construimos un objeto Lead ficticio para obtener sus claves
    const LEAD_KEYS: (keyof Lead)[] = [
      "id", "sheetId", "nombre", "nombre2", "empresa", "observaciones",
      "telefono", "telefono2", "responsable1", "responsable2", "direccion",
      "empresaBio", "medio", "tab", "fechaContacto", "activo",
      "email", "instagram", "rubro", "servicio", "source", "mesEntrada",
      "objetivos", "planAudiovisual", "cumpleanos", "cumpleanos2",
      "proximoSeguimientoDias", "proximoSeguimientoFecha",
      "meetingDatetime", "planId", "clave",
    ];

    for (const key of LEAD_KEYS) {
      const isMapped   = mappedTsFields.has(key);
      const isExcluded = TS_FIELDS_NOT_FROM_COLUMN.includes(key);
      // "tab" se produce desde stage_id/sheet_stage (calculado)
      const isCalculated = key === "tab";
      if (!isMapped && !isExcluded && !isCalculated) {
        orphanTsFields.push(key);
      }
    }

    expect(
      orphanTsFields,
      `Campos TS sin columna DB ni justificación: ${orphanTsFields.join(", ")}`
    ).toHaveLength(0);
  });

  it("el mapeo DB→TS es biyectivo — sin campos TS duplicados en el mapa", () => {
    const tsFieldsInMap = Object.values(DB_TO_TS_MAP);
    const unique = new Set(tsFieldsInMap);
    expect(tsFieldsInMap.length).toBe(unique.size);
  });
});
