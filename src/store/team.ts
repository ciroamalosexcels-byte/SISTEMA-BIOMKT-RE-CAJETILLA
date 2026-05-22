import { create } from "zustand";
import { storage } from "@/lib/storage";
import { saveToSheets } from "@/lib/sheets";
import { DEFAULT_TEAM, DEFAULT_BADGE_REQUIREMENTS } from "@/lib/constants";
import type { TeamMember, BadgeKey } from "@/types";

interface TeamStore {
  members: TeamMember[];
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
    status91: { ventas: "", atencion: "", equipo: "", puntualidad: "" },
    badges: [],
  };
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  members: [],

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
    set((s) => ({ members: [...s.members, member] }));
    storage.setTeam(get().members);
  },

  updateMember(id, patch) {
    set((s) => ({
      members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
    storage.setTeam(get().members);
  },

  deleteMember(id) {
    set((s) => ({ members: s.members.filter((m) => m.id !== id) }));
    storage.setTeam(get().members);
  },

  awardBadge(id, badge) {
    set((s) => ({
      members: s.members.map((m) =>
        m.id === id && !m.badges.includes(badge)
          ? { ...m, badges: [...m.badges, badge] }
          : m
      ),
    }));
    storage.setTeam(get().members);
  },

  revokeBadge(id, badge) {
    set((s) => ({
      members: s.members.map((m) =>
        m.id === id ? { ...m, badges: m.badges.filter((b) => b !== badge) } : m
      ),
    }));
    storage.setTeam(get().members);
  },

  async save() {
    await saveToSheets({ team: get().members });
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
