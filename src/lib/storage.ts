import { STORAGE_KEYS } from "./constants";
import type { Lead, TeamMember, ContentEvent, ManagementEvent, Plan, PlanEvent } from "@/types";

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded — silently fail
  }
}

export const storage = {
  getLeads: () => safeGet<Lead[]>(STORAGE_KEYS.rows, []),
  setLeads: (rows: Lead[]) => safeSet(STORAGE_KEYS.rows, rows),

  getTeam: () => safeGet<TeamMember[]>(STORAGE_KEYS.team, []),
  setTeam: (team: TeamMember[]) => safeSet(STORAGE_KEYS.team, team),

  getContentEvents: () => safeGet<ContentEvent[]>(STORAGE_KEYS.contentEvents, []),
  setContentEvents: (events: ContentEvent[]) => safeSet(STORAGE_KEYS.contentEvents, events),

  getManagementEvents: () => safeGet<ManagementEvent[]>(STORAGE_KEYS.managementEvents, []),
  setManagementEvents: (events: ManagementEvent[]) => safeSet(STORAGE_KEYS.managementEvents, events),

  getColumnWidths: () => safeGet<Record<string, number>>(STORAGE_KEYS.columnWidths, {}),
  setColumnWidths: (widths: Record<string, number>) => safeSet(STORAGE_KEYS.columnWidths, widths),

  getPlans: () => safeGet<Plan[]>(STORAGE_KEYS.plans, []),
  setPlans: (plans: Plan[]) => safeSet(STORAGE_KEYS.plans, plans),

  getPlanEvents: () => safeGet<PlanEvent[]>(STORAGE_KEYS.planEvents, []),
  setPlanEvents: (events: PlanEvent[]) => safeSet(STORAGE_KEYS.planEvents, events),
};
