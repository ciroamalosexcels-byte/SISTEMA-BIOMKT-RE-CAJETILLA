import { create } from "zustand";
import { DEFAULT_PIPELINE_STAGES } from "@/types/pipeline";
import type { PipelineStage } from "@/types/pipeline";

const STORAGE_KEY = "ventas_biomarketing_pipeline_stages_v2";

interface PipelineStore {
  stages: PipelineStage[];
  load: () => void;
  addStage: (label: string, color?: string) => void;
  updateStage: (id: string, patch: Partial<Omit<PipelineStage, "id">>) => void;
  removeStage: (id: string) => void;
  reorderStages: (stages: PipelineStage[]) => void;
}

function persist(stages: PipelineStage[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stages)); } catch {}
}

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  stages: DEFAULT_PIPELINE_STAGES,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PipelineStage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ stages: [...parsed].sort((a, b) => a.order - b.order) });
          return;
        }
      }
    } catch {}
    set({ stages: DEFAULT_PIPELINE_STAGES });
  },

  addStage(label, color = "#94a3b8") {
    const { stages } = get();
    const newStage: PipelineStage = {
      id: `stage_${Date.now()}`,
      label,
      color,
      order: stages.length,
    };
    const updated = [...stages, newStage];
    set({ stages: updated });
    persist(updated);
  },

  updateStage(id, patch) {
    const updated = get().stages.map(s => s.id === id ? { ...s, ...patch } : s);
    set({ stages: updated });
    persist(updated);
  },

  removeStage(id) {
    const updated = get().stages
      .filter(s => s.id !== id)
      .map((s, i) => ({ ...s, order: i }));
    set({ stages: updated });
    persist(updated);
  },

  reorderStages(stages) {
    const reindexed = stages.map((s, i) => ({ ...s, order: i }));
    set({ stages: reindexed });
    persist(reindexed);
  },
}));
