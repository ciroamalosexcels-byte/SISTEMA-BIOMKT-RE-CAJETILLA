import { create } from "zustand";
import { storage } from "@/lib/storage";
import { saveToSheets } from "@/lib/sheets";
import { DEFAULT_TEAM, DEFAULT_BADGE_REQUIREMENTS, STATUS91_ITEMS } from "@/lib/constants";
import type { TeamMember, BadgeKey } from "@/types";

interface TeamStore {
  members: TeamMember[];
  dirty: boolean;
  load: () => void;
  addMember: (nombre: string) => void;
  updateMember: (id: string, patch: Partial<TeamMember>) => void;
  deleteMember: (id: string) => void;
  awardBadge: (id: string, badge: BadgeKey) => void;
  revokeBadge: (id: string, badge: BadgeKey) => void;
  save: () => Promise<void>;
}

function makeMember(nombre: string): TeamMember {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nombre,
    status91: Object.fromEntries(STATUS91_ITEMS.map((k) => [k, ""])),
    badges: [],
    monthlyPoints: [],
  };
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  members: [],
  dirty: false,

  load() {
    let members = storage.getTeam();
    if (members.length === 0) {
      members = DEFAULT_TEAM.map(makeMember);
      storage.setTeam(members);
    }
    set({ members });
  },

  addMember(nombre) {
    const member = makeMember(nombre);
    set((s) => ({ members: [...s.members, member], dirty: true }));
    storage.setTeam(get().members);
  },

  updateMember(id, patch) {
    set((s) => ({
      members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      dirty: true,
    }));
    storage.setTeam(get().members);

    // Persistir en Supabase los campos que se pierden al recargar
    if (patch.status91) {
      fetch(`/api/supabase/team/${id}/status91`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch.status91),
      }).catch(() => {});
    }
    if (patch.monthlyPoints) {
      fetch(`/api/supabase/team/${id}/points`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch.monthlyPoints),
      }).catch(() => {});
    }
  },

  deleteMember(id) {
    set((s) => ({ members: s.members.filter((m) => m.id !== id), dirty: true }));
    storage.setTeam(get().members);
  },

  awardBadge(id, badge) {
    set((s) => ({
      members: s.members.map((m) =>
        m.id === id && !m.badges.includes(badge)
          ? { ...m, badges: [...m.badges, badge] }
          : m
      ),
      dirty: true,
    }));
    storage.setTeam(get().members);
  },

  revokeBadge(id, badge) {
    set((s) => ({
      members: s.members.map((m) =>
        m.id === id ? { ...m, badges: m.badges.filter((b) => b !== badge) } : m
      ),
      dirty: true,
    }));
    storage.setTeam(get().members);
  },

  async save() {
    await saveToSheets({ action: "saveTeam", team: get().members });
    set({ dirty: false });
  },
}));

// Auto-badge logic: call this after recalculating closings per member
export function checkBadgeRequirements(
  closings: number,
  requirements: typeof DEFAULT_BADGE_REQUIREMENTS
): BadgeKey[] {
  const earned: BadgeKey[] = [];
  if (closings >= requirements.wood) earned.push("wood");
  if (closings >= requirements.bronze) earned.push("bronze");
  if (closings >= requirements.silver) earned.push("silver");
  if (closings >= requirements.gold) earned.push("gold");
  return earned;
}
