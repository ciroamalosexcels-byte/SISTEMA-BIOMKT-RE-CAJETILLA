import type { Lead, ContentEvent, ManagementEvent, Plan, PlanEvent } from "@/types";

/** Convierte string vacío a null — evita errores de tipo en columnas date/timestamptz */
const d = (v: string | undefined | null) => (v && v.trim()) ? v : null;

/** Lead TS → leads DB row */
export function serializeLead(lead: Lead, stageMap: Map<string, string>) {
  return {
    id:                        lead.id,
    sheet_id:                  lead.sheetId ?? null,
    nombre:                    lead.nombre,
    empresa:                   lead.empresa,
    telefono:                  lead.telefono || null,
    email:                     lead.email ?? null,
    instagram:                 lead.instagram ?? null,
    direccion:                 lead.direccion || null,
    nombre2:                   lead.nombre2 ?? null,
    telefono2:                 lead.telefono2 ?? null,
    responsable1:              lead.responsable1,
    responsable2:              lead.responsable2 || null,
    observaciones:             lead.observaciones || null,
    empresa_bio:               lead.empresaBio,
    medio:                     lead.medio || null,
    stage_id:                  stageMap.get(lead.tab) ?? null,
    sheet_stage:               lead.tab,
    fecha_contacto:            lead.fechaContacto,
    cumpleanos:                d(lead.cumpleanos),
    cumpleanos2:               d(lead.cumpleanos2),
    proximo_seguimiento_dias:  lead.proximoSeguimientoDias ?? null,
    proximo_seguimiento_fecha: d(lead.proximoSeguimientoFecha),
    meeting_datetime:          d(lead.meetingDatetime),
    plan_id:                   lead.planId ?? null,
    activo:                    lead.activo ?? true,
    ticket:                    lead.ticket ?? null,
    clave_email:               lead.claveEmail ?? null,
    rubro:                     lead.rubro ?? null,
    servicio:                  lead.servicio ?? null,
    source:                    lead.source ?? null,
    mes_entrada:               lead.mesEntrada ?? null,
    objetivos:                 lead.objetivos ?? null,
    plan_audiovisual:          lead.planAudiovisual ?? null,
  };
}

/** ContentEvent TS → content_events DB row */
export function serializeContentEvent(e: ContentEvent) {
  return {
    id:              e.id,
    client_id:       e.clientId,
    title:           e.title,
    type:            e.type || null,
    status:          e.status || null,
    scheduled_date:  d(e.scheduledDate),
    done:            e.done,
    timer_seconds:   e.timerSeconds,
    timer_running:   e.timerRunning,
    timer_started_at: e.timerStartedAt ?? null,
    notes:           e.notes ?? null,
    event_order:     e.order,
    assignee:        e.assignee ?? null,
    objetivo:        e.objetivo ?? null,
    frase:           e.frase ?? null,
    copy:            e.copy ?? null,
    archivo:         e.archivo ?? null,
  };
}

/** ManagementEvent TS → management_events DB row */
export function serializeManagementEvent(e: ManagementEvent) {
  return {
    id:        e.id,
    client_id: e.clientId,
    title:     e.title,
    type:      e.type || null,
    datetime:  d(e.datetime),
    done:      e.done,
    notes:     e.notes ?? null,
  };
}

/** Plan TS → plans DB row */
export function serializePlan(p: Plan) {
  return {
    id:          p.id,
    nombre:      p.nombre,
    descripcion: p.descripcion ?? null,
  };
}

/** PlanEvent TS → plan_events DB row */
export function serializePlanEvent(e: PlanEvent) {
  return {
    id:              e.id,
    plan_id:         e.planId,
    title:           e.title,
    type:            e.type || null,
    status:          e.status || null,
    scheduled_date:  d(e.scheduledDate),
    plan_slot:       e.planSlot ?? null,
    frase:           e.frase ?? null,
    notes:           e.notes ?? null,
    assignee:        e.assignee ?? null,
    timer_seconds:   e.timerSeconds,
    timer_running:   e.timerRunning,
    timer_started_at: e.timerStartedAt ?? null,
    event_order:     e.order,
    done:            e.done,
  };
}
