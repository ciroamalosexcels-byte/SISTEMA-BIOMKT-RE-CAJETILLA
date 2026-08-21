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
import { useClientMonthlyContentStore } from "@/store/client-monthly-content";
// import { fetchFromSheets, saveToSheets } from "@/lib/sheets"; // Sheets comentado
import { loadLeadsFromSupabase, loadTeamFromSupabase } from "@/lib/supabase/loaders";
import { storage } from "@/lib/storage";
import { normalizeISODate } from "@/lib/dates";
import { todayBA } from "@/lib/dates";
import { useRouter } from "next/navigation";
import { CARRUSEL_SECTIONS } from "@/lib/constants";
import type { WorkspaceMode } from "@/lib/constants";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const bulkRefreshMonthRef = useRef<string | null>(null);
  const loadSettings = useAppSettings((s) => s.load);
  const settings = useAppSettings((s) => s.settings);
  const updateSettings = useAppSettings((s) => s.update);
  const toasts = useAppSettings((s) => s.toasts);
  const dismissToast = useAppSettings((s) => s.dismissToast);
  const addNotification = useAppSettings((s) => s.addNotification);
  const carruselMode = useAppSettings((s) => s.settings.carruselMode);
  const router = useRouter();

  const loadLeads = useLeadsStore((s) => s.load);
  const loadTeam = useTeamStore((s) => s.load);
  const loadEvents = useContentEventsStore((s) => s.load);
  const loadColumnWidths = useColumnWidthsStore((s) => s.load);
  const loadPlans   = usePlansStore((s) => s.load);
  const loadPipeline = usePipelineStore((s) => s.load);
  const loadClientMonthlyContent = useClientMonthlyContentStore((s) => s.load);

  useEffect(() => {
    loadSettings();
    loadLeads();
    loadTeam();
    loadEvents();
    loadColumnWidths();
    loadPlans();
    loadPipeline();
    loadClientMonthlyContent();

    // Las series se cargan primero porque su GET materializa el horizonte mensual.
    const loadRemoteData = async () => {
      const bulkVersion = useContentEventsStore.getState().bulkEventSeriesVersion;
      const eventVersion = useContentEventsStore.getState().eventDataVersion;
      const leadsPromise = loadLeadsFromSupabase();
      const teamPromise = loadTeamFromSupabase();
      const bulkPayload = await fetch("/api/supabase/bulk-event-series")
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);
      const [supaLeads, supaTeam, contentEvts, mgmtEvts, plans, planEvts, pipeline, progressModePayload, clientMonthlyContent] = await Promise.all([
        leadsPromise,
        teamPromise,
        fetch("/api/supabase/content-events").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/supabase/management-events").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/supabase/plans").then(r => r.ok ? r.json() : []).catch(() => []),
        fetch("/api/supabase/plan-events").then(r => r.ok ? r.json() : []).catch(() => []),
        fetch("/api/supabase/pipeline").then(r => r.ok ? r.json() : []).catch(() => []),
        fetch("/api/supabase/progress-mode").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/supabase/client-monthly-content").then(r => r.ok ? r.json() : []).catch(() => []),
      ]);

      if (
        bulkPayload
        && Array.isArray(bulkPayload.series)
        && useContentEventsStore.getState().bulkEventSeriesVersion === bulkVersion
      ) {
        useContentEventsStore.setState({ bulkEventSeries: bulkPayload.series });
        storage.setBulkEventSeries(bulkPayload.series);
      }
      if (bulkPayload && Array.isArray(bulkPayload.series)) {
        bulkRefreshMonthRef.current = todayBA().slice(0, 7);
      }
      if (supaLeads.length > 0) {
        useLeadsStore.setState({ rows: deduplicateLeads(supaLeads), dirty: false });
        storage.setLeads(supaLeads);
      }
      if (supaTeam.length > 0) {
        useTeamStore.setState({ members: supaTeam });
        storage.setTeam(supaTeam);
      }
      if (
        Array.isArray(contentEvts)
        && Array.isArray(mgmtEvts)
        && useContentEventsStore.getState().eventDataVersion === eventVersion
      ) {
        useContentEventsStore.setState((state) => ({
          contentEvents: contentEvts,
          managementEvents: mgmtEvts,
          dirty: false,
          eventDataVersion: state.eventDataVersion + 1,
        }));
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
      if (progressModePayload?.mode) {
        useContentEventsStore.setState({ progressMode: progressModePayload.mode });
        storage.setProgressMode(progressModePayload.mode);
      }
      if (Array.isArray(clientMonthlyContent) && clientMonthlyContent.length > 0) {
        useClientMonthlyContentStore.setState({ records: clientMonthlyContent });
        storage.setClientMonthlyContent(clientMonthlyContent);
      }
    };
    loadRemoteData().catch(() => {});

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

  /* ─── Modo Carrusel: rotación automática entre secciones ─────── */
  useEffect(() => {
    if (!carruselMode.enabled) return;
    const activeSections = CARRUSEL_SECTIONS.filter((s) => carruselMode.sections.includes(s.key));
    if (activeSections.length === 0) return;

    let idx = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    const seconds = carruselMode.durationSeconds || 15;

    function goToCurrent() {
      router.push(activeSections[idx].href);
      timeoutId = setTimeout(advance, seconds * 1000);
    }

    function advance() {
      idx = (idx + 1) % activeSections.length;
      goToCurrent();
    }

    goToCurrent();

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carruselMode.enabled, carruselMode.sections, carruselMode.durationSeconds]);

  /* ─── Auto-refresh desde Supabase cada 5 minutos (silent) ────── */
  useEffect(() => {
    const id = setInterval(() => {
      const refresh = async () => {
        const bulkVersion = useContentEventsStore.getState().bulkEventSeriesVersion;
        const eventVersion = useContentEventsStore.getState().eventDataVersion;
        const month = todayBA().slice(0, 7);
        const shouldRefreshBulk = bulkRefreshMonthRef.current !== month;
        const [supaLeads, supaTeam, bulkPayload] = await Promise.all([
          loadLeadsFromSupabase(),
          loadTeamFromSupabase(),
          shouldRefreshBulk
            ? fetch("/api/supabase/bulk-event-series").then(r => r.ok ? r.json() : null).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (
          bulkPayload
          && Array.isArray(bulkPayload.series)
          && useContentEventsStore.getState().bulkEventSeriesVersion === bulkVersion
        ) {
          useContentEventsStore.setState({ bulkEventSeries: bulkPayload.series });
          storage.setBulkEventSeries(bulkPayload.series);
        }

        if (bulkPayload && Array.isArray(bulkPayload.series)) {
          bulkRefreshMonthRef.current = month;
          const [contentResponse, managementResponse] = await Promise.all([
            fetch("/api/supabase/content-events"),
            fetch("/api/supabase/management-events"),
          ]);
          if (
            contentResponse.ok
            && managementResponse.ok
          ) {
            const [contentEvents, managementEvents] = await Promise.all([
              contentResponse.json(),
              managementResponse.json(),
            ]);
            if (useContentEventsStore.getState().eventDataVersion === eventVersion) {
              useContentEventsStore.setState((state) => ({
                contentEvents,
                managementEvents,
                dirty: false,
                eventDataVersion: state.eventDataVersion + 1,
              }));
              storage.setContentEvents(contentEvents);
              storage.setManagementEvents(managementEvents);
            }
          }
        }

        if (supaLeads.length > 0) {
          useLeadsStore.setState({ rows: deduplicateLeads(supaLeads), dirty: false });
          storage.setLeads(supaLeads);
        }
        if (supaTeam.length > 0) {
          useTeamStore.setState({ members: supaTeam });
          storage.setTeam(supaTeam);
        }
      };
      refresh().catch(() => {});
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
