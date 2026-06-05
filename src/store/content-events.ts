import { create } from "zustand";
import { storage } from "@/lib/storage";
import type { ContentEvent, ManagementEvent } from "@/types";

interface ContentEventsStore {
  contentEvents: ContentEvent[];
  managementEvents: ManagementEvent[];
  dirty: boolean;
  load: () => void;
  addContentEvent: (event: Omit<ContentEvent, "id" | "order">) => void;
  updateContentEvent: (id: string, patch: Partial<ContentEvent>) => void;
  deleteContentEvent: (id: string) => void;
  reorderContentEvents: (clientId: string, orderedIds: string[]) => void;
  toggleContentDone: (id: string) => void;
  addManagementEvent: (event: Omit<ManagementEvent, "id">) => void;
  updateManagementEvent: (id: string, patch: Partial<ManagementEvent>) => void;
  deleteManagementEvent: (id: string) => void;
  toggleManagementDone: (id: string) => void;
}

function uid() { return crypto.randomUUID(); }

function supabase(path: string, method: string, body: unknown) {
  fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then(r => {
      if (r.ok) return null;
      return r.text().then(text => {
        try { console.error(`[events] ${path} (${r.status}):`, JSON.parse(text)); }
        catch { console.error(`[events] ${path} (${r.status}): non-JSON:`, text); }
      });
    })
    .catch(e => console.error(`[events] ${path} fetch error:`, e));
}

export const useContentEventsStore = create<ContentEventsStore>((set, get) => ({
  contentEvents: [],
  managementEvents: [],
  dirty: false,

  load() {
    set({ contentEvents: storage.getContentEvents(), managementEvents: storage.getManagementEvents(), dirty: false });
  },

  addContentEvent(event) {
    const newEvent: ContentEvent = { ...event, id: uid(), order: get().contentEvents.filter(e => e.clientId === event.clientId).length };
    set((s) => ({ contentEvents: [...s.contentEvents, newEvent], dirty: true }));
    storage.setContentEvents(get().contentEvents);
    supabase("/api/supabase/content-events", "POST", newEvent);
  },

  updateContentEvent(id, patch) {
    set((s) => ({ contentEvents: s.contentEvents.map((e) => e.id === id ? { ...e, ...patch } : e), dirty: true }));
    storage.setContentEvents(get().contentEvents);
    const updated = get().contentEvents.find(e => e.id === id);
    if (updated) supabase(`/api/supabase/content-events/${id}`, "PATCH", updated);
  },

  deleteContentEvent(id) {
    set((s) => ({ contentEvents: s.contentEvents.filter((e) => e.id !== id), dirty: true }));
    storage.setContentEvents(get().contentEvents);
    supabase(`/api/supabase/content-events/${id}`, "DELETE", {});
  },

  reorderContentEvents(clientId, orderedIds) {
    set((s) => ({
      contentEvents: s.contentEvents.map((e) => {
        if (e.clientId !== clientId) return e;
        const idx = orderedIds.indexOf(e.id);
        return idx !== -1 ? { ...e, order: idx } : e;
      }),
      dirty: true,
    }));
    storage.setContentEvents(get().contentEvents);
    // Guardar cada evento reordenado
    get().contentEvents.filter(e => e.clientId === clientId).forEach(e =>
      supabase(`/api/supabase/content-events/${e.id}`, "PATCH", e)
    );
  },

  toggleContentDone(id) {
    set((s) => ({ contentEvents: s.contentEvents.map((e) => e.id === id ? { ...e, done: !e.done } : e), dirty: true }));
    storage.setContentEvents(get().contentEvents);
    const updated = get().contentEvents.find(e => e.id === id);
    if (updated) supabase(`/api/supabase/content-events/${id}`, "PATCH", updated);
  },

  addManagementEvent(event) {
    const newEvent: ManagementEvent = { ...event, id: uid() };
    set((s) => ({ managementEvents: [...s.managementEvents, newEvent], dirty: true }));
    storage.setManagementEvents(get().managementEvents);
    supabase("/api/supabase/management-events", "POST", newEvent);
  },

  updateManagementEvent(id, patch) {
    set((s) => ({ managementEvents: s.managementEvents.map((e) => e.id === id ? { ...e, ...patch } : e), dirty: true }));
    storage.setManagementEvents(get().managementEvents);
    const updated = get().managementEvents.find(e => e.id === id);
    if (updated) supabase(`/api/supabase/management-events/${id}`, "PATCH", updated);
  },

  deleteManagementEvent(id) {
    set((s) => ({ managementEvents: s.managementEvents.filter((e) => e.id !== id), dirty: true }));
    storage.setManagementEvents(get().managementEvents);
    supabase(`/api/supabase/management-events/${id}`, "DELETE", {});
  },

  toggleManagementDone(id) {
    set((s) => ({ managementEvents: s.managementEvents.map((e) => e.id === id ? { ...e, done: !e.done } : e), dirty: true }));
    storage.setManagementEvents(get().managementEvents);
    const updated = get().managementEvents.find(e => e.id === id);
    if (updated) supabase(`/api/supabase/management-events/${id}`, "PATCH", updated);
  },
}));
