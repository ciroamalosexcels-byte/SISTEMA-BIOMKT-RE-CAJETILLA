import type { ClientMonthlyContent, ContentCounts, ContentEvent } from "@/types";

export function findMonthlyRecord(
  records: ClientMonthlyContent[],
  clientId: string,
  month: string,
): ClientMonthlyContent | undefined {
  return records.find((r) => r.clientId === clientId && r.month === month);
}

export function getMostRecentContratado(
  records: ClientMonthlyContent[],
  clientId: string,
  beforeMonth: string,
): { historiasContratadas: number; reelsContratados: number; publicacionesContratadas: number } {
  const candidates = records
    .filter((r) => r.clientId === clientId && r.month < beforeMonth)
    .filter((r) => r.historiasContratadas > 0 || r.reelsContratados > 0 || r.publicacionesContratadas > 0)
    .sort((a, b) => b.month.localeCompare(a.month));

  const found = candidates[0];
  return found
    ? {
        historiasContratadas: found.historiasContratadas,
        reelsContratados: found.reelsContratados,
        publicacionesContratadas: found.publicacionesContratadas,
      }
    : { historiasContratadas: 0, reelsContratados: 0, publicacionesContratadas: 0 };
}

/**
 * El mes elegido, con su registro explícito si existe. Si no existe,
 * repite hacia adelante lo contratado del mes explícito más reciente
 * (con "hecho" en 0, porque en este mes todavía no se marcó nada) — así
 * lo contratado sigue vigente mes a mes hasta que se lo edite de nuevo,
 * y ese cambio nunca reescribe meses anteriores.
 * undefined si el cliente nunca tuvo nada contratado.
 */
export function resolveMonthlyContent(
  records: ClientMonthlyContent[],
  clientId: string,
  month: string,
): ContentCounts | undefined {
  const existing = findMonthlyRecord(records, clientId, month);
  if (existing) return existing;

  const prefill = getMostRecentContratado(records, clientId, month);
  if (prefill.historiasContratadas === 0 && prefill.reelsContratados === 0 && prefill.publicacionesContratadas === 0) {
    return undefined;
  }
  return {
    historiasHechas: 0,
    historiasContratadas: prefill.historiasContratadas,
    reelsHechos: 0,
    reelsContratados: prefill.reelsContratados,
    publicacionesHechas: 0,
    publicacionesContratadas: prefill.publicacionesContratadas,
  };
}

/**
 * "Hecho" ya no es un número que se tipea a mano: es un espejo de cuántos
 * ContentEvent de ese tipo/mes/cliente están en estado CALENDARIZADO. Fuente
 * única de verdad = el calendario de Planificación.
 */
export function countCalendarizadoByType(
  contentEvents: ContentEvent[],
  clientId: string,
  month: string, // "YYYY-MM"
  type: ContentEvent["type"],
): number {
  return contentEvents.filter(
    (e) => e.clientId === clientId && e.type === type && e.status === "CALENDARIZADO" && (e.scheduledDate ?? "").startsWith(month)
  ).length;
}

/** Reemplaza los *Hechas/*Hechos guardados por el conteo en vivo de CALENDARIZADO. */
export function withLiveHechos<T extends ContentCounts>(
  record: T,
  contentEvents: ContentEvent[],
  clientId: string,
  month: string,
): T {
  return {
    ...record,
    historiasHechas: countCalendarizadoByType(contentEvents, clientId, month, "HISTORIA"),
    reelsHechos: countCalendarizadoByType(contentEvents, clientId, month, "REEL"),
    publicacionesHechas: countCalendarizadoByType(contentEvents, clientId, month, "PLACA"),
  };
}

/**
 * Busca qué evento marcar/desmarcar como CALENDARIZADO cuando se usa +/- en el
 * contador. direction 1 = marcar (el pendiente más próximo en fecha),
 * direction -1 = desmarcar (el calendarizado más reciente).
 */
export function findEventToToggleCalendarizado(
  contentEvents: ContentEvent[],
  clientId: string,
  month: string,
  type: ContentEvent["type"],
  direction: 1 | -1,
): ContentEvent | undefined {
  if (direction > 0) {
    return contentEvents
      .filter((e) => e.clientId === clientId && e.type === type && e.status !== "CALENDARIZADO" && (e.scheduledDate ?? "").startsWith(month))
      .sort((a, b) => (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? ""))[0];
  }
  return contentEvents
    .filter((e) => e.clientId === clientId && e.type === type && e.status === "CALENDARIZADO" && (e.scheduledDate ?? "").startsWith(month))
    .sort((a, b) => (b.scheduledDate ?? "").localeCompare(a.scheduledDate ?? ""))[0];
}
