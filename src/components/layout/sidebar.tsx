"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSettings } from "@/store/app-settings";
import { TABS, WORKSPACE_TABS, BADGES } from "@/lib/constants";
import { todayBA } from "@/lib/dates";
import { ApiSettingsModal } from "./api-settings-modal";
import { ColumnWidthsModal } from "./column-widths-modal";
import { ImportLeadsModal } from "@/components/ui/import-leads-modal";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const NAV_TABS = TABS.filter((t) => t.key !== "CALENDARIO");
const CALENDAR_TAB = TABS.find((t) => t.key === "CALENDARIO")!;

const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M16 2v4"/>
    <path d="M8 2v4"/>
    <path d="M3 10h18"/>
    <circle cx="12" cy="15" r="2"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

/* ─── Notification Center Modal ───────────────────────────────────────────── */

function NotificationCenter({ onClose }: { onClose: () => void }) {
  const log = useAppSettings((s) => s.settings.notificationsLog);
  const update = useAppSettings((s) => s.update);

  useEffect(() => {
    update({ notifLastSeenCount: log.length });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups: Record<string, typeof log> = {};
  for (const n of log) {
    (groups[n.date] = groups[n.date] ?? []).push(n);
  }
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 820 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Notificaciones</h2>
          <button className="icon-btn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modal-body" style={{ gridTemplateColumns: "1fr", gap: 12, maxHeight: "60vh", overflowY: "auto" }}>
          {sortedDates.length === 0 ? (
            <div className="fake-field">Todavía no hay notificaciones registradas.</div>
          ) : (
            sortedDates.map((day) => (
              <section key={day} className="notification-day">
                <div className="notification-day-title">{day}</div>
                {groups[day].map((n) => (
                  <div key={n.id} className="notification-row">
                    <div className="notification-time">{n.time}</div>
                    <div>{n.message}</div>
                  </div>
                ))}
              </section>
            ))
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => { update({ notificationsLog: [] }); onClose(); }}
          >
            Limpiar historial
          </button>
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Notification Settings Modal ─────────────────────────────────────────── */

function NotifSettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, update } = useAppSettings();
  const [minutes, setMinutes] = useState(String(settings.notificationMinutesBefore));
  const [tone, setTone] = useState(settings.notificationTone);
  const [repeat, setRepeat] = useState(String(settings.notificationRepeat));

  function save() {
    update({
      notificationMinutesBefore: Math.max(0, parseInt(minutes) || 0),
      notificationTone: tone || "classic",
      notificationRepeat: Math.max(1, parseInt(repeat) || 1),
    });
    onClose();
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Configurar notificaciones</h2>
          <button className="icon-btn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modal-body" style={{ gridTemplateColumns: "1fr", gap: 12 }}>
          <label className="dashboard-setting-grid">
            <span>Notificar cuántos minutos antes</span>
            <input className="field" type="number" min="0" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </label>
          <label className="dashboard-setting-grid">
            <span>Tono</span>
            <select className="field" value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="classic">Clásico</option>
              <option value="soft">Suave</option>
              <option value="alert">Alerta</option>
              <option value="bell">Campana</option>
              <option value="japaneseSchoolBell">Campanas colegio japonés</option>
            </select>
          </label>
          <label className="dashboard-setting-grid">
            <span>Repetir melodía</span>
            <input className="field" type="number" min="1" max="10" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-amber" onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Badge Settings Modal ─────────────────────────────────────────────────── */

function BadgeSettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, update } = useAppSettings();
  const [reqs, setReqs] = useState({ ...settings.badgeRequirements });

  function save() {
    update({ badgeRequirements: reqs });
    onClose();
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Configurar insignias</h2>
          <button className="icon-btn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modal-body" style={{ gridTemplateColumns: "1fr", gap: 12 }}>
          <p style={{ fontSize: 12, color: "var(--slate-500)", fontWeight: 700, margin: 0 }}>
            Cantidad mínima de cierres para obtener cada insignia.
          </p>
          {BADGES.map((b) => (
            <label key={b.key} className="dashboard-setting-grid">
              <span>{b.icon} {b.label}</span>
              <input
                className="field"
                type="number"
                min="1"
                value={reqs[b.key as keyof typeof reqs]}
                onChange={(e) => setReqs((r) => ({ ...r, [b.key]: Math.max(1, parseInt(e.target.value) || 1) }))}
              />
            </label>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-amber" onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar ──────────────────────────────────────────────────────────────── */

export function Sidebar({ onSync, syncing }: { onSync?: () => void; syncing?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifSettingsOpen, setNotifSettingsOpen] = useState(false);
  const [badgeSettingsOpen, setBadgeSettingsOpen] = useState(false);
  const [colWidthsOpen, setColWidthsOpen] = useState(false);
  const [dashSettingsOpen, setDashSettingsOpen] = useState(false);
  const [calendarConnOpen, setCalendarConnOpen] = useState(false);
  const [apiSettingsOpen, setApiSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { settings, toggleDarkMode, update } = useAppSettings();

  /* Click-outside to close gear menu */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  /* Filter tabs by workspace mode */
  const allowedKeys = WORKSPACE_TABS[settings.workspaceMode ?? "ventas"];
  const visibleNavTabs = NAV_TABS.filter((t) => allowedKeys.includes(t.key));
  const showCalendar = allowedKeys.includes("CALENDARIO");
  const calendarActive = isActive(CALENDAR_TAB.href);

  /* Notificaciones no leídas */
  const today = todayBA();
  void today;
  const hasUnread = settings.notificationsLog.length > (settings.notifLastSeenCount ?? 0);

  return (
    <>
      <nav className="tabs tabs-bar">
        <div className="tabs-list">
          {visibleNavTabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`tab${isActive(tab.href) ? " active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
          {showCalendar && (
            <Link
              href={CALENDAR_TAB.href}
              className={`tab calendar-tab${calendarActive ? " active" : ""}`}
              aria-label="Calendario"
            >
              <CalendarIcon />
            </Link>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Notification bell */}
          <button
            className={`notifications-bell${hasUnread ? " has-unread" : ""}`}
            type="button"
            title="Notificaciones"
            onClick={() => setNotifOpen(true)}
          >
            <BellIcon />
          </button>

          {/* Settings gear */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              className="tabs-settings-btn"
              type="button"
              aria-label="Configuración"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <GearIcon />
            </button>

            {menuOpen && (
              <div className="settings-menu open">
                {/* Always-visible options */}
                {onSync && (
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    disabled={syncing}
                    onClick={() => { onSync(); setMenuOpen(false); }}
                  >
                    {syncing ? "Sincronizando…" : "Sincronizar con Sheets"}
                  </button>
                )}
                <button
                  className="btn btn-dark btn-sm"
                  type="button"
                  onClick={() => { toggleDarkMode(); setMenuOpen(false); }}
                >
                  {settings.darkMode ? "Desactivar modo noche" : "Activar modo noche"}
                </button>
                <button
                  className="btn btn-amber btn-sm"
                  type="button"
                  onClick={() => { setImportOpen(true); setMenuOpen(false); }}
                >
                  ↑ Importar leads
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={() => update({ specialConfigUnlocked: !settings.specialConfigUnlocked })}
                >
                  Configuración especial
                </button>

                {/* Special options — visible only when unlocked */}
                {settings.specialConfigUnlocked && (
                  <>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => { update({ clientOrderMode: !settings.clientOrderMode }); setMenuOpen(false); }}
                    >
                      {settings.clientOrderMode ? "Desactivar orden manual" : "Acomodar clientes"}
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => { setColWidthsOpen(true); setMenuOpen(false); }}
                    >
                      Configurar ancho de columnas
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => { setDashSettingsOpen(true); setMenuOpen(false); }}
                    >
                      Configurar dashboard
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => {
                        const scale = window.prompt("Escala del sistema (0.5 a 1.5):", String(settings.systemScale ?? 1));
                        if (scale !== null) {
                          const n = parseFloat(scale);
                          if (!isNaN(n) && n >= 0.5 && n <= 1.5) update({ systemScale: n });
                        }
                        setMenuOpen(false);
                      }}
                    >
                      Escalar sistema
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => { setApiSettingsOpen(true); setMenuOpen(false); }}
                    >
                      Cargar / cambiar link API
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => { setCalendarConnOpen(true); setMenuOpen(false); }}
                    >
                      Conectar Google Calendar
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => { setNotifSettingsOpen(true); setMenuOpen(false); }}
                    >
                      Configurar notificaciones
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => { setBadgeSettingsOpen(true); setMenuOpen(false); }}
                    >
                      Configurar insignias
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => {
                        const data = JSON.stringify({ version: 1 }, null, 2);
                        const blob = new Blob([data], { type: "application/json" });
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = "biomarketing-export.json";
                        a.click();
                        setMenuOpen(false);
                      }}
                    >
                      JSON
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {notifOpen && <NotificationCenter onClose={() => setNotifOpen(false)} />}
      {notifSettingsOpen && <NotifSettingsModal onClose={() => setNotifSettingsOpen(false)} />}
      {badgeSettingsOpen && <BadgeSettingsModal onClose={() => setBadgeSettingsOpen(false)} />}
      {colWidthsOpen && <ColumnWidthsModal onClose={() => setColWidthsOpen(false)} />}
      {dashSettingsOpen && <DashSettingsModal onClose={() => setDashSettingsOpen(false)} />}
      {calendarConnOpen && <CalendarConnModal onClose={() => setCalendarConnOpen(false)} />}
      {apiSettingsOpen && <ApiSettingsModal onClose={() => setApiSettingsOpen(false)} />}
      {importOpen && <ImportLeadsModal onClose={() => setImportOpen(false)} />}
    </>
  );
}

/* ─── Dashboard Settings Modal ─────────────────────────────────────── */

const SECTION_LABELS: Record<string, string> = {
  nav:          "Selector de mes",
  hoy:          "Tabla HOY",
  anio:         "Tabla AÑO",
  mes:          "Tabla MES",
  barras:       "Gráficos diarios",
  area_mensual: "Crecimiento mensual",
  area_anual:   "Crecimiento anual",
};

function DashSettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, update } = useAppSettings();
  const [fontSize, setFontSize] = useState(String(settings.dashboardFontSize));
  const [chartScale, setChartScale] = useState(String(settings.chartScale ?? 1));
  const [layout, setLayout] = useState(() =>
    [...(settings.dashboardLayout ?? [])].sort((a, b) => a.order - b.order)
  );

  function toggleVisible(id: string) {
    setLayout((l) => l.map((s) => s.id === id ? { ...s, visible: !s.visible } : s));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setLayout((l) => {
      const next = [...l];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((s, i) => ({ ...s, order: i }));
    });
  }

  function moveDown(idx: number) {
    setLayout((l) => {
      if (idx >= l.length - 1) return l;
      const next = [...l];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((s, i) => ({ ...s, order: i }));
    });
  }

  function save() {
    update({
      dashboardFontSize: Math.max(10, parseInt(fontSize) || 17),
      chartScale: Math.max(0.5, parseFloat(chartScale) || 1),
      dashboardLayout: layout,
    });
    onClose();
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Configurar dashboard</h2>
          <button className="icon-btn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modal-body" style={{ gridTemplateColumns: "1fr", gap: 12 }}>
          <label className="dashboard-setting-grid">
            <span>Tamaño de fuente (px)</span>
            <input className="field" type="number" min="10" max="32" value={fontSize} onChange={(e) => setFontSize(e.target.value)} />
          </label>
          <label className="dashboard-setting-grid">
            <span>Escala de gráficos</span>
            <input className="field" type="number" min="0.5" max="2" step="0.1" value={chartScale} onChange={(e) => setChartScale(e.target.value)} />
          </label>
          <div style={{ borderTop: "1px solid var(--slate-200)", paddingTop: 12, marginTop: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--slate-500)", margin: "0 0 8px", letterSpacing: "0.05em" }}>
              SECCIONES DEL DASHBOARD
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {layout.map((section, idx) => (
                <div
                  key={section.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: section.visible ? "var(--slate-50)" : "transparent",
                    border: "1px solid var(--slate-200)",
                    opacity: section.visible ? 1 : 0.5,
                    transition: "opacity 0.15s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={section.visible}
                    onChange={() => toggleVisible(section.id)}
                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--amber)", flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                    {SECTION_LABELS[section.id] ?? section.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    title="Subir"
                    style={{
                      background: "none",
                      border: "1px solid var(--slate-200)",
                      borderRadius: 4,
                      cursor: idx === 0 ? "default" : "pointer",
                      opacity: idx === 0 ? 0.25 : 0.7,
                      padding: "2px 6px",
                      fontSize: 10,
                      lineHeight: 1,
                      color: "var(--slate-700)",
                    }}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === layout.length - 1}
                    title="Bajar"
                    style={{
                      background: "none",
                      border: "1px solid var(--slate-200)",
                      borderRadius: 4,
                      cursor: idx === layout.length - 1 ? "default" : "pointer",
                      opacity: idx === layout.length - 1 ? 0.25 : 0.7,
                      padding: "2px 6px",
                      fontSize: 10,
                      lineHeight: 1,
                      color: "var(--slate-700)",
                    }}
                  >
                    ▼
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-amber" onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Calendar Connect Modal ───────────────────────────────────────── */

function CalendarConnModal({ onClose }: { onClose: () => void }) {
  const { settings, update } = useAppSettings();
  const [calId, setCalId] = useState(settings.calendarId ?? "primary");

  function save() {
    update({ calendarId: calId.trim() || "primary", calendarConnected: true });
    onClose();
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Conectar Google Calendar</h2>
          <button className="icon-btn" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="modal-body" style={{ gridTemplateColumns: "1fr", gap: 12 }}>
          <label className="dashboard-setting-grid" style={{ gridTemplateColumns: "1fr" }}>
            <span>ID del calendario (o "primary")</span>
            <input className="field" type="text" value={calId} onChange={(e) => setCalId(e.target.value)} placeholder="primary" />
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-amber" onClick={save}>Conectar</button>
        </div>
      </div>
    </div>
  );
}
