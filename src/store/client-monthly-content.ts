import { create } from "zustand";
import { storage } from "@/lib/storage";
import type { ClientMonthlyContent, ClientMonthlyContentInput } from "@/types";

interface ClientMonthlyContentStore {
  records: ClientMonthlyContent[];
  load: () => void;
  upsert: (
    clientId: string,
    month: string,
    patch: Omit<ClientMonthlyContentInput, "clientId" | "month">,
  ) => Promise<void>;
}

async function request<T>(path: string, method: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "No se pudo guardar el historial de contenidos");
  }
  return data as T;
}

export const useClientMonthlyContentStore = create<ClientMonthlyContentStore>((set, get) => ({
  records: [],

  load() {
    set({ records: storage.getClientMonthlyContent() });
  },

  async upsert(clientId, month, patch) {
    const previous = get().records;
    const existing = previous.find((r) => r.clientId === clientId && r.month === month);
    const optimistic: ClientMonthlyContent = {
      id: existing?.id ?? `pending-${clientId}-${month}`,
      clientId,
      month,
      ...patch,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const optimisticRecords = existing
      ? previous.map((r) => (r.clientId === clientId && r.month === month ? optimistic : r))
      : [...previous, optimistic];
    set({ records: optimisticRecords });
    storage.setClientMonthlyContent(optimisticRecords);

    try {
      const saved = await request<ClientMonthlyContent>("/api/supabase/client-monthly-content", "POST", {
        clientId, month, ...patch,
      });
      if (!existing) {
        set((s) => ({
          records: s.records.map((r) =>
            (r.clientId === clientId && r.month === month) ? { ...r, id: saved.id, createdAt: saved.createdAt } : r
          ),
        }));
        storage.setClientMonthlyContent(get().records);
      }
    } catch (error) {
      console.error("[client-monthly-content] No se pudo guardar:", error);
      set({ records: previous });
      storage.setClientMonthlyContent(previous);
    }
  },
}));
