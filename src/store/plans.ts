import { create } from "zustand";
import { storage } from "@/lib/storage";
import type { Plan, PlanEvent } from "@/types";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

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
    return plan;
  },

  updatePlan(id, patch) {
    set((s) => ({ plans: s.plans.map((p) => p.id === id ? { ...p, ...patch } : p), dirty: true }));
    storage.setPlans(get().plans);
  },

  deletePlan(id) {
    set((s) => ({
      plans: s.plans.filter((p) => p.id !== id),
      planEvents: s.planEvents.filter((e) => e.planId !== id),
      dirty: true,
    }));
    storage.setPlans(get().plans);
    storage.setPlanEvents(get().planEvents);
  },

  addPlanEvent(event) {
    const existing = get().planEvents.filter((e) => e.planId === event.planId);
    const newEvent: PlanEvent = { ...event, id: uid(), order: existing.length };
    set((s) => ({ planEvents: [...s.planEvents, newEvent], dirty: true }));
    storage.setPlanEvents(get().planEvents);
  },

  updatePlanEvent(id, patch) {
    set((s) => ({ planEvents: s.planEvents.map((e) => e.id === id ? { ...e, ...patch } : e), dirty: true }));
    storage.setPlanEvents(get().planEvents);
  },

  deletePlanEvent(id) {
    set((s) => ({ planEvents: s.planEvents.filter((e) => e.id !== id), dirty: true }));
    storage.setPlanEvents(get().planEvents);
  },
}));
