"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  TrendingUp, Users, Building2,
  Moon, Sun, RefreshCw, Upload, Save, CheckCheck,
  ChevronLeft, ChevronRight, ChevronDown, Bell, Settings,
  LayoutDashboard, GitMerge, UserCheck, CalendarDays,
  ClipboardList, Map, FileText, Users2, MessageSquare,
  BriefcaseBusiness,
} from "lucide-react";
import { useAppSettings } from "@/store/app-settings";
import { ApiSettingsModal } from "./api-settings-modal";
import { ColumnWidthsModal } from "./column-widths-modal";
import { ImportLeadsModal } from "@/components/ui/import-leads-modal";
import { WORKSPACE_NAV, WORKSPACE_TITLES } from "@/lib/constants";
import type { WorkspaceMode } from "@/lib/constants";

/* ── Icon map para nav links ─────────────────────────────────────── */
const NAV_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  DASHBOARD:        LayoutDashboard,
  SEGUIMIENTO:      GitMerge,
  CLIENTES:         UserCheck,
  EQUIPO:           Users2,
  CALENDARIO:       CalendarDays,
  PLANIFICACION:    ClipboardList,
  PLANES:           FileText,
  MAPA_CLIENTES:    Map,
  COLABORADORES:    Users,
  PROCEDIMIENTOS:   BriefcaseBusiness,
  REUNIONES_EQUIPO: MessageSquare,
};

const WORKSPACE_CONFIGS: { key: WorkspaceMode; Icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { key: "ventas",   Icon: TrendingUp, label: "VENTAS" },
  { key: "clientes", Icon: Users,      label: "CLIENTES" },
  { key: "equipo",   Icon: Building2,  label: "EQUIPO" },
];

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
          <button className="btn btn-danger btn-sm" onClick={() => { update({ notificationsLog: [] }); onClose(); }}>
            Limpiar
          </button>
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ── Settings Menu ───────────────────────────────────────────────── */
const MENU_BTN = "flex items-center gap-2 px-3 py-2 text-[12px] font-semibold rounded-lg hover:bg-white/[0.08] transition-colors whitespace-nowrap bg-transparent border-none cursor-pointer w-full text-white";

function SettingsMenu({
  onClose, onImport, onApiSettings, onColWidths,
}: {
  onClose: () => void;
  onImport: () => void;
  onApiSettings: () => void;
  onColWidths: () => void;
}) {
  const { settings, update } = useAppSettings();

  return (
    <div
      style={{
        position: "fixed", left: 52, bottom: 44, zIndex: 300,
        background: "#07152f", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 14, padding: 8, width: 220,
        boxShadow: "0 18px 50px rgba(0,0,0,0.6)",
        display: "flex", flexDirection: "column", gap: 1,
      }}
    >
      <button className={MENU_BTN} onClick={() => { onImport(); onClose(); }}>
        <Upload size={14} /> Importar leads
      </button>
      <button className={MENU_BTN} onClick={() => { onApiSettings(); onClose(); }}>
        <Settings size={14} /> Link API
      </button>
      <button className={MENU_BTN} onClick={() => { onColWidths(); onClose(); }}>
        <Settings size={14} /> Ancho columnas
      </button>
      <button className={MENU_BTN} onClick={() => {
        const v = window.prompt("Escala (0.5–1.5):", String(settings.systemScale ?? 1));
        if (v !== null) { const n = parseFloat(v); if (!isNaN(n) && n >= 0.5 && n <= 1.5) update({ systemScale: n }); }
        onClose();
      }}>
        <Settings size={14} /> Escalar sistema
      </button>
    </div>
  );
}

/* ── Íconos de disquete ──────────────────────────────────────────── */
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
      {/* Disquete */}
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
      {/* Check en el área inferior del disquete */}
      <path d="M9.5 17l1.5 1.5 3-3" strokeWidth="2.2"/>
    </svg>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────────── */
interface SidebarProps {
  onSync?: () => void;
  syncing?: boolean;
  onSave?: () => void;
  saving?: boolean;
  dirty?: boolean;
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
  const links = WORKSPACE_NAV[mode];
  const hasUnread = settings.notificationsLog.length > (settings.notifLastSeenCount ?? 0);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  function switchWorkspace(ws: WorkspaceMode) {
    update({ workspaceMode: ws });
    const first = WORKSPACE_NAV[ws][0];
    if (first) router.push(first.href);
  }

  /* Close settings menu on outside click */
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  return (
    <>
      {/* ── Rail ─────────────────────────────────────────────────── */}
      <aside className="w-[52px] bg-bio-rail flex flex-col items-center py-3 gap-1 z-50 border-r border-white/[0.04] flex-shrink-0">
        {/* Logo */}
        <div className="w-[34px] h-[34px] bg-amber text-bio-dark rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0">
          B
        </div>

        {/* Toggle colapsar/expandir — siempre en el mismo lugar */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-white hover:bg-white/[0.08] transition-colors border-none bg-transparent flex-shrink-0 mb-1"
          title={collapsed ? "Expandir panel" : "Colapsar panel"}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>

        {/* Íconos de workspace — siempre visibles para navegar cuando el panel está colapsado */}
        {WORKSPACE_CONFIGS.map(({ key, Icon, label }) => (
          <button
            key={key}
            className={[
              "w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors border-none flex-shrink-0",
              mode === key
                ? "bg-amber/[0.14] text-amber"
                : "bg-transparent text-white hover:bg-white/[0.08] hover:text-white",
            ].join(" ")}
            onClick={() => {
              switchWorkspace(key);
              if (collapsed) setCollapsed(false);
            }}
            title={label}
          >
            <Icon size={18} />
          </button>
        ))}

        <div className="flex-1" />

        {/* Guardar */}
        {onSave && (
          <button
            className={[
              "w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/[0.06] transition-colors border-none bg-transparent flex-shrink-0",
              dirty ? "text-amber" : "text-white hover:text-white",
            ].join(" ")}
            title={saving ? "Guardando…" : dirty ? "Guardar en Sheets" : "Todo guardado"}
            onClick={onSave}
            disabled={saving}
          >
            {saving
              ? <RefreshCw size={15} className="animate-spin" />
              : dirty
                ? <FloppyIcon size={15} />
                : <FloppyCheckIcon size={15} />
            }
          </button>
        )}

        {/* Sincronizar */}
        {onSync && (
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-white hover:bg-white/[0.08] transition-colors border-none bg-transparent flex-shrink-0"
            title={syncing ? "Sincronizando…" : "Sincronizar Sheets"}
            onClick={onSync}
            disabled={syncing}
          >
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          </button>
        )}

        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-white hover:bg-white/[0.08] transition-colors border-none bg-transparent flex-shrink-0"
          title={settings.darkMode ? "Modo claro" : "Modo noche"}
          onClick={() => update({ darkMode: !settings.darkMode })}
        >
          {settings.darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          className={[
            "w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/[0.06] transition-colors border-none bg-transparent flex-shrink-0",
            hasUnread ? "text-amber" : "text-white hover:text-white",
          ].join(" ")}
          title="Notificaciones"
          onClick={() => setNotifOpen(true)}
        >
          <Bell size={16} />
        </button>

        <button
          ref={settingsRef}
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-white hover:bg-white/[0.08] transition-colors border-none bg-transparent flex-shrink-0"
          title="Configuración"
          onClick={() => setSettingsOpen((v) => !v)}
        >
          <Settings size={16} />
        </button>
      </aside>

      {/* ── Settings menu popup ───────────────────────────────────── */}
      {settingsOpen && (
        <SettingsMenu
          onClose={() => setSettingsOpen(false)}
          onImport={() => setImportOpen(true)}
          onApiSettings={() => setApiSettingsOpen(true)}
          onColWidths={() => setColWidthsOpen(true)}
        />
      )}

      {/* ── Nav Panel ─────────────────────────────────────────────── */}
      <aside
        className={[
          "bg-bio-panel flex flex-col overflow-hidden transition-[width] duration-200 border-r border-white/[0.04] relative z-[49] flex-shrink-0",
          collapsed ? "w-0" : "w-[200px]",
        ].join(" ")}
      >
        {/* Panel header — solo título */}
        <div className="px-3.5 pt-3.5 pb-2.5 border-b border-white/[0.05] flex-shrink-0 whitespace-nowrap overflow-hidden">
          <span className="text-[11px] font-black text-white tracking-[0.06em] uppercase">
            BIOMKT
          </span>
        </div>

        {/* Nav — workspaces como ítems padre + submenu de links */}
        <nav className="flex-1 overflow-y-auto py-2 min-w-[200px]">
          {WORKSPACE_CONFIGS.map(({ key, Icon }) => {
            const isActiveWS = mode === key;
            const wsLabel = key === "ventas" ? "Ventas" : key === "clientes" ? "Clientes" : "Equipo";
            const wsLinks = WORKSPACE_NAV[key];

            return (
              <div key={key}>
                {/* Workspace header */}
                {/* Workspace header */}
                <button
                  className={[
                    "w-full flex items-center gap-2.5 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.06em] transition-colors border-none bg-transparent cursor-pointer",
                    isActiveWS
                      ? "text-amber"
                      : "text-white hover:bg-white/[0.06]",
                  ].join(" ")}
                  onClick={() => switchWorkspace(key)}
                >
                  <Icon size={13} />
                  <span>{wsLabel}</span>
                  <ChevronDown
                    size={11}
                    className={`ml-auto transition-transform duration-200 ${isActiveWS ? "rotate-0" : "-rotate-90"}`}
                  />
                </button>

                {/* Submenu — visible solo en el workspace activo */}
                {isActiveWS && (
                  <div className="pb-1">
                    {wsLinks.map((link) => {
                      const NavIcon = NAV_ICONS[link.key] ?? FileText;
                      return (
                        <Link
                          key={link.key}
                          href={link.href}
                          className={[
                            "flex items-center gap-2 pl-8 pr-3.5 py-[6px] text-[12px] font-semibold no-underline transition-colors whitespace-nowrap overflow-hidden",
                            isActive(link.href)
                              ? "text-amber bg-amber/[0.08] font-bold"
                              : "text-white hover:bg-white/[0.06]",
                          ].join(" ")}
                        >
                          <NavIcon size={12} />
                          <span>{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Separador entre workspaces */}
                <div className="mx-3.5 my-1 border-b border-white/[0.08]" />
              </div>
            );
          })}
        </nav>

      </aside>


      {/* ── Modales ───────────────────────────────────────────────── */}
      {notifOpen      && <NotificationCenter onClose={() => setNotifOpen(false)} />}
      {apiSettingsOpen && <ApiSettingsModal onClose={() => setApiSettingsOpen(false)} />}
      {colWidthsOpen   && <ColumnWidthsModal onClose={() => setColWidthsOpen(false)} />}
      {importOpen      && <ImportLeadsModal onClose={() => setImportOpen(false)} />}
    </>
  );
}
