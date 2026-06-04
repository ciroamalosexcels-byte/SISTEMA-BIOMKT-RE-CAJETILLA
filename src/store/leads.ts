import { create } from "zustand";
import { storage } from "@/lib/storage";
// import { saveToSheets } from "@/lib/sheets"; // Sheets comentado — persistencia via Supabase
import { todayBA, nowDatetimeBA, normalizeISODate } from "@/lib/dates";
import type { Lead, TabKey, LeadFormData } from "@/types";

const MAX_HISTORY = 50;

interface LeadsStore {
  rows: Lead[];
  dirty: boolean;
  saving: boolean;
  past: Lead[][];
  future: Lead[][];
  highlightLeadId: string | null;
  load: () => void;
  addLead: (data: LeadFormData, tab: TabKey) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  moveLeadTo: (id: string, tab: TabKey) => void;
  undo: () => void;
  redo: () => void;
  save: () => Promise<void>;
  setHighlightLeadId: (id: string | null) => void;
}

function nextId() {
  return crypto.randomUUID();
}

function deduplicateById(rows: Lead[]): Lead[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

export { deduplicateById as deduplicateLeads };

function supabase(path: string, method: string, body: unknown) {
  fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then(r => r.ok ? null : r.json().then(e => console.error(`[leads] ${path} error:`, e)))
    .catch(e => console.error(`[leads] ${path} fetch error:`, e));
}

let updateTimer: ReturnType<typeof setTimeout> | null = null;
let updateCheckpointed = false;

export const useLeadsStore = create<LeadsStore>((set, get) => ({
  rows: [],
  dirty: false,
  saving: false,
  past: [],
  future: [],
  highlightLeadId: null,

  load() {
    const rawRows = deduplicateById(storage.getLeads());
    const rows = rawRows.map((r) => {
      if (r.fechaContacto && /^\d{4}-\d{2}-\d{2}/.test(String(r.fechaContacto))) return r;
      const normalized = normalizeISODate(r.fechaContacto as string);
      return { ...r, fechaContacto: normalized || todayBA() };
    });
    if (rows.some((r, i) => r !== rawRows[i])) storage.setLeads(rows);
    set({ rows });
  },

  addLead(data, tab) {
    const { rows, past } = get();
    const lead: Lead = { ...data, id: nextId(), tab, fechaContacto: nowDatetimeBA() };
    set({ rows: [...rows, lead], dirty: true, past: [...past.slice(-(MAX_HISTORY - 1)), rows], future: [] });
    storage.setLeads(get().rows);
    supabase("/api/supabase/leads", "POST", lead);
  },

  updateLead(id, patch) {
    if (!updateCheckpointed) {
      const { rows, past } = get();
      set({ past: [...past.slice(-(MAX_HISTORY - 1)), rows], future: [] });
      updateCheckpointed = true;
    }
    if (updateTimer) clearTimeout(updateTimer);
    updateTimer = setTimeout(() => { updateCheckpointed = false; updateTimer = null; }, 800);

    set((s) => ({ rows: s.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)), dirty: true }));
    storage.setLeads(get().rows);
    const updated = get().rows.find(r => r.id === id);
    if (updated) supabase(`/api/supabase/leads/${id}`, "PATCH", updated);
  },

  deleteLead(id) {
    const { rows, past } = get();
    set({ rows: rows.filter((r) => r.id !== id), dirty: true, past: [...past.slice(-(MAX_HISTORY - 1)), rows], future: [] });
    storage.setLeads(get().rows);
    supabase(`/api/supabase/leads/${id}`, "DELETE", {});
  },

  moveLeadTo(id, tab) { get().updateLead(id, { tab }); },

  undo() {
    const { past, rows, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({ rows: prev, past: past.slice(0, -1), future: [rows, ...future].slice(0, MAX_HISTORY), dirty: true });
    storage.setLeads(prev);
  },

  redo() {
    const { past, rows, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({ rows: next, past: [...past.slice(-(MAX_HISTORY - 1)), rows], future: future.slice(1), dirty: true });
    storage.setLeads(next);
  },

  setHighlightLeadId(id) { set({ highlightLeadId: id }); },

  async save() {
    // Sheets comentado — los cambios ya se guardan en Supabase en tiempo real
    // await saveToSheets({ action: "saveSheet", sheet: "Leads", rows: get().rows });
    set({ dirty: false });
  },
}));
