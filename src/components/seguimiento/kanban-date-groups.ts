import { normalizeISODate } from "@/lib/dates";
import type { Lead } from "@/types";

export function groupLeadsByStageDate(leads: Lead[], stageId: string): { date: string; leads: Lead[] }[] {
  const dateValue = (lead: Lead) => normalizeISODate(
    stageId === "CRM" ? lead.fechaContacto : lead.proximoSeguimientoFecha
  );
  const sorted = [...leads].sort((a, b) => {
    const aDate = dateValue(a);
    const bDate = dateValue(b);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return bDate.localeCompare(aDate);
  });
  const groups: { date: string; leads: Lead[] }[] = [];
  for (const lead of sorted) {
    const date = dateValue(lead).slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.leads.push(lead);
    else groups.push({ date, leads: [lead] });
  }
  return groups;
}
