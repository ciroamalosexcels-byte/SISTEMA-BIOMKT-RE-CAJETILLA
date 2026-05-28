import { create } from "zustand";
import { storage } from "@/lib/storage";
import { saveToSheets } from "@/lib/sheets";
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

let nextId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function deduplicateById(rows: Lead[]): Lead[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

export { deduplicateById as deduplicateLeads };

/* ── Debounce para updateLead: guarda checkpoint sólo antes del primer
   cambio en una secuencia de edición (800 ms de inactividad = nueva seq) */
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
      if (!r.fechaContacto || /^\d{4}-\d{2}-\d{2}/.test(r.fechaContacto)) return r;
      return { ...r, fechaContacto: normalizeISODate(r.fechaContacto) || todayBA() };
    });
    if (rows.some((r, i) => r !== rawRows[i])) storage.setLeads(rows);
    set({ rows });
  },

  addLead(data, tab) {
    const { rows, past } = get();
    const lead: Lead = {
      ...data,
      id: nextId(),
      tab,
      fechaContacto: nowDatetimeBA(),
    };
    set({
      rows: [...rows, lead],
      dirty: true,
      past: [...past.slice(-(MAX_HISTORY - 1)), rows],
      future: [],
    });
    storage.setLeads(get().rows);
  },

  updateLead(id, patch) {
    // Guarda checkpoint antes del primer cambio en la secuencia de edición
    if (!updateCheckpointed) {
      const { rows, past } = get();
      set({ past: [...past.slice(-(MAX_HISTORY - 1)), rows], future: [] });
      updateCheckpointed = true;
    }
    if (updateTimer) clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      updateCheckpointed = false;
      updateTimer = null;
    }, 800);

    set((s) => ({
      rows: s.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      dirty: true,
    }));
    storage.setLeads(get().rows);
  },

  deleteLead(id) {
    const { rows, past } = get();
    set({
      rows: rows.filter((r) => r.id !== id),
      dirty: true,
      past: [...past.slice(-(MAX_HISTORY - 1)), rows],
      future: [],
    });
    storage.setLeads(get().rows);
  },

  moveLeadTo(id, tab) {
    get().updateLead(id, { tab });
  },

  undo() {
    const { past, rows, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      rows: prev,
      past: past.slice(0, -1),
      future: [rows, ...future].slice(0, MAX_HISTORY),
      dirty: true,
    });
    storage.setLeads(prev);
  },

  redo() {
    const { past, rows, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      rows: next,
      past: [...past.slice(-(MAX_HISTORY - 1)), rows],
      future: future.slice(1),
      dirty: true,
    });
    storage.setLeads(next);
  },

  setHighlightLeadId(id) { set({ highlightLeadId: id }); },

  async save() {
    set({ saving: true });
    try {
      await saveToSheets({ action: "saveSheet", sheet: "Leads", rows: get().rows });
      set({ dirty: false });
    } finally {
      set({ saving: false });
    }
  },
}));
