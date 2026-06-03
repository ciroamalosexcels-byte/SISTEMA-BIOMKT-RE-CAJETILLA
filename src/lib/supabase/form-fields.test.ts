import { describe, it, expect } from "vitest";
import type { Lead, LeadFormData } from "@/types";

/**
 * Campos que el LeadModal inicializa en su estado interno (form state).
 * Extraído de lead-modal.tsx líneas 51-78.
 */
const MODAL_FORM_STATE_FIELDS: (keyof LeadFormData)[] = [
  "nombre", "nombre2", "empresa", "telefono", "telefono2",
  "email", "instagram", "direccion", "responsable1", "responsable2",
  "empresaBio", "medio", "observaciones", "rubro", "servicio",
  "objetivos", "meetingDatetime", "proximoSeguimientoFecha", "source",
  "planAudiovisual", "clave", "activo", "mesEntrada",
  "cumpleanos", "cumpleanos2", "planId", "proximoSeguimientoDias",
];

/**
 * Campos que el LeadModal renderiza como inputs visibles para el usuario.
 * Extraído del JSX de lead-modal.tsx.
 */
const MODAL_RENDERED_INPUTS: (keyof LeadFormData)[] = [
  "nombre", "empresa",
  "nombre2", "telefono2",           // 2do contacto (condicional)
  "observaciones",
  "direccion", "telefono",
  "email", "instagram",             // contacto digital
  "responsable1", "responsable2",
  "medio", "empresaBio",
  "proximoSeguimientoFecha",
  "meetingDatetime",
  // fechaContacto es estado separado, no parte de LeadFormData
];

/**
 * Campos en el form state que intencionalmente no tienen input en el modal
 * (editables en otras vistas, ej: client-detail-view.tsx).
 */
const INTENTIONALLY_NOT_IN_MODAL: { field: keyof LeadFormData; editableWhere: string }[] = [
  { field: "rubro",                    editableWhere: "client-detail-view.tsx" },
  { field: "servicio",                 editableWhere: "client-detail-view.tsx" },
  { field: "objetivos",                editableWhere: "client-detail-view.tsx" },
  { field: "source",                   editableWhere: "client-detail-view.tsx" },
  { field: "planAudiovisual",          editableWhere: "client-detail-view.tsx" },
  { field: "mesEntrada",               editableWhere: "client-detail-view.tsx" },
  { field: "cumpleanos",               editableWhere: "client-detail-view.tsx" },
  { field: "cumpleanos2",              editableWhere: "client-detail-view.tsx" },
  { field: "planId",                   editableWhere: "asignación de planes" },
  { field: "proximoSeguimientoDias",   editableWhere: "prompt de seguimiento en kanban" },
  { field: "activo",                   editableWhere: "client-detail-view.tsx" },
  { field: "clave",                    editableWhere: "Supabase Vault — nunca texto plano en UI" },
];

describe("LeadModal — form state vs inputs visibles", () => {

  it("cada campo del form state está en los inputs visibles O documentado como intencional", () => {
    const renderedSet = new Set(MODAL_RENDERED_INPUTS);
    const intentionalSet = new Set(INTENTIONALLY_NOT_IN_MODAL.map((e) => e.field));

    const orphans = MODAL_FORM_STATE_FIELDS.filter(
      (f) => !renderedSet.has(f) && !intentionalSet.has(f)
    );

    expect(
      orphans,
      `Campos en el form state sin input visible ni justificación: ${orphans.join(", ")}`
    ).toHaveLength(0);
  });

  it("cada input visible del modal tiene su campo en el form state", () => {
    const stateSet = new Set(MODAL_FORM_STATE_FIELDS);
    const missing = MODAL_RENDERED_INPUTS.filter((f) => !stateSet.has(f));
    expect(
      missing,
      `Inputs renderizados sin campo en el form state: ${missing.join(", ")}`
    ).toHaveLength(0);
  });

  it("LeadFormData no tiene campos fuera de lo que el modal conoce", () => {
    // Si se agrega un campo a LeadFormData sin actualizarlo acá → test falla
    const ALL_KNOWN: (keyof LeadFormData)[] = [
      ...MODAL_FORM_STATE_FIELDS,
    ];
    const LEAD_FORM_DATA_KEYS: (keyof LeadFormData)[] = [
      "nombre", "nombre2", "empresa", "observaciones", "telefono", "telefono2",
      "responsable1", "responsable2", "direccion", "empresaBio", "medio",
      "email", "instagram", "rubro", "servicio", "source", "mesEntrada",
      "objetivos", "planAudiovisual", "cumpleanos", "cumpleanos2",
      "proximoSeguimientoDias", "proximoSeguimientoFecha", "meetingDatetime",
      "planId", "clave", "activo",
    ];
    const unknown = LEAD_FORM_DATA_KEYS.filter((k) => !ALL_KNOWN.includes(k));
    expect(
      unknown,
      `Campos en LeadFormData no registrados en los tests: ${unknown.join(", ")}`
    ).toHaveLength(0);
  });
});
