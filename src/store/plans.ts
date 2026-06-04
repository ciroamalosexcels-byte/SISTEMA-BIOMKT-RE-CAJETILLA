import { create } from "zustand";
import { storage } from "@/lib/storage";
import type { Plan, PlanEvent } from "@/types";

function uid() { return crypto.randomUUID(); }

interface PlansStore {
  plans: Plan[];
  planEvents: PlanEvent[];
  dirty: boolean;
  load: () => void;
  addPlan: (nombre: string, descripcion?: string) => Plan;
  updatePlan: (id: string, patch: Partial<Plan>) => void;
  deletePlan: (id: string) => void;
  addPlanEvent: (event: Omit<PlanEvent, "id" | "order">) => void;
  updatePlanEvent: (id: string, patch: Partial<PlanEvent>) => void;
  deletePlanEvent: (id: string) => void;
}

function supabase(path: string, method: string, body: unknown) {
  fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then(r => r.ok ? null : r.json().then(e => console.error(`[plans] ${path} error:`, e)))
    .catch(e => console.error(`[plans] ${path} fetch error:`, e));
}

export const usePlansStore = create<PlansStore>((set, get) => ({
  plans: [],
  planEvents: [],
  dirty: false,

  load() {
    set({ plans: storage.getPlans(), planEvents: storage.getPlanEvents(), dirty: false });
  },

  addPlan(nombre, descripcion) {
    const plan: Plan = { id: uid(), nombre, descripcion, createdAt: new Date().toISOString() };
    set((s) => ({ plans: [...s.plans, plan], dirty: true }));
    storage.setPlans(get().plans);
    supabase("/api/supabase/plans", "POST", plan);
    return plan;
  },

  updatePlan(id, patch) {
    set((s) => ({ plans: s.plans.map((p) => p.id === id ? { ...p, ...patch } : p), dirty: true }));
    storage.setPlans(get().plans);
    const updated = get().plans.find(p => p.id === id);
    if (updated) supabase(`/api/supabase/plans/${id}`, "PATCH", updated);
  },

  deletePlan(id) {
    set((s) => ({ plans: s.plans.filter((p) => p.id !== id), planEvents: s.planEvents.filter((e) => e.planId !== id), dirty: true }));
    storage.setPlans(get().plans);
    storage.setPlanEvents(get().planEvents);
    supabase(`/api/supabase/plans/${id}`, "DELETE", {});
  },

  addPlanEvent(event) {
    const existing = get().planEvents.filter((e) => e.planId === event.planId);
    const newEvent: PlanEvent = { ...event, id: uid(), order: existing.length };
    set((s) => ({ planEvents: [...s.planEvents, newEvent], dirty: true }));
    storage.setPlanEvents(get().planEvents);
    supabase("/api/supabase/plan-events", "POST", newEvent);
  },

  updatePlanEvent(id, patch) {
    set((s) => ({ planEvents: s.planEvents.map((e) => e.id === id ? { ...e, ...patch } : e), dirty: true }));
    storage.setPlanEvents(get().planEvents);
    const updated = get().planEvents.find(e => e.id === id);
    if (updated) supabase(`/api/supabase/plan-events/${id}`, "PATCH", updated);
  },

  deletePlanEvent(id) {
    set((s) => ({ planEvents: s.planEvents.filter((e) => e.id !== id), dirty: true }));
    storage.setPlanEvents(get().planEvents);
    supabase(`/api/supabase/plan-events/${id}`, "DELETE", {});
  },
}));
