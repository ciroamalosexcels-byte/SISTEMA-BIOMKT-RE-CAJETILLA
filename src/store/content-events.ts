import { create } from "zustand";
import { storage } from "@/lib/storage";
import type { ContentEvent, ManagementEvent } from "@/types";

interface ContentEventsStore {
  contentEvents: ContentEvent[];
  managementEvents: ManagementEvent[];
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

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useContentEventsStore = create<ContentEventsStore>((set, get) => ({
  contentEvents: [],
  managementEvents: [],

  load() {
    set({
      contentEvents: storage.getContentEvents(),
      managementEvents: storage.getManagementEvents(),
    });
  },

  addContentEvent(event) {
    const clientEvents = get().contentEvents.filter(
      (e) => e.clientId === event.clientId
    );
    const newEvent: ContentEvent = {
      ...event,
      id: uid(),
      order: clientEvents.length,
    };
    set((s) => ({ contentEvents: [...s.contentEvents, newEvent] }));
    storage.setContentEvents(get().contentEvents);
  },

  updateContentEvent(id, patch) {
    set((s) => ({
      contentEvents: s.contentEvents.map((e) =>
        e.id === id ? { ...e, ...patch } : e
      ),
    }));
    storage.setContentEvents(get().contentEvents);
  },

  deleteContentEvent(id) {
    set((s) => ({ contentEvents: s.contentEvents.filter((e) => e.id !== id) }));
    storage.setContentEvents(get().contentEvents);
  },

  reorderContentEvents(clientId, orderedIds) {
    set((s) => ({
      contentEvents: s.contentEvents.map((e) => {
        if (e.clientId !== clientId) return e;
        const idx = orderedIds.indexOf(e.id);
        return idx !== -1 ? { ...e, order: idx } : e;
      }),
    }));
    storage.setContentEvents(get().contentEvents);
  },

  toggleContentDone(id) {
    set((s) => ({
      contentEvents: s.contentEvents.map((e) =>
        e.id === id ? { ...e, done: !e.done } : e
      ),
    }));
    storage.setContentEvents(get().contentEvents);
  },

  addManagementEvent(event) {
    const newEvent: ManagementEvent = { ...event, id: uid() };
    set((s) => ({ managementEvents: [...s.managementEvents, newEvent] }));
    storage.setManagementEvents(get().managementEvents);
  },

  updateManagementEvent(id, patch) {
    set((s) => ({
      managementEvents: s.managementEvents.map((e) =>
        e.id === id ? { ...e, ...patch } : e
      ),
    }));
    storage.setManagementEvents(get().managementEvents);
  },

  deleteManagementEvent(id) {
    set((s) => ({ managementEvents: s.managementEvents.filter((e) => e.id !== id) }));
    storage.setManagementEvents(get().managementEvents);
  },

  toggleManagementDone(id) {
    set((s) => ({
      managementEvents: s.managementEvents.map((e) =>
        e.id === id ? { ...e, done: !e.done } : e
      ),
    }));
    storage.setManagementEvents(get().managementEvents);
  },
}));
