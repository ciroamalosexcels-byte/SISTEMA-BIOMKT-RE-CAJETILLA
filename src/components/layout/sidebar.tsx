"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  TrendingUp, Users, Building2,
  Moon, Sun, RefreshCw, Upload, Save,
  ChevronLeft, ChevronDown, Bell, Settings,
  LayoutDashboard, GitMerge, UserCheck, CalendarDays,
  ClipboardList, Map, FileText, Users2, MessageSquare,
  BriefcaseBusiness, BarChart3,
} from "lucide-react";
import { useAppSettings } from "@/store/app-settings";
import { ApiSettingsModal } from "./api-settings-modal";
import { ColumnWidthsModal } from "./column-widths-modal";
import { ImportLeadsModal } from "@/components/ui/import-leads-modal";
import { WORKSPACE_NAV } from "@/lib/constants";
import type { WorkspaceMode } from "@/lib/constants";

/* ── Icon map ────────────────────────────────────────────────────── */
const NAV_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  DASHBOARD:           LayoutDashboard,
  DASHBOARD_CLIENTES:  LayoutDashboard,
  DASHBOARD_EQUIPO:    LayoutDashboard,
  SEGUIMIENTO:         GitMerge,
  CLIENTES:            UserCheck,
  EQUIPO:              Users2,
  CALENDARIO:          CalendarDays,
  PLANIFICACION:       ClipboardList,
  PLANES:              FileText,
  MAPA_CLIENTES:       Map,
  COLABORADORES:       Users,
  PROCEDIMIENTOS:      BriefcaseBusiness,
  REUNIONES_EQUIPO:    MessageSquare,
};

const WORKSPACE_CONFIGS: { key: WorkspaceMode; Icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { key: "ventas",   Icon: TrendingUp, label: "Ventas" },
  { key: "clientes", Icon: Users,      label: "Clientes" },
  { key: "equipo",   Icon: Building2,  label: "Equipo" },
];

/* ── Disquete icons ──────────────────────────────────────────────── */
function FloppyIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}

function FloppyCheckIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
      <path d="M9.5 17l1.5 1.5 3-3" strokeWidth="2.2"/>
    </svg>
  );
}

/* ── Notification Center ─────────────────────────────────────────── */
function NotificationCenter({ onClose }: { onClose: () => void }) {
  const log = useAppSettings((s) => s.settings.notificationsLog);
  const update = useAppSettings((s) => s.update);
  useEffect(() => { update({ notifLastSeenCount: log.length }); }, []); // eslint-disable-line
  const groups: Record<string, typeof log> = {};
  for (const n of log) (groups[n.date] = groups[n.date] ?? []).push(n);
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Notificaciones</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ gridTemplateColumns: "1fr", gap: 10, maxHeight: "58vh", overflowY: "auto" }}>
          {sortedDates.length === 0 ? (
            <div className="fake-field">No hay notificaciones.</div>
          ) : sortedDates.map((day) => (
            <section key={day} className="notification-day">
              <div className="notification-day-title">{day}</div>
              {groups[day].map((n) => (
                <div key={n.id} className="notification-row">
                  <div className="notification-time">{n.time}</div>
                  <div>{n.message}</div>
                </div>
              ))}
            </section>
          ))}
        </div>
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <button className="btn btn-danger btn-sm" onClick={() => { update({ notificationsLog: [] }); onClose(); }}>Limpiar</button>
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ── Settings popup ──────────────────────────────────────────────── */
const MBTN = "flex items-center gap-2 px-3 py-2 text-[12px] font-semibold rounded-lg hover:bg-white/[0.08] transition-colors whitespace-nowrap bg-transparent border-none cursor-pointer w-full text-white";

function SettingsMenu({ onClose, onImport, onApiSettings, onColWidths, onSync, syncing, sidebarW }: {
  onClose: () => void; onImport: () => void;
  onApiSettings: () => void; onColWidths: () => void;
  onSync?: () => void; syncing?: boolean;
  sidebarW: number;
}) {
  const { settings, update } = useAppSettings();
  return (
    <div style={{
      position: "fixed", left: sidebarW + 4, bottom: 44, zIndex: 300,
      background: "#07152f", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14, padding: 8, width: 228,
      boxShadow: "0 18px 50px rgba(0,0,0,0.6)",
      display: "flex", flexDirection: "column", gap: 1,
    }}>
      {/* Modo noche */}
      <button className={MBTN} onClick={() => { update({ darkMode: !settings.darkMode }); onClose(); }}>
        {settings.darkMode ? <Sun size={17} /> : <Moon size={17} />}
        {settings.darkMode ? "Modo claro" : "Modo noche"}
      </button>

      {/* Sincronizar */}
      {onSync && (
        <button className={MBTN} onClick={() => { onSync(); onClose(); }} disabled={syncing}>
          <RefreshCw size={17} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Sincronizando…" : "Sincronizar Sheets"}
        </button>
      )}

      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 8px" }} />

      <button className={MBTN} onClick={() => { onImport(); onClose(); }}><Upload size={17} /> Importar leads</button>
      <button className={MBTN} onClick={() => { onApiSettings(); onClose(); }}><Settings size={17} /> Link API</button>
      <button className={MBTN} onClick={() => { onColWidths(); onClose(); }}><Settings size={17} /> Ancho columnas</button>
      <button className={MBTN} onClick={() => {
        const v = window.prompt("Escala (0.5–1.5):", String(settings.systemScale ?? 1));
        if (v !== null) { const n = parseFloat(v); if (!isNaN(n) && n >= 0.5 && n <= 1.5) update({ systemScale: n }); }
        onClose();
      }}><Settings size={17} /> Escalar sistema</button>
    </div>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────────── */
interface SidebarProps {
  onSync?: () => void; syncing?: boolean;
  onSave?: () => void; saving?: boolean; dirty?: boolean;
}

export function Sidebar({ onSync, syncing, onSave, saving, dirty }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { settings, update } = useAppSettings();

  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiSettingsOpen, setApiSettingsOpen] = useState(false);
  const [colWidthsOpen, setColWidthsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const settingsRef = useRef<HTMLButtonElement>(null);

  const mode: WorkspaceMode = settings.workspaceMode ?? "ventas";
  const hasUnread = settings.notificationsLog.length > (settings.notifLastSeenCount ?? 0);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const sidebarW = collapsed ? 52 : 220;
  /* Clase compartida para todos los textos — se vuelven invisibles al colapsar */
  const lbl = `whitespace-nowrap transition-opacity duration-100 ${collapsed ? "opacity-0 select-none pointer-events-none" : "opacity-100"}`;

  function switchWorkspace(ws: WorkspaceMode) {
    update({ workspaceMode: ws });
    const first = WORKSPACE_NAV[ws][0];
    if (first) router.push(first.href);
  }

  // El cierre del menú se maneja con un backdrop (ver más abajo)

  /* Clase base para ítems de nav */
  const navItem = (active: boolean) =>
    `flex items-center gap-2.5 px-3 py-2 w-full text-[12px] font-semibold no-underline border-none bg-transparent cursor-pointer transition-colors whitespace-nowrap overflow-hidden ${
      active ? "text-amber bg-amber/[0.08] font-bold" : "text-white hover:bg-white/[0.07]"
    }`;

  return (
    <>
      {/* ── Barra única ──────────────────────────────────────────── */}
      <aside
        className="bg-[#07152f] flex flex-col z-50 border-r border-white/[0.05] flex-shrink-0 overflow-hidden"
        style={{ width: sidebarW, transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)" }}
      >
        {/* Logo / toggle */}
        <button
          className="flex items-center gap-2.5 h-12 px-3 border-b border-white/[0.05] w-full bg-transparent cursor-pointer hover:bg-white/[0.04] transition-colors flex-shrink-0"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {/* SVG logo */}
          <svg viewBox="0 0 44 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="31" height="31" className="flex-shrink-0">
            <rect x="1" y="1" width="9" height="38" rx="4" fill="#f6bf26"/>
            <path fillRule="evenodd" clipRule="evenodd"
              d="M26 2C17.163 2 10 9.163 10 18C10 26.837 17.163 34 26 34C34.837 34 42 26.837 42 18C42 9.163 34.837 2 26 2ZM26 10C30.418 10 34 13.582 34 18C34 22.418 30.418 26 26 26C21.582 26 18 22.418 18 18C18 13.582 21.582 10 26 10Z"
              fill="#f6bf26"/>
          </svg>
          <span className={`text-[11px] font-black text-white tracking-[0.06em] uppercase flex-1 text-left ${lbl}`}>
            BIOMKT
          </span>
          <ChevronLeft
            size={16}
            className="text-white/40 flex-shrink-0 transition-transform duration-200"
            style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {/* Área scrollable de navegación */}
        <div className="flex-1 overflow-y-auto py-1.5 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-white/[0.08]">

          {/* Dashboard General */}
          <Link href="/general" className={navItem(isActive("/general"))}>
            <BarChart3 size={18} className="flex-shrink-0 min-w-[20px]" />
            <span className={lbl}>Dashboard General</span>
          </Link>

          <div className="mx-3 my-1.5 border-b border-white/[0.06]" />

          {/* Workspaces */}
          {WORKSPACE_CONFIGS.map(({ key, Icon }) => {
            const isActiveWS = mode === key && !isActive("/general");
            const wsLinks = WORKSPACE_NAV[key];
            const wsLabel = key === "ventas" ? "Ventas" : key === "clientes" ? "Clientes" : "Equipo";

            return (
              <div key={key}>
                {/* Workspace parent */}
                <button
                  className={`flex items-center gap-2.5 px-3 py-2 text-[13px] font-bold w-full border-none bg-transparent cursor-pointer transition-colors whitespace-nowrap overflow-hidden ${
                    isActiveWS ? "text-amber" : "text-white hover:bg-white/[0.07]"
                  }`}
                  onClick={() => switchWorkspace(key)}
                >
                  <span className="flex-shrink-0 min-w-[20px] flex items-center justify-center"><Icon size={18} /></span>
                  <span className={`flex-1 text-left ${lbl}`}>{wsLabel}</span>
                  <ChevronDown
                    size={13}
                    className="flex-shrink-0 transition-transform duration-200"
                    style={{ transform: isActiveWS ? "rotate(0deg)" : "rotate(-90deg)" }}
                  />
                </button>

                {/* Submenu — solo si activo Y expandido */}
                {isActiveWS && !collapsed && (
                  <div className="pb-0.5">
                    {wsLinks.map((link) => {
                      const NavIcon = NAV_ICONS[link.key] ?? FileText;
                      return (
                        <Link
                          key={link.key}
                          href={link.href}
                          className={`flex items-center gap-2.5 py-[6px] pr-3 text-[12px] font-semibold no-underline transition-colors whitespace-nowrap overflow-hidden ${
                            isActive(link.href)
                              ? "text-amber bg-amber/[0.08] font-bold"
                              : "text-white hover:bg-white/[0.06]"
                          }`}
                          style={{ paddingLeft: 36 }}
                        >
                          <span className="flex-shrink-0 min-w-[16px] flex items-center justify-center"><NavIcon size={16} /></span>
                          <span className={lbl}>{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                <div className="mx-3 my-0.5 border-b border-white/[0.05]" />
              </div>
            );
          })}
        </div>

        {/* Utilidades — columna vertical igual que el nav */}
        <div className="border-t border-white/[0.05] py-1 flex-shrink-0">

          {/* Guardar */}
          {onSave && (
            <button
              className={`flex items-center gap-2.5 px-3 py-2 w-full border-none bg-transparent cursor-pointer text-[11px] font-semibold transition-colors whitespace-nowrap ${
                dirty ? "text-amber hover:bg-amber/[0.06]" : "text-white hover:bg-white/[0.06]"
              }`}
              onClick={onSave} disabled={saving}
              title={saving ? "Guardando…" : dirty ? "Guardar en Sheets" : "Todo guardado"}
            >
              <span className="flex-shrink-0 min-w-[20px] flex items-center justify-center">
                {saving
                  ? <RefreshCw size={17} className="animate-spin" />
                  : dirty ? <FloppyIcon size={17} /> : <FloppyCheckIcon size={17} />
                }
              </span>
              <span className={lbl}>{saving ? "Guardando…" : dirty ? "Guardar" : "Guardado"}</span>
            </button>
          )}

          {/* Notificaciones */}
          <button
            className={`flex items-center gap-2.5 px-3 py-2 w-full border-none bg-transparent cursor-pointer text-[11px] font-semibold transition-colors whitespace-nowrap ${hasUnread ? "text-amber hover:bg-amber/[0.06]" : "text-white hover:bg-white/[0.06]"}`}
            onClick={() => setNotifOpen(true)}
            title="Notificaciones"
          >
            <span className="flex-shrink-0 min-w-[20px] flex items-center justify-center">
              <Bell size={17} />
            </span>
            <span className={lbl}>Notificaciones</span>
          </button>

          {/* Configuración */}
          <button
            ref={settingsRef}
            className="flex items-center gap-2.5 px-3 py-2 w-full border-none bg-transparent cursor-pointer text-[11px] font-semibold text-white hover:bg-white/[0.06] transition-colors whitespace-nowrap"
            onClick={() => setSettingsOpen((v) => !v)}
            title="Configuración"
          >
            <span className="flex-shrink-0 min-w-[20px] flex items-center justify-center">
              <Settings size={17} />
            </span>
            <span className={lbl}>Configuración</span>
          </button>

        </div>
      </aside>

      {/* Popups y modales */}
      {settingsOpen && (
        <>
          {/* Backdrop invisible — click fuera del menú lo cierra */}
          <div
            className="fixed inset-0 z-[299]"
            onClick={() => setSettingsOpen(false)}
          />
          <SettingsMenu
            onClose={() => setSettingsOpen(false)}
            onImport={() => setImportOpen(true)}
            onApiSettings={() => setApiSettingsOpen(true)}
            onColWidths={() => setColWidthsOpen(true)}
            onSync={onSync}
            syncing={syncing}
            sidebarW={sidebarW}
          />
        </>
      )}
      {notifOpen       && <NotificationCenter onClose={() => setNotifOpen(false)} />}
      {apiSettingsOpen && <ApiSettingsModal onClose={() => setApiSettingsOpen(false)} />}
      {colWidthsOpen   && <ColumnWidthsModal onClose={() => setColWidthsOpen(false)} />}
      {importOpen      && <ImportLeadsModal onClose={() => setImportOpen(false)} />}
    </>
  );
}
