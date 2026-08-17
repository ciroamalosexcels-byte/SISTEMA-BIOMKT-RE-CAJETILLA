import type { ClientMonthlyContent } from "@/types";

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
