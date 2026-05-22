import { create } from "zustand";
import { storage } from "@/lib/storage";
import { saveToSheets } from "@/lib/sheets";
import { todayBA } from "@/lib/dates";
import type { Lead, TabKey, LeadFormData } from "@/types";

interface LeadsStore {
  rows: Lead[];
  dirty: boolean;
  saving: boolean;
  load: () => void;
  addLead: (data: LeadFormData, tab: TabKey) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  moveLeadTo: (id: string, tab: TabKey) => void;
  save: () => Promise<void>;
}

let nextId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const useLeadsStore = create<LeadsStore>((set, get) => ({
  rows: [],
  dirty: false,
  saving: false,

  load() {
    const rows = storage.getLeads();
    set({ rows });
  },

  addLead(data, tab) {
    const lead: Lead = {
      ...data,
      id: nextId(),
      tab,
      fechaContacto: todayBA(),
    };
    set((s) => ({ rows: [...s.rows, lead], dirty: true }));
    storage.setLeads(get().rows);
  },

  updateLead(id, patch) {
    set((s) => ({
      rows: s.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      dirty: true,
    }));
    storage.setLeads(get().rows);
  },

  deleteLead(id) {
    set((s) => ({ rows: s.rows.filter((r) => r.id !== id), dirty: true }));
    storage.setLeads(get().rows);
  },

  moveLeadTo(id, tab) {
    get().updateLead(id, { tab });
  },

  async save() {
    set({ saving: true });
    try {
      await saveToSheets({ rows: get().rows });
      set({ dirty: false });
    } finally {
      set({ saving: false });
    }
  },
}));
