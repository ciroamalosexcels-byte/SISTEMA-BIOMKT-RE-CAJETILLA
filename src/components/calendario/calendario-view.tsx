"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLeadsStore } from "@/store/leads";
import { useContentEventsStore } from "@/store/content-events";
import { useAppSettings } from "@/store/app-settings";
import { currentMonthBA, todayBA } from "@/lib/dates";
import type { Lead, ManagementEvent } from "@/types";

/* ─── helpers ──────────────────────────────────────────────────────────── */

function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}
interface GridCell { date: string; inMonth: boolean; }

function buildGrid(month: string): GridCell[] {
  const [y, mo] = month.split("-").map(Number);
  const firstDay   = new Date(y, mo - 1, 1).getDay();
  const daysInMonth = new Date(y, mo, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  // días del mes anterior
  const prevDate = new Date(y, mo - 2, 1);
  const prevY  = prevDate.getFullYear();
  const prevMo = prevDate.getMonth() + 1;
  const daysInPrev = new Date(prevY, prevMo, 0).getDate();

  const cells: GridCell[] = [];
  for (let i = startOffset - 1; i >= 0; i--)
    cells.push({ date: `${prevY}-${String(prevMo).padStart(2, "0")}-${String(daysInPrev - i).padStart(2, "0")}`, inMonth: false });

  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: `${month}-${String(d).padStart(2, "0")}`, inMonth: true });

  // días del mes siguiente hasta completar la última fila
  const nextDate = new Date(y, mo, 1);
  const nextY  = nextDate.getFullYear();
  const nextMo = nextDate.getMonth() + 1;
  let nextD = 1;
  while (cells.length % 7 !== 0)
    cells.push({ date: `${nextY}-${String(nextMo).padStart(2, "0")}-${String(nextD++).padStart(2, "0")}`, inMonth: false });

  return cells;
}
function dateOnly(dt?: string) { return dt ? dt.slice(0, 10) : ""; }
function timeOnly(dt?: string) { return dt && dt.length >= 16 ? dt.slice(11, 16) : ""; }

/* ─── colores por tipo ─────────────────────────────────────────────────── */

type LeadEventKind = "REUNION_1" | "REUNION_2" | "SEGUIMIENTO";

interface LeadCalEvent { kind: LeadEventKind; lead: Lead; date: string; time: string; }

const KIND_LABEL: Record<LeadEventKind, string> = {
  REUNION_1:   "Reu 1",
  REUNION_2:   "Reu 2",
  SEGUIMIENTO: "Seg",
};
const KIND_COLOR: Record<LeadEventKind, string> = {
  REUNION_1:   "#f97316",  // naranja
  REUNION_2:   "#eab308",  // amarillo
  SEGUIMIENTO: "#ef4444",  // rojo
};
const PROD_COLOR = "#16a34a"; // verde

function routeForKind(kind: LeadEventKind): string {
  if (kind === "REUNION_1") return "/reunion/1";
  if (kind === "REUNION_2") return "/reunion/2";
  return "/seguimiento";
}

/* ─── Day modal ─────────────────────────────────────────────────────────── */

function DayModal({
  date,
  leadEvents,
  prodEvents,
  clientMap,
  onNavigateToLead,
  onClose,
}: {
  date: string;
  leadEvents: LeadCalEvent[];
  prodEvents: ManagementEvent[];
  clientMap: Record<string, string>;
  onNavigateToLead: (lead: Lead, kind: LeadEventKind) => void;
  onClose: () => void;
}) {
  const [y, m, d] = date.split("-");
  const displayDate = `${parseInt(d)} / ${m} / ${y}`;
  const total = leadEvents.length + prodEvents.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-[20px] shadow-2xl w-full max-w-lg p-0 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-[15px] font-black text-[var(--dark)]">{displayDate}</h3>
            {total > 0 && (
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                {total} evento{total !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-[18px] font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">

          {/* Reuniones y seguimientos */}
          {leadEvents.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Reuniones y seguimientos
              </p>
              <div className="flex flex-col gap-2">
                {leadEvents.map((le) => (
                  <div
                    key={`${le.lead.id}-${le.kind}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:brightness-95 transition-all"
                    style={{
                      background: KIND_COLOR[le.kind] + "12",
                      border: `1.5px solid ${KIND_COLOR[le.kind]}35`,
                    }}
                    onClick={() => onNavigateToLead(le.lead, le.kind)}
                    title="Ir al contacto"
                  >
                    <span
                      className="text-[9px] font-black px-2 py-0.5 rounded-md text-white flex-shrink-0"
                      style={{ background: KIND_COLOR[le.kind] }}
                    >
                      {KIND_LABEL[le.kind].toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[var(--dark)] truncate leading-tight">
                        {le.lead.nombre || le.lead.empresa || "Sin nombre"}
                      </p>
                      {le.lead.empresa && le.lead.nombre && (
                        <p className="text-[11px] text-slate-400 font-semibold truncate leading-tight">
                          {le.lead.empresa}
                        </p>
                      )}
                    </div>
                    {le.time && (
                      <span className="text-[12px] font-black flex-shrink-0" style={{ color: KIND_COLOR[le.kind] }}>
                        {le.time}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Producción */}
          {prodEvents.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Producción
              </p>
              <div className="flex flex-col gap-2">
                {prodEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: PROD_COLOR + "12", border: `1.5px solid ${PROD_COLOR}35` }}
                  >
                    <span
                      className="text-[9px] font-black px-2 py-0.5 rounded-md text-white flex-shrink-0"
                      style={{ background: PROD_COLOR }}
                    >
                      PROD
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[var(--dark)] truncate leading-tight">
                        {ev.title || "Sin título"}
                      </p>
                      {clientMap[ev.clientId] && (
                        <p className="text-[11px] text-slate-400 font-semibold truncate leading-tight">
                          {clientMap[ev.clientId]}
                        </p>
                      )}
                    </div>
                    {ev.datetime?.slice(11, 16) && (
                      <span className="text-[12px] font-black flex-shrink-0" style={{ color: PROD_COLOR }}>
                        {ev.datetime.slice(11, 16)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {total === 0 && (
            <p className="text-[12px] text-slate-300 font-semibold text-center py-4">
              Sin eventos para este día
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--dark)] text-white text-[12px] font-bold hover:-translate-y-px transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main view ─────────────────────────────────────────────────────────── */

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const LEGEND: { label: string; color: string }[] = [
  { label: "Reu 1",      color: KIND_COLOR.REUNION_1   },
  { label: "Reu 2",      color: KIND_COLOR.REUNION_2   },
  { label: "Seguimiento",color: KIND_COLOR.SEGUIMIENTO },
  { label: "Producción", color: PROD_COLOR             },
];

export function CalendarioView() {
  const rows = useLeadsStore((s) => s.rows);
  const setHighlightLeadId = useLeadsStore((s) => s.setHighlightLeadId);
  const { settings, update } = useAppSettings();
  const { contentEvents, managementEvents } = useContentEventsStore();
  const router = useRouter();

  const [selectedMonth, setSelectedMonth] = useState(
    () => settings.calendarViewMonth || currentMonthBA()
  );
  const [openDay, setOpenDay] = useState<string | null>(null);

  const today = todayBA();

  const clients = useMemo(() => rows.filter((r) => r.tab === "CLIENTES"), [rows]);
  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c.empresa || c.nombre || c.id])),
    [clients]
  );

  /* Leads agrupados por día */
  const leadsByDay = useMemo(() => {
    const map: Record<string, LeadCalEvent[]> = {};
    function add(lead: Lead, kind: LeadEventKind, dt?: string) {
      const date = dateOnly(dt);
      if (!date) return;
      if (!map[date]) map[date] = [];
      map[date].push({ kind, lead, date, time: timeOnly(dt) });
    }
    for (const lead of rows) {
      if ((lead.tab === "REUNION_1" || lead.tab === "REUNION_2") && lead.meetingDatetime)
        add(lead, lead.tab as "REUNION_1" | "REUNION_2", lead.meetingDatetime);
      if (lead.tab === "SEGUIMIENTO" && lead.proximoSeguimientoFecha)
        add(lead, "SEGUIMIENTO", lead.proximoSeguimientoFecha);
    }
    return map;
  }, [rows]);

  /* Producción agrupada por día (solo managementEvents de tipo "Producción") */
  const prodByDay = useMemo(() => {
    const map: Record<string, ManagementEvent[]> = {};
    for (const ev of managementEvents) {
      if (ev.type !== "Producción") continue;
      const d = dateOnly(ev.datetime);
      if (!d) continue;
      if (!map[d]) map[d] = [];
      map[d].push(ev);
    }
    return map;
  }, [managementEvents]);

  const grid = useMemo(() => buildGrid(selectedMonth), [selectedMonth]);

  function handleMonthChange(m: string) {
    setSelectedMonth(m);
    update({ calendarViewMonth: m });
  }

  const dayLeads = openDay ? (leadsByDay[openDay] ?? []) : [];
  const dayProd  = openDay ? (prodByDay[openDay]  ?? []) : [];

  function handleNavigateToLead(lead: Lead, kind: LeadEventKind) {
    setHighlightLeadId(lead.id);
    setOpenDay(null);
    router.push(routeForKind(kind));
  }

  return (
    <div className="global-calendar-wrap">
      {/* Header */}
      <div className="panel-head">
        <div className="panel-title-row">
          <h2 className="panel-title">CALENDARIO</h2>
          <div className="panel-subtitle">REUNIONES, SEGUIMIENTOS Y PRODUCCIÓN</div>
        </div>
        <div className="month-controls-actions">
          <button className="calendar-mini-btn" onClick={() => handleMonthChange(prevMonth(selectedMonth))}>‹</button>
          <div
            style={{
              color: "var(--dark)", background: "#f8fafc",
              border: "1px solid var(--slate-200)", borderRadius: 12,
              padding: "4px 16px", minWidth: 170, textAlign: "center" as const,
              fontSize: 13, fontWeight: 900,
            }}
          >
            {monthLabel(selectedMonth).toUpperCase()}
          </div>
          <button className="calendar-mini-btn" onClick={() => handleMonthChange(nextMonth(selectedMonth))}>›</button>
          <button className="month-current-btn" onClick={() => handleMonthChange(currentMonthBA())}>HOY</button>
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ display: "flex", gap: 16, padding: "10px 16px 4px", flexWrap: "wrap" as const, alignItems: "center" }}>
        {LEGEND.map(({ label, color }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#475569" }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: color, display: "inline-block", flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>

      {/* Grilla */}
      <div className="global-calendar-body">
        {/* Encabezado días */}
        <div className="grid grid-cols-7" style={{ background: "#000", borderRadius: "22px 22px 0 0", overflow: "hidden" }}>
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className="py-2 text-center text-[14px] font-black uppercase tracking-wide text-white"
              style={i < WEEKDAYS.length - 1 ? { borderRight: "1.5px solid rgba(255,255,255,0.35)" } : {}}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Celdas */}
        <div
          className="grid grid-cols-7 gap-[6px] p-[8px]"
          style={{ background: "linear-gradient(160deg, #f1f5f9 0%, #f8fafc 50%, #ffffff 100%)", borderRadius: "0 0 22px 22px" }}
        >
          {grid.map(({ date, inMonth }, idx) => {
            const isToday    = date === today;
            const leadEvs    = inMonth ? (leadsByDay[date] ?? []) : [];
            const prodEvs    = inMonth ? (prodByDay[date]  ?? []) : [];
            const totalCount = leadEvs.length + prodEvs.length;

            const chipsLead = leadEvs.slice(0, 3);
            const chipsProd = prodEvs.slice(0, Math.max(0, 3 - chipsLead.length));
            const overflow   = totalCount - chipsLead.length - chipsProd.length;

            return (
              <div
                key={idx}
                onClick={() => inMonth && setOpenDay(date)}
                className="p-2 cal-cell"
                style={{
                  minHeight: 115,
                  borderRadius: 14,
                  background: !inMonth ? "#f1f5f9" : isToday ? "#dbeafe" : "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
                  cursor: inMonth ? "pointer" : "default",
                  transition: "background 0.15s, box-shadow 0.15s",
                }}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <span className={[
                    "inline-flex w-7 h-7 items-center justify-center rounded-full text-[13px] font-black",
                    isToday ? "bg-[var(--dark)] text-white" : inMonth ? "text-slate-600" : "text-slate-400",
                  ].join(" ")}>
                    {parseInt(date.slice(8))}
                  </span>
                  {totalCount > 0 && (
                    <span className="text-[9px] font-black text-slate-300 mt-1">{totalCount}</span>
                  )}
                </div>

                {inMonth && (
                  <div className="flex flex-col gap-[3px]">
                    {chipsLead.map((le) => (
                      <div
                        key={`${le.lead.id}-${le.kind}`}
                        className="flex items-center gap-1 px-1.5 py-[3px] rounded-[8px] overflow-hidden"
                        style={{ background: KIND_COLOR[le.kind] + "18", borderLeft: `3px solid ${KIND_COLOR[le.kind]}` }}
                        title={`${KIND_LABEL[le.kind]}: ${le.lead.nombre || le.lead.empresa}${le.time ? " · " + le.time : ""}`}
                      >
                        <span className="flex-1 text-[11px] font-bold text-slate-700 truncate leading-tight">
                          {le.lead.nombre || le.lead.empresa}
                        </span>
                        {le.time && (
                          <span className="text-[10px] font-black flex-shrink-0 leading-tight" style={{ color: KIND_COLOR[le.kind] }}>
                            {le.time}
                          </span>
                        )}
                      </div>
                    ))}
                    {chipsProd.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center gap-1 px-1.5 py-[3px] rounded-[8px] overflow-hidden"
                        style={{ background: PROD_COLOR + "18", borderLeft: `3px solid ${PROD_COLOR}` }}
                        title={`Producción: ${ev.title}`}
                      >
                        <span className="flex-1 text-[11px] font-bold text-slate-700 truncate leading-tight">
                          {ev.title}
                        </span>
                        {ev.datetime?.slice(11, 16) && (
                          <span className="text-[10px] font-black flex-shrink-0 leading-tight" style={{ color: PROD_COLOR }}>
                            {ev.datetime.slice(11, 16)}
                          </span>
                        )}
                      </div>
                    ))}
                    {overflow > 0 && (
                      <span className="text-[10px] font-bold text-slate-400 px-1">+{overflow} más</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {openDay && (
        <DayModal
          date={openDay}
          leadEvents={dayLeads}
          prodEvents={dayProd}
          clientMap={clientMap}
          onNavigateToLead={handleNavigateToLead}
          onClose={() => setOpenDay(null)}
        />
      )}
    </div>
  );
}
