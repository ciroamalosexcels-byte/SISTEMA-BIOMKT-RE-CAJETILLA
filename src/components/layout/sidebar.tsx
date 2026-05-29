"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  TrendingUp, Users, Building2,
  Moon, Sun, RefreshCw, Upload, Save, CheckCheck,
  ChevronLeft, ChevronRight, Bell, Settings,
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
        position: "fixed", left: 52, bottom: 60, zIndex: 300,
        background: "#07152f", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, padding: 10, width: 240,
        boxShadow: "0 18px 50px rgba(0,0,0,0.55)", display: "flex",
        flexDirection: "column", gap: 2,
      }}
    >
      <button
        className="flex items-center gap-2 px-2 py-[7px] text-[11px] font-semibold rounded-md hover:bg-white/[0.04] transition-colors whitespace-nowrap bg-transparent border-none cursor-pointer text-[#1e3a5f] hover:text-[#4b7ab5]"
        onClick={() => { onImport(); onClose(); }}
      >
        <Upload size={13} /> Importar leads
      </button>
      <button
        className="flex items-center gap-2 px-2 py-[7px] text-[11px] font-semibold rounded-md hover:bg-white/[0.04] transition-colors whitespace-nowrap bg-transparent border-none cursor-pointer text-[#1e3a5f] hover:text-[#4b7ab5]"
        onClick={() => { onApiSettings(); onClose(); }}
      >
        <Settings size={13} /> Link API
      </button>
      <button
        className="flex items-center gap-2 px-2 py-[7px] text-[11px] font-semibold rounded-md hover:bg-white/[0.04] transition-colors whitespace-nowrap bg-transparent border-none cursor-pointer text-[#1e3a5f] hover:text-[#4b7ab5]"
        onClick={() => { onColWidths(); onClose(); }}
      >
        <Settings size={13} /> Ancho columnas
      </button>
      <button
        className="flex items-center gap-2 px-2 py-[7px] text-[11px] font-semibold rounded-md hover:bg-white/[0.04] transition-colors whitespace-nowrap bg-transparent border-none cursor-pointer text-[#1e3a5f] hover:text-[#4b7ab5]"
        onClick={() => {
          const v = window.prompt("Escala (0.5–1.5):", String(settings.systemScale ?? 1));
          if (v !== null) { const n = parseFloat(v); if (!isNaN(n) && n >= 0.5 && n <= 1.5) update({ systemScale: n }); }
          onClose();
        }}
      >
        <Settings size={13} /> Escalar sistema
      </button>
    </div>
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
        <div className="w-[34px] h-[34px] bg-amber text-bio-dark rounded-lg flex items-center justify-center text-sm font-black mb-2.5 flex-shrink-0">
          B
        </div>

        {WORKSPACE_CONFIGS.map(({ key, Icon, label }) => (
          <button
            key={key}
            className={[
              "w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors border-none flex-shrink-0",
              mode === key
                ? "bg-amber/[0.14] text-amber"
                : "bg-transparent text-slate-600 hover:bg-white/[0.06] hover:text-slate-400",
            ].join(" ")}
            onClick={() => switchWorkspace(key)}
            title={label}
          >
            <Icon size={18} />
          </button>
        ))}

        <div className="flex-1" />

        {/* Dark / Light toggle */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-slate-600 hover:text-slate-400 hover:bg-white/[0.06] transition-colors border-none bg-transparent flex-shrink-0"
          title={settings.darkMode ? "Modo claro" : "Modo noche"}
          onClick={() => update({ darkMode: !settings.darkMode })}
        >
          {settings.darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <button
          className={[
            "w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/[0.06] transition-colors border-none bg-transparent flex-shrink-0",
            hasUnread ? "text-amber" : "text-slate-600 hover:text-slate-400",
          ].join(" ")}
          title="Notificaciones"
          onClick={() => setNotifOpen(true)}
        >
          <Bell size={16} />
        </button>

        {/* Settings */}
        <button
          ref={settingsRef}
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-slate-600 hover:text-slate-400 hover:bg-white/[0.06] transition-colors border-none bg-transparent flex-shrink-0"
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
        {/* Panel header */}
        <div className="px-3.5 pt-3.5 pb-2.5 flex items-center justify-between border-b border-white/[0.05] flex-shrink-0 whitespace-nowrap overflow-hidden">
          <span className="text-[10px] font-black text-amber tracking-[0.1em] uppercase">
            {WORKSPACE_TITLES[mode]}
          </span>
          <button
            className="w-5 h-5 rounded flex items-center justify-center text-slate-600 cursor-pointer hover:text-slate-400 hover:bg-white/[0.06] transition-colors bg-transparent border-none flex-shrink-0"
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft size={14} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-1.5 min-w-[200px]">
          {links.map((link) => {
            const Icon = NAV_ICONS[link.key] ?? FileText;
            return (
              <Link
                key={link.key}
                href={link.href}
                className={[
                  "flex items-center gap-2 px-3.5 py-[7px] text-xs font-semibold no-underline transition-colors whitespace-nowrap overflow-hidden",
                  isActive(link.href)
                    ? "text-amber bg-amber/[0.07] font-bold"
                    : "text-[#2d4a6b] hover:text-[#6b8db5] hover:bg-white/[0.03]",
                ].join(" ")}
              >
                <Icon size={14} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 pb-2.5 pt-2 border-t border-white/[0.05] flex flex-col gap-0.5 flex-shrink-0 min-w-[200px]">
          {onSave && (
            <button
              className={[
                "flex items-center gap-2 px-2 py-[7px] text-[11px] font-semibold rounded-md hover:bg-white/[0.04] transition-colors whitespace-nowrap bg-transparent border-none cursor-pointer",
                dirty ? "text-amber" : "text-[#1e3a5f] hover:text-[#4b7ab5]",
              ].join(" ")}
              onClick={onSave}
              disabled={saving}
            >
              {saving
                ? <RefreshCw size={13} className="animate-spin" />
                : dirty
                  ? <Save size={13} />
                  : <CheckCheck size={13} />
              }
              <span>{saving ? "Guardando…" : dirty ? "Guardar en Sheets" : "Todo guardado"}</span>
            </button>
          )}
          {onSync && (
            <button
              className="flex items-center gap-2 px-2 py-[7px] text-[11px] font-semibold rounded-md hover:bg-white/[0.04] transition-colors whitespace-nowrap bg-transparent border-none cursor-pointer text-[#1e3a5f] hover:text-[#4b7ab5]"
              onClick={onSync}
              disabled={syncing}
            >
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
              <span>{syncing ? "Sincronizando…" : "Sincronizar Sheets"}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          className="fixed left-[52px] top-1/2 -translate-y-1/2 w-4 h-10 bg-bio-panel rounded-r-md flex items-center justify-center cursor-pointer text-slate-600 z-[48] border border-white/[0.05] border-l-0 hover:text-amber transition-colors"
          onClick={() => setCollapsed(false)}
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* ── Modales ───────────────────────────────────────────────── */}
      {notifOpen      && <NotificationCenter onClose={() => setNotifOpen(false)} />}
      {apiSettingsOpen && <ApiSettingsModal onClose={() => setApiSettingsOpen(false)} />}
      {colWidthsOpen   && <ColumnWidthsModal onClose={() => setColWidthsOpen(false)} />}
      {importOpen      && <ImportLeadsModal onClose={() => setImportOpen(false)} />}
    </>
  );
}
