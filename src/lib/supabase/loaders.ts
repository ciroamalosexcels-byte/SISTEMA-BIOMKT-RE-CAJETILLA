"use client";

import type { Lead, TeamMember } from "@/types";
import { adaptLead, adaptTeamMember } from "./adapters";

// ─── Public loaders — usan API routes server-side para evitar problemas de cookies ──

export async function loadLeadsFromSupabase(): Promise<Lead[]> {
  try {
    const res = await fetch("/api/supabase/leads", { cache: "no-store" });
    if (!res.ok) return [];
    return res.json() as Promise<Lead[]>;
  } catch {
    return [];
  }
}

export async function loadTeamFromSupabase(): Promise<TeamMember[]> {
  try {
    const res = await fetch("/api/supabase/team", { cache: "no-store" });
    if (!res.ok) return [];
    return res.json() as Promise<TeamMember[]>;
  } catch {
    return [];
  }
}
