import { create } from "zustand";
import { storage } from "@/lib/storage";
// import { saveToSheets } from "@/lib/sheets"; // Sheets comentado — persistencia via Supabase
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
    id: crypto.randomUUID(),
    nombre,
    status91: Object.fromEntries(STATUS91_ITEMS.map((k) => [k, ""])),
    badges: [],
    monthlyPoints: [],
  };
}

function supabase(path: string, method: string, body: unknown) {
  fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then(r => r.ok ? null : r.json().then(e => console.error(`[team] ${path} error:`, e)))
    .catch(e => console.error(`[team] ${path} fetch error:`, e));
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
    supabase("/api/supabase/team", "POST", member);
  },

  updateMember(id, patch) {
    set((s) => ({
      members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      dirty: true,
    }));
    storage.setTeam(get().members);

    // Campos básicos
    if (Object.keys(patch).some(k => !["status91", "monthlyPoints", "badges"].includes(k))) {
      const updated = get().members.find(m => m.id === id);
      if (updated) supabase(`/api/supabase/team/${id}`, "PATCH", updated);
    }
    // Badges
    if (patch.badges) {
      const updated = get().members.find(m => m.id === id);
      if (updated) supabase(`/api/supabase/team/${id}`, "PATCH", updated);
    }
    // Status91
    if (patch.status91) {
      supabase(`/api/supabase/team/${id}/status91`, "PATCH", patch.status91);
    }
    // Monthly points
    if (patch.monthlyPoints) {
      supabase(`/api/supabase/team/${id}/points`, "PATCH", patch.monthlyPoints);
    }
  },

  deleteMember(id) {
    set((s) => ({ members: s.members.filter((m) => m.id !== id), dirty: true }));
    storage.setTeam(get().members);
    supabase(`/api/supabase/team/${id}`, "DELETE", {});
  },

  awardBadge(id, badge) {
    set((s) => ({
      members: s.members.map((m) =>
        m.id === id && !m.badges.includes(badge) ? { ...m, badges: [...m.badges, badge] } : m
      ),
      dirty: true,
    }));
    storage.setTeam(get().members);
    const updated = get().members.find(m => m.id === id);
    if (updated) supabase(`/api/supabase/team/${id}`, "PATCH", updated);
  },

  revokeBadge(id, badge) {
    set((s) => ({
      members: s.members.map((m) =>
        m.id === id ? { ...m, badges: m.badges.filter((b) => b !== badge) } : m
      ),
      dirty: true,
    }));
    storage.setTeam(get().members);
    const updated = get().members.find(m => m.id === id);
    if (updated) supabase(`/api/supabase/team/${id}`, "PATCH", updated);
  },

  async save() {
    // Sheets comentado — los cambios ya se guardan en Supabase en tiempo real
    // await saveToSheets({ action: "saveTeam", team: get().members });
    set({ dirty: false });
  },
}));

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
