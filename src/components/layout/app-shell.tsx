"use client";

import { useEffect, useRef, useState } from "react";
import { Sidebar } from "./sidebar";
import { useAppSettings } from "@/store/app-settings";
import { useLeadsStore, deduplicateLeads } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { useContentEventsStore } from "@/store/content-events";
import { useColumnWidthsStore } from "@/store/column-widths";
import { usePlansStore } from "@/store/plans";
import { usePipelineStore } from "@/store/pipeline";
import { fetchFromSheets, saveToSheets } from "@/lib/sheets";
import { loadLeadsFromSupabase, loadTeamFromSupabase } from "@/lib/supabase/loaders";
import { storage } from "@/lib/storage";
import { normalizeISODate } from "@/lib/dates";
import { todayBA } from "@/lib/dates";
import type { WorkspaceMode } from "@/lib/constants";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const loadSettings = useAppSettings((s) => s.load);
  const settings = useAppSettings((s) => s.settings);
  const updateSettings = useAppSettings((s) => s.update);
  const toasts = useAppSettings((s) => s.toasts);
  const dismissToast = useAppSettings((s) => s.dismissToast);
  const addNotification = useAppSettings((s) => s.addNotification);

  const { load: loadLeads } = useLeadsStore();
  const loadTeam = useTeamStore((s) => s.load);
  const loadEvents = useContentEventsStore((s) => s.load);
  const loadColumnWidths = useColumnWidthsStore((s) => s.load);
  const loadPlans   = usePlansStore((s) => s.load);
  const loadPipeline = usePipelineStore((s) => s.load);

  useEffect(() => {
    loadSettings();
    loadLeads();
    loadTeam();
    loadEvents();
    loadColumnWidths();
    loadPlans();
    loadPipeline();

    // Supabase: fuente primaria para leads + team (cuando hay datos sincronizados)
    Promise.all([loadLeadsFromSupabase(), loadTeamFromSupabase()])
      .then(([supaLeads, supaTeam]) => {
        if (supaLeads.length > 0) {
          useLeadsStore.setState({ rows: deduplicateLeads(supaLeads), dirty: false });
          storage.setLeads(supaLeads);
        }
        if (supaTeam.length > 0) {
          useTeamStore.setState({ members: supaTeam });
          storage.setTeam(supaTeam);
        }
      })
      .catch(() => {
        // Supabase no configurado o sin datos — no rompe nada, localStorage ya está cargado
      });

    // AppScript: fuente para content events, plans, columnWidths y leads/team como fallback
    fetchFromSheets()
      .then((data) => applyFetchedData(data, false))
      .catch((err) => { console.error("[Sheets] fetch inicial fallido, usando caché local:", err); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyFetchedData(data: Awaited<ReturnType<typeof fetchFromSheets>>, notify = false): Promise<boolean> {
    let loaded = false;
    // leads y team vienen de Supabase — AppScript solo aporta content/plans/widths
    if (Array.isArray(data.contentEvents)) {
      useContentEventsStore.setState({ contentEvents: data.contentEvents, dirty: false });
      storage.setContentEvents(data.contentEvents);
      if (data.contentEvents.length > 0) loaded = true;
    }
    if (Array.isArray(data.managementEvents)) {
      useContentEventsStore.setState({ managementEvents: data.managementEvents, dirty: false });
      storage.setManagementEvents(data.managementEvents);
    }
    if (Array.isArray(data.plans)) {
      usePlansStore.setState({ plans: data.plans, dirty: false });
      storage.setPlans(data.plans);
      if (data.plans.length > 0) loaded = true;
    }
    if (Array.isArray(data.planEvents)) {
      usePlansStore.setState({ planEvents: data.planEvents, dirty: false });
      storage.setPlanEvents(data.planEvents);
    }
    if (data.columnWidths) {
      useColumnWidthsStore.getState().setWidthsFromSheets(data.columnWidths);
    }
    if (Array.isArray(data.procedimientos) && data.procedimientos.length > 0) {
      try {
        const procs = data.procedimientos.map((row) => ({
          id: String(row.id || Date.now().toString(36)),
          name: String(row.title || row.titulo || "Sin nombre"),
          steps: Array.isArray(row.steps) ? row.steps : [],
        }));
        localStorage.setItem("biomarketing_procedures_v3", JSON.stringify(procs));
        loaded = true;
      } catch {}
    }
    if (notify && loaded) addNotification("Contenido sincronizado desde Sheets");
    return loaded;
  }

  /* ─── Ctrl+Z / Ctrl+Y global undo/redo ───────────────────────── */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? "";
      const isEditable = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (isEditable) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useLeadsStore.getState().undo();
      } else if (e.key === "y") {
        e.preventDefault();
        useLeadsStore.getState().redo();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  /* ─── Auto-sync every 5 minutes (silent) ──────────────────────── */
  useEffect(() => {
    const id = setInterval(() => {
      // Supabase primero (leads + team), AppScript para el resto
      Promise.all([loadLeadsFromSupabase(), loadTeamFromSupabase()])
        .then(([supaLeads, supaTeam]) => {
          if (supaLeads.length > 0) {
            useLeadsStore.setState({ rows: deduplicateLeads(supaLeads), dirty: false });
            storage.setLeads(supaLeads);
          }
          if (supaTeam.length > 0) {
            useTeamStore.setState({ members: supaTeam });
            storage.setTeam(supaTeam);
          }
        })
        .catch(() => {});
      fetchFromSheets()
        .then((data) => applyFetchedData(data, false))
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="flex h-screen overflow-hidden bg-bio-bg dark:bg-[#060e1c]"
      style={{ zoom: settings.systemScale }}
    >
      <Sidebar />
      <div className="flex-1 overflow-y-auto flex flex-col min-w-0 bg-bio-bg dark:bg-[#060e1c] [scrollbar-width:thin]">
        {children}
      </div>
      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className="toast-card" onClick={() => dismissToast(t.id)}>
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
