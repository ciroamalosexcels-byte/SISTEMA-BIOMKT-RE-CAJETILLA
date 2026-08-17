import { create } from "zustand";
import { storage } from "@/lib/storage";
import type { BulkEventSeries, BulkEventSeriesInput, ContentEvent, ManagementEvent, ProgressMode } from "@/types";

interface ContentEventsStore {
  contentEvents: ContentEvent[];
  managementEvents: ManagementEvent[];
  bulkEventSeries: BulkEventSeries[];
  bulkEventSeriesVersion: number;
  eventDataVersion: number;
  progressMode: ProgressMode;
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
  createBulkEventSeries: (input: BulkEventSeriesInput) => Promise<void>;
  updateBulkEventSeries: (id: string, input: BulkEventSeriesInput) => Promise<void>;
  deleteBulkEventSeries: (id: string) => Promise<void>;
  setProgressMode: (mode: ProgressMode) => Promise<void>;
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

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "No se pudo guardar el evento masivo");
  }
  return data as T;
}

async function refreshEventsFromSupabase() {
  const eventVersion = useContentEventsStore.getState().eventDataVersion;
  const [contentResponse, managementResponse] = await Promise.all([
    fetch("/api/supabase/content-events"),
    fetch("/api/supabase/management-events"),
  ]);
  if (!contentResponse.ok || !managementResponse.ok) {
    throw new Error("El evento se guardó, pero no se pudieron actualizar los calendarios");
  }
  const [contentEvents, managementEvents] = await Promise.all([
    contentResponse.json() as Promise<ContentEvent[]>,
    managementResponse.json() as Promise<ManagementEvent[]>,
  ]);
  if (useContentEventsStore.getState().eventDataVersion !== eventVersion) return;
  useContentEventsStore.setState((state) => ({
    contentEvents,
    managementEvents,
    dirty: false,
    eventDataVersion: state.eventDataVersion + 1,
  }));
  storage.setContentEvents(contentEvents);
  storage.setManagementEvents(managementEvents);
}

async function refreshEventsAfterBulkChange() {
  try {
    await refreshEventsFromSupabase();
  } catch (error) {
    console.error("[bulk-events] No se pudo refrescar el calendario:", error);
  }
}

export const useContentEventsStore = create<ContentEventsStore>((set, get) => ({
  contentEvents: [],
  managementEvents: [],
  bulkEventSeries: [],
  bulkEventSeriesVersion: 0,
  eventDataVersion: 0,
  progressMode: "estado",
  dirty: false,

  load() {
    set({
      contentEvents: storage.getContentEvents(),
      managementEvents: storage.getManagementEvents(),
      bulkEventSeries: storage.getBulkEventSeries(),
      progressMode: storage.getProgressMode(),
      dirty: false,
    });
  },

  addContentEvent(event) {
    const newEvent: ContentEvent = { ...event, id: uid(), order: get().contentEvents.filter(e => e.clientId === event.clientId).length };
    set((s) => ({ contentEvents: [...s.contentEvents, newEvent], dirty: true, eventDataVersion: s.eventDataVersion + 1 }));
    storage.setContentEvents(get().contentEvents);
    supabase("/api/supabase/content-events", "POST", newEvent);
  },

  updateContentEvent(id, patch) {
    set((s) => ({ contentEvents: s.contentEvents.map((e) => e.id === id ? { ...e, ...patch } : e), dirty: true, eventDataVersion: s.eventDataVersion + 1 }));
    storage.setContentEvents(get().contentEvents);
    const updated = get().contentEvents.find(e => e.id === id);
    if (updated) supabase(`/api/supabase/content-events/${id}`, "PATCH", updated);
  },

  deleteContentEvent(id) {
    set((s) => ({ contentEvents: s.contentEvents.filter((e) => e.id !== id), dirty: true, eventDataVersion: s.eventDataVersion + 1 }));
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
      eventDataVersion: s.eventDataVersion + 1,
    }));
    storage.setContentEvents(get().contentEvents);
    // Guardar cada evento reordenado
    get().contentEvents.filter(e => e.clientId === clientId).forEach(e =>
      supabase(`/api/supabase/content-events/${e.id}`, "PATCH", e)
    );
  },

  toggleContentDone(id) {
    set((s) => ({ contentEvents: s.contentEvents.map((e) => e.id === id ? { ...e, done: !e.done } : e), dirty: true, eventDataVersion: s.eventDataVersion + 1 }));
    storage.setContentEvents(get().contentEvents);
    const updated = get().contentEvents.find(e => e.id === id);
    if (updated) supabase(`/api/supabase/content-events/${id}`, "PATCH", updated);
  },

  addManagementEvent(event) {
    const newEvent: ManagementEvent = { ...event, id: uid() };
    set((s) => ({ managementEvents: [...s.managementEvents, newEvent], dirty: true, eventDataVersion: s.eventDataVersion + 1 }));
    storage.setManagementEvents(get().managementEvents);
    supabase("/api/supabase/management-events", "POST", newEvent);
  },

  updateManagementEvent(id, patch) {
    set((s) => ({ managementEvents: s.managementEvents.map((e) => e.id === id ? { ...e, ...patch } : e), dirty: true, eventDataVersion: s.eventDataVersion + 1 }));
    storage.setManagementEvents(get().managementEvents);
    const updated = get().managementEvents.find(e => e.id === id);
    if (updated) supabase(`/api/supabase/management-events/${id}`, "PATCH", updated);
  },

  deleteManagementEvent(id) {
    set((s) => ({ managementEvents: s.managementEvents.filter((e) => e.id !== id), dirty: true, eventDataVersion: s.eventDataVersion + 1 }));
    storage.setManagementEvents(get().managementEvents);
    supabase(`/api/supabase/management-events/${id}`, "DELETE", {});
  },

  toggleManagementDone(id) {
    set((s) => ({ managementEvents: s.managementEvents.map((e) => e.id === id ? { ...e, done: !e.done } : e), dirty: true, eventDataVersion: s.eventDataVersion + 1 }));
    storage.setManagementEvents(get().managementEvents);
    const updated = get().managementEvents.find(e => e.id === id);
    if (updated) supabase(`/api/supabase/management-events/${id}`, "PATCH", updated);
  },

  async createBulkEventSeries(input) {
    set((s) => ({ bulkEventSeriesVersion: s.bulkEventSeriesVersion + 1 }));
    const { series } = await request<{ series: BulkEventSeries }>("/api/supabase/bulk-event-series", "POST", input);
    set((s) => ({ bulkEventSeries: [...s.bulkEventSeries, series], bulkEventSeriesVersion: s.bulkEventSeriesVersion + 1 }));
    storage.setBulkEventSeries(get().bulkEventSeries);
    await refreshEventsAfterBulkChange();
  },

  async updateBulkEventSeries(id, input) {
    set((s) => ({ bulkEventSeriesVersion: s.bulkEventSeriesVersion + 1 }));
    const { series } = await request<{ series: BulkEventSeries }>(`/api/supabase/bulk-event-series/${id}`, "PATCH", input);
    set((s) => ({
      bulkEventSeries: s.bulkEventSeries.map((item) => item.id === id ? series : item),
      bulkEventSeriesVersion: s.bulkEventSeriesVersion + 1,
    }));
    storage.setBulkEventSeries(get().bulkEventSeries);
    await refreshEventsAfterBulkChange();
  },

  async deleteBulkEventSeries(id) {
    set((s) => ({ bulkEventSeriesVersion: s.bulkEventSeriesVersion + 1 }));
    await request<{ ok: true }>(`/api/supabase/bulk-event-series/${id}`, "DELETE");
    set((s) => ({
      bulkEventSeries: s.bulkEventSeries.filter((item) => item.id !== id),
      bulkEventSeriesVersion: s.bulkEventSeriesVersion + 1,
    }));
    storage.setBulkEventSeries(get().bulkEventSeries);
    await refreshEventsAfterBulkChange();
  },

  async setProgressMode(mode) {
    const previous = get().progressMode;
    set({ progressMode: mode });
    storage.setProgressMode(mode);
    try {
      await request<{ mode: ProgressMode }>("/api/supabase/progress-mode", "PATCH", { mode });
    } catch (error) {
      console.error("[progress-mode] No se pudo guardar:", error);
      set({ progressMode: previous });
      storage.setProgressMode(previous);
    }
  },
}));
