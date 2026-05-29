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

  const { load: loadLeads, rows, dirty, saving, save } = useLeadsStore();
  const loadTeam = useTeamStore((s) => s.load);
  const teamMembers = useTeamStore((s) => s.members);
  const teamDirty = useTeamStore((s) => s.dirty);
  const teamSave = useTeamStore((s) => s.save);
  const loadEvents = useContentEventsStore((s) => s.load);
  const contentEvents    = useContentEventsStore((s) => s.contentEvents);
  const managementEvents = useContentEventsStore((s) => s.managementEvents);
  const contentDirty     = useContentEventsStore((s) => s.dirty);
  const loadColumnWidths = useColumnWidthsStore((s) => s.load);
  const loadPlans   = usePlansStore((s) => s.load);
  const loadPipeline = usePipelineStore((s) => s.load);
  const plans       = usePlansStore((s) => s.plans);
  const planEvents  = usePlansStore((s) => s.planEvents);
  const plansDirty  = usePlansStore((s) => s.dirty);

  /* ─── 10-second debounce auto-save for leads ──────────────────── */
  const leadsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!dirty) return;
    if (leadsSaveTimer.current) clearTimeout(leadsSaveTimer.current);
    leadsSaveTimer.current = setTimeout(() => { save(); }, 10_000);
    return () => { if (leadsSaveTimer.current) clearTimeout(leadsSaveTimer.current); };
  // rows reference changes on every lead mutation — that resets the timer correctly
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  /* ─── 10-second debounce auto-save for team ───────────────────── */
  const teamSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!teamDirty) return;
    if (teamSaveTimer.current) clearTimeout(teamSaveTimer.current);
    teamSaveTimer.current = setTimeout(() => { teamSave(); }, 10_000);
    return () => { if (teamSaveTimer.current) clearTimeout(teamSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMembers]);

  /* ─── 10-second debounce auto-save for content events ─────────── */
  const contentSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!contentDirty) return;
    if (contentSaveTimer.current) clearTimeout(contentSaveTimer.current);
    contentSaveTimer.current = setTimeout(() => { void saveAllToSheets(true); }, 10_000);
    return () => { if (contentSaveTimer.current) clearTimeout(contentSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentEvents, managementEvents]);

  /* ─── 10-second debounce auto-save for plans ──────────────────── */
  const plansSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!plansDirty) return;
    if (plansSaveTimer.current) clearTimeout(plansSaveTimer.current);
    plansSaveTimer.current = setTimeout(() => { void saveAllToSheets(true); }, 10_000);
    return () => { if (plansSaveTimer.current) clearTimeout(plansSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, planEvents]);

  useEffect(() => {
    loadSettings();
    loadLeads();
    loadTeam();
    loadEvents();
    loadColumnWidths();
    loadPlans();
    loadPipeline();

    fetchFromSheets()
      .then((data) => applyFetchedData(data, false))
      .catch((err) => { console.error("[Sheets] fetch inicial fallido, usando caché local:", err); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [syncing, setSyncing] = useState(false);

  async function applyFetchedData(data: Awaited<ReturnType<typeof fetchFromSheets>>, notify = false): Promise<boolean> {
    let loaded = false;
    const { storage } = await import("@/lib/storage");
    if (Array.isArray(data.rows) && data.rows.length > 0) {
      useLeadsStore.setState({ rows: deduplicateLeads(data.rows), dirty: false });
      storage.setLeads(data.rows);
      loaded = true;
    }
    if (Array.isArray(data.team) && data.team.length > 0) {
      useTeamStore.setState({ members: data.team });
      storage.setTeam(data.team);
      loaded = true;
    }
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
    if (notify) {
      addNotification(loaded
        ? `Sincronizado: ${Array.isArray(data.rows) ? data.rows.length : 0} leads, ${Array.isArray(data.team) ? data.team.length : 0} integrantes`
        : "Sheets conectado pero sin datos nuevos"
      );
    }
    return loaded;
  }

  async function syncFromSheets() {
    setSyncing(true);
    try {
      const data = await fetchFromSheets();
      await applyFetchedData(data, true);
    } catch (err) {
      addNotification(`Error al sincronizar: ${err instanceof Error ? err.message : "Sin respuesta"}`);
    } finally {
      setSyncing(false);
    }
  }

  const [isSaving, setIsSaving] = useState(false);

  async function saveAllToSheets(silent = false) {
    setIsSaving(true);
    try {
      const leadsState   = useLeadsStore.getState();
      const teamState    = useTeamStore.getState();
      const eventsState  = useContentEventsStore.getState();
      const plansState   = usePlansStore.getState();
      const widthsState  = useColumnWidthsStore.getState();
      const { settings: s } = useAppSettings.getState();

      const MAX_PASOS = 30;
      let procedimientos: Array<Record<string, unknown>> = [];
      try {
        const raw = localStorage.getItem("biomarketing_procedures_v3");
        if (raw) {
          const now = new Date().toISOString();
          const procs = JSON.parse(raw) as Array<{ id: string; name: string; steps: Array<{ id: string; title: string; description: string; done: boolean }> }>;
          procedimientos = procs.map((p) => {
            const row: Record<string, unknown> = {
              id: p.id, titulo: p.name, categoria: "",
              totalPasos: (p.steps ?? []).length, creadoEn: "", actualizadoEn: now,
            };
            for (let i = 1; i <= MAX_PASOS; i++) {
              const st = (p.steps ?? [])[i - 1];
              row[`paso_${i}`]      = st?.title       ?? "";
              row[`paso_${i}_desc`] = st?.description ?? "";
              row[`paso_${i}_done`] = st?.done ? "SI" : "";
            }
            return row;
          });
        }
      } catch {}

      let colaboradores: Array<Record<string, unknown>> = [];
      try {
        const rawColabs = localStorage.getItem("biomarketing_collaborators_v1");
        if (rawColabs) colaboradores = JSON.parse(rawColabs);
      } catch {}

      await saveToSheets({
        action:           "saveAll",
        rows:             leadsState.rows,
        team:             teamState.members,
        contentEvents:    eventsState.contentEvents,
        managementEvents: eventsState.managementEvents,
        plans:            plansState.plans,
        planEvents:       plansState.planEvents,
        columnWidths:     widthsState.widths,
        appSettings:      s,
        notificationsLog: s.notificationsLog ?? [],
        procedimientos,
        collaborators:    colaboradores,
      });

      useLeadsStore.setState({ dirty: false });
      useTeamStore.setState({ dirty: false });
      useContentEventsStore.setState({ dirty: false });
      usePlansStore.setState({ dirty: false });
      if (!silent) addNotification("Todo guardado en Sheets");
    } catch (err) {
      addNotification(`Error al guardar: ${err instanceof Error ? err.message : "Sin respuesta"}`);
    } finally {
      setIsSaving(false);
    }
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
      fetchFromSheets()
        .then((data) => applyFetchedData(data, false))
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anyDirty = dirty || teamDirty || contentDirty || plansDirty;

  return (
    <div
      className="flex h-screen overflow-hidden bg-bio-bg dark:bg-[#060e1c]"
      style={{ zoom: settings.systemScale }}
    >
      <Sidebar
        onSync={syncFromSheets}
        syncing={syncing}
        onSave={() => void saveAllToSheets()}
        saving={isSaving}
        dirty={anyDirty}
      />
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
