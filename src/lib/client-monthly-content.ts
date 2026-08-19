import type { ClientMonthlyContent, ContentCounts } from "@/types";

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
