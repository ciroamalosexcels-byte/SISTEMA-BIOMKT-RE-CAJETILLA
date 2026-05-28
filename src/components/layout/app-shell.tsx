"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./sidebar";
import { useAppSettings } from "@/store/app-settings";
import { useLeadsStore, deduplicateLeads } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { useContentEventsStore } from "@/store/content-events";
import { useColumnWidthsStore } from "@/store/column-widths";
import { usePlansStore } from "@/store/plans";
import { fetchFromSheets, saveToSheets } from "@/lib/sheets";
import { todayBA } from "@/lib/dates";
import {
  WORKSPACE_TITLES,
  WORKSPACE_OPTION_LABELS,
  type WorkspaceMode,
} from "@/lib/constants";

interface AppShellProps {
  children: React.ReactNode;
}

const WORKSPACE_MODES: WorkspaceMode[] = ["ventas", "clientes", "equipo"];

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

  const today = todayBA();
  const counters = useMemo(() => ({
    clientes:       rows.filter((r) => r.tab === "CLIENTES").length,
    contactadosHoy: rows.filter((r) => r.fechaContacto?.startsWith(today)).length,
    crm:            rows.filter((r) => r.tab === "CRM").length,
    reunion1:       rows.filter((r) => r.tab === "REUNION_1").length,
    reunion2:       rows.filter((r) => r.tab === "REUNION_2").length,
  }), [rows, today]);

  useEffect(() => {
    loadSettings();
    loadLeads();
    loadTeam();
    loadEvents();
    loadColumnWidths();
    loadPlans();

    fetchFromSheets()
      .then((data) => applyFetchedData(data, false))
      .catch((err) => { console.error("[Sheets] fetch inicial fallido, usando caché local:", err); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientsGoal = settings.clientsGoal ?? 21;
  const handleGoalChange = (val: string) => {
    const n = parseInt(val.trim(), 10);
    if (!isNaN(n)) updateSettings({ clientsGoal: n });
    else if (val.trim() === "") updateSettings({ clientsGoal: 0 });
  };

  /* Workspace switcher */
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

  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const wsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsMenuOpen(false);
      }
    };
    if (wsMenuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [wsMenuOpen]);

  const currentMode: WorkspaceMode = settings.workspaceMode ?? "ventas";

  return (
    <div className="container" style={{ zoom: `${settings.systemScale}` }}>
      <div className="app-space">
        <header className="header">
          <h1 className="title">
            <span className="title-switch-wrap" ref={wsRef}>
              <button
                className="workspace-arrow"
                type="button"
                title="Cambiar vista"
                aria-label="Cambiar vista"
                onClick={(e) => { e.stopPropagation(); setWsMenuOpen((v) => !v); }}
              />
              <span>{WORKSPACE_TITLES[currentMode]}</span>
              <span className={`workspace-menu${wsMenuOpen ? " open" : ""}`}>
                {WORKSPACE_MODES.map((mode) => (
                  <button
                    key={mode}
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() => {
                      updateSettings({ workspaceMode: mode });
                      setWsMenuOpen(false);
                    }}
                  >
                    {WORKSPACE_OPTION_LABELS[mode]}
                  </button>
                ))}
              </span>
            </span>
          </h1>

          <div className="header-counters">
            <div className="header-counter wide">
              <div className="label">CANTIDAD DE CLIENTES</div>
              <div className="value">
                <span>{counters.clientes}</span>
                <span>/</span>
                <input
                  className="header-counter-goal"
                  type="text"
                  inputMode="numeric"
                  value={clientsGoal || ""}
                  onChange={(e) => handleGoalChange(e.target.value)}
                  aria-label="Objetivo de clientes"
                />
              </div>
            </div>
            <div className="header-counter">
              <div className="label">CONTACTADOS HOY</div>
              <div className="value">{counters.contactadosHoy}</div>
            </div>
            <div className="header-counter">
              <div className="label">CANTIDAD EN CRM</div>
              <div className="value">{counters.crm}</div>
            </div>
            <div className="header-counter">
              <div className="label">CANTIDAD DE REUNIONES 1</div>
              <div className="value">{counters.reunion1}</div>
            </div>
            <div className="header-counter">
              <div className="label">CANTIDAD DE REUNIONES 2</div>
              <div className="value">{counters.reunion2}</div>
            </div>
          </div>

          <div className="toolbar">
            {(() => {
              const anyDirty = dirty || teamDirty || contentDirty || plansDirty;
              return (
                <button
                  onClick={() => void saveAllToSheets()}
                  disabled={isSaving}
                  className="btn btn-dark"
                  title="Guardar cambios"
                >
                  {anyDirty && !isSaving ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/>
                      <path d="M17 21v-8H7v8"/>
                      <path d="M7 3v5h8"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  )}
                  <span>{isSaving ? "Guardando…" : anyDirty ? "Guardar en Sheets" : "Guardado"}</span>
                </button>
              );
            })()}
          </div>
        </header>

        <Sidebar onSync={syncFromSheets} syncing={syncing} />
        {children}

        {/* Toast stack */}
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
    </div>
  );
}
