"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { useAppSettings } from "@/store/app-settings";
import { useLeadsStore } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { useContentEventsStore } from "@/store/content-events";
import { fetchFromSheets } from "@/lib/sheets";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const loadSettings = useAppSettings((s) => s.load);
  const updateSettings = useAppSettings((s) => s.update);
  const settings = useAppSettings((s) => s.settings);

  const { load: loadLeads, rows } = useLeadsStore();
  const loadTeam = useTeamStore((s) => s.load);
  const setLeadsFromSheets = useLeadsStore((s) => s.load);
  const loadEvents = useContentEventsStore((s) => s.load);

  useEffect(() => {
    // 1. Load from localStorage first (instant)
    loadSettings();
    loadLeads();
    loadTeam();
    loadEvents();

    // 2. Fetch from Sheets (source of truth)
    fetchFromSheets()
      .then((data) => {
        if (data.rows) {
          useLeadsStore.setState({ rows: data.rows, dirty: false });
          import("@/lib/storage").then(({ storage }) => storage.setLeads(data.rows!));
        }
        if (data.team) {
          useTeamStore.setState({ members: data.team });
          import("@/lib/storage").then(({ storage }) => storage.setTeam(data.team!));
        }
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Sheets fetch failed, using localStorage cache:", err);
        setStatus("ready"); // localStorage data is still usable
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="max-w-[1800px] mx-auto px-[18px] py-[14px] pb-[22px] flex flex-col gap-4 min-h-screen"
      style={{ zoom: `${settings.systemScale}` }}
    >
      <header className="flex items-start justify-between gap-4">
        <h1 className="text-[clamp(30px,4vw,46px)] font-black tracking-[-0.05em] leading-[0.95] text-[var(--dark)] whitespace-nowrap mt-1.5">
          Ventas Biomarketing
        </h1>
        {status === "loading" && (
          <span className="text-xs font-bold text-slate-400 mt-2 animate-pulse">
            Cargando desde Sheets…
          </span>
        )}
      </header>
      <Sidebar />
      {children}
    </div>
  );
}
