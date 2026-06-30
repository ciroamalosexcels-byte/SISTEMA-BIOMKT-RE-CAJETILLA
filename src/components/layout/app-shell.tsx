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
// import { fetchFromSheets, saveToSheets } from "@/lib/sheets"; // Sheets comentado
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

  const loadLeads = useLeadsStore((s) => s.load);
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

    // Supabase: fuente primaria para todos los datos
    Promise.all([
      loadLeadsFromSupabase(),
      loadTeamFromSupabase(),
      fetch("/api/supabase/content-events").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/supabase/management-events").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/supabase/plans").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/supabase/plan-events").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/supabase/pipeline").then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([supaLeads, supaTeam, contentEvts, mgmtEvts, plans, planEvts, pipeline]) => {
        if (supaLeads.length > 0) {
          useLeadsStore.setState({ rows: deduplicateLeads(supaLeads), dirty: false });
          storage.setLeads(supaLeads);
        }
        if (supaTeam.length > 0) {
          useTeamStore.setState({ members: supaTeam });
          storage.setTeam(supaTeam);
        }
        if (contentEvts.length > 0 || mgmtEvts.length > 0) {
          useContentEventsStore.setState({ contentEvents: contentEvts, managementEvents: mgmtEvts, dirty: false });
          storage.setContentEvents(contentEvts);
          storage.setManagementEvents(mgmtEvts);
        }
        if (plans.length > 0 || planEvts.length > 0) {
          usePlansStore.setState({ plans, planEvents: planEvts, dirty: false });
          storage.setPlans(plans);
          storage.setPlanEvents(planEvts);
        }
        if (pipeline.length > 0) {
          usePipelineStore.setState({ stages: pipeline });
          try { localStorage.setItem("ventas_biomarketing_pipeline_stages_v2", JSON.stringify(pipeline)); } catch {}
        }
      })
      .catch(() => {});

    // AppScript comentado — persistencia via Supabase directo
    // fetchFromSheets()
    //   .then((data) => applyFetchedData(data, false))
    //   .catch((err) => { console.error("[Sheets] fetch inicial fallido:", err); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // applyFetchedData comentado — ya no se usa Sheets como fuente de datos
  // async function applyFetchedData(...) { ... }

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

  /* ─── Auto-refresh desde Supabase cada 5 minutos (silent) ────── */
  useEffect(() => {
    const id = setInterval(() => {
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
      // Sheets comentado — ya no se usa como fuente de datos
      // fetchFromSheets().then((data) => applyFetchedData(data, false)).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="flex h-dvh min-h-0 overflow-hidden bg-bio-bg dark:bg-[#060e1c]"
      style={{ zoom: settings.systemScale }}
    >
      <Sidebar />
      <div className="flex-1 h-full min-h-0 overflow-y-auto overscroll-contain flex flex-col min-w-0 bg-bio-bg dark:bg-[#060e1c] [scrollbar-width:thin]">
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
