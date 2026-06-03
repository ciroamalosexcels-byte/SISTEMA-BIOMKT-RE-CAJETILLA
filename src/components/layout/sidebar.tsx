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
  BriefcaseBusiness, BarChart3, Database, LogOut, LogIn,
} from "lucide-react";
import { useAppSettings } from "@/store/app-settings";
import { ApiSettingsModal } from "./api-settings-modal";
import { ColumnWidthsModal } from "./column-widths-modal";
import { ImportLeadsModal } from "@/components/ui/import-leads-modal";
import { WORKSPACE_NAV } from "@/lib/constants";
import type { WorkspaceMode } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

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

function SettingsMenu({ onClose, onImport, onApiSettings, onColWidths, sidebarW }: {
  onClose: () => void; onImport: () => void;
  onApiSettings: () => void; onColWidths: () => void;
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

      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 8px" }} />

      <button className={MBTN} onClick={() => { onImport(); onClose(); }}><Upload size={17} /> Importar leads</button>
      <button className={MBTN} onClick={() => { onApiSettings(); onClose(); }}><Settings size={17} /> Link API</button>
      <button className={MBTN} onClick={() => { onColWidths(); onClose(); }}><Settings size={17} /> Ancho columnas</button>
      {/* Escalar sistema — barra deslizable */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-2 text-[12px] font-semibold text-white">
            <Settings size={17} /> Escalar sistema
          </span>
          <span className="text-[11px] font-black text-amber tabular-nums">
            {((settings.systemScale ?? 1) * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min={0.5} max={1.5} step={0.05}
          value={settings.systemScale ?? 1}
          onChange={(e) => update({ systemScale: parseFloat(e.target.value) })}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #f6bf26 0%, #f6bf26 ${((( settings.systemScale ?? 1) - 0.5) / 1) * 100}%, rgba(255,255,255,0.12) ${(((settings.systemScale ?? 1) - 0.5) / 1) * 100}%, rgba(255,255,255,0.12) 100%)`,
            accentColor: "#f6bf26",
          }}
        />
        <div className="flex justify-between text-[9px] text-white/30 font-bold mt-0.5">
          <span>50%</span><span>100%</span><span>150%</span>
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────────── */
interface SidebarProps {}

export function Sidebar(_props: SidebarProps) {
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

  // ── Usuario actual (Supabase Auth) ──────────────────────────────
  const [user, setUser] = useState<{ name: string; avatar: string | null; role: string } | null>(null);
  const [dbSyncing, setDbSyncing] = useState(false);

  useEffect(() => {
    // Usa API route server-side — evita el problema de cookies httpOnly en browser client
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { name: string; avatar: string | null; role: string } | null) => {
        if (data) setUser(data);
      })
      .catch(() => {});

    // onAuthStateChange para detectar login/logout en tiempo real
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetch("/api/auth/me")
          .then((r) => r.json())
          .then((data: { name: string; avatar: string | null; role: string } | null) => {
            if (data) setUser(data);
          })
          .catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleDbSync() {
    setDbSyncing(true);
    try {
      const res = await fetch("/api/google-sheets/sync", { method: "POST" });
      const data = await res.json() as { status: string; summary?: { created: number; updated: number } };
      const msg = data.status === "success" || data.status === "partial"
        ? `Sync OK — ${data.summary?.created ?? 0} nuevos, ${data.summary?.updated ?? 0} actualizados`
        : "Error en el sync";
      // Reutiliza el sistema de notificaciones existente
      const { useAppSettings: s } = await import("@/store/app-settings");
      s.getState().addNotification(msg);
    } catch {
      const { useAppSettings: s } = await import("@/store/app-settings");
      s.getState().addNotification("Error al conectar con el sync");
    } finally {
      setDbSyncing(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }

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

          {/* ── Usuario / Auth ───────────────────────────────────── */}
          <div className="mx-3 my-1 border-b border-white/[0.06]" />

          {user ? (
            <>
              {/* Avatar + nombre + cerrar sesión */}
              <div className="flex items-center gap-2.5 px-3 py-2 overflow-hidden">
                <span className="flex-shrink-0 min-w-[20px] flex items-center justify-center">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-[20px] h-[20px] rounded-full object-cover" />
                  ) : (
                    <div className="w-[20px] h-[20px] rounded-full bg-amber/30 flex items-center justify-center text-[9px] font-black text-amber">
                      {user.name[0].toUpperCase()}
                    </div>
                  )}
                </span>
                <span className={`text-[11px] text-white/60 font-semibold truncate flex-1 ${lbl}`}>
                  {user.name}
                </span>
              </div>

              {/* Cerrar sesión — botón propio */}
              <button
                className="flex items-center gap-2.5 px-3 py-2 w-full border-none bg-transparent cursor-pointer text-[11px] font-semibold text-white/40 hover:text-red-400 hover:bg-red-400/[0.06] transition-colors whitespace-nowrap"
                onClick={handleLogout}
                title="Cerrar sesión"
              >
                <span className="flex-shrink-0 min-w-[20px] flex items-center justify-center">
                  <LogOut size={15} />
                </span>
                <span className={lbl}>Cerrar sesión</span>
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="flex items-center gap-2.5 px-3 py-2 w-full text-[11px] font-semibold text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors whitespace-nowrap no-underline"
            >
              <span className="flex-shrink-0 min-w-[20px] flex items-center justify-center">
                <LogIn size={17} />
              </span>
              <span className={lbl}>Iniciar sesión</span>
            </Link>
          )}

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
