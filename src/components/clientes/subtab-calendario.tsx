"use client";

import { useState, useMemo } from "react";
import { useLeadsStore } from "@/store/leads";
import { useContentEventsStore } from "@/store/content-events";
import { baParts } from "@/lib/dates";
import type { ManagementEvent } from "@/types";

const MONTH_NAMES = [
  "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE",
];
const DAY_NAMES = ["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"];

function todayKey() {
  const { year, month } = baParts();
  return `${year}-${month}`;
}
function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[(m ?? 1) - 1]} DE ${y}`;
}

interface DayCell {
  date: string | null;
  events: ManagementEvent[];
  clientNames: Record<string, string>;
}

export function SubtabCalendarioGestion() {
  const [monthKey, setMonthKey] = useState(todayKey);
  const rows          = useLeadsStore((s) => s.rows);
  const mgmtEvents    = useContentEventsStore((s) => s.managementEvents);
  const toggleDone    = useContentEventsStore((s) => s.toggleManagementDone);

  /* client id → display name */
  const clientNames = useMemo(() => {
    const map: Record<string, string> = {};
    rows.forEach((r) => { map[r.id] = r.empresa || r.nombre || r.id; });
    return map;
  }, [rows]);

  /* Build calendar grid */
  const grid = useMemo<DayCell[]>(() => {
    const [y, m] = monthKey.split("-").map(Number);
    const firstDay = new Date(y, (m ?? 1) - 1, 1);
    const totalDays = new Date(y, m, 0).getDate();
    /* Mon=0 … Sun=6 */
    const startDow = (firstDay.getDay() + 6) % 7;

    const cells: DayCell[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ date: null, events: [], clientNames: {} });

    for (let d = 1; d <= totalDays; d++) {
      const date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayEvents = mgmtEvents.filter(
        (e) => (e.datetime ?? "").startsWith(date)
      );
      cells.push({ date, events: dayEvents, clientNames });
    }

    /* Pad to full rows of 7 */
    while (cells.length % 7 !== 0) cells.push({ date: null, events: [], clientNames: {} });
    return cells;
  }, [monthKey, mgmtEvents, clientNames]);

  const todayDate = (() => {
    const { year, month: mo, day } = baParts();
    return `${year}-${mo}-${day}`;
  })();

  return (
    <section className="mgmt-cal-panel">
      <div className="panel-head">
        <div className="panel-title-row">
          <h2 className="panel-title">CALENDARIO</h2>
          <div className="panel-subtitle">EVENTOS DE GESTIÓN DE CLIENTES</div>
        </div>
        <div className="month-controls-actions">
          <button className="calendar-mini-btn" type="button" onClick={() => setMonthKey((k) => shiftMonth(k, -1))}>‹</button>
          <div className="calendar-month-label-v11">{monthLabel(monthKey)}</div>
          <button className="calendar-mini-btn" type="button" onClick={() => setMonthKey((k) => shiftMonth(k, 1))}>›</button>
          <button className="month-current-btn" type="button" onClick={() => setMonthKey(todayKey())}>MES ACTUAL</button>
        </div>
      </div>

      <div className="mgmt-cal-body">
        {/* Day headers */}
        <div className="mgmt-cal-grid">
          {DAY_NAMES.map((d) => (
            <div key={d} className="day-name-v11" style={{ background: "var(--dark)", color: "#fff", textAlign: "center" }}>{d}</div>
          ))}
          {grid.map((cell, i) => (
            <div
              key={i}
              className={`day-v11${cell.date === todayDate ? " day-today-v11" : ""}${!cell.date ? " day-empty-v11" : ""}`}
            >
              {cell.date && (
                <>
                  <div className="day-number-v11">{Number(cell.date.slice(8))}</div>
                  {cell.events.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      className={`event-chip-v11 mgmt-chip${ev.done ? " done" : ""}`}
                      onClick={() => toggleDone(ev.id)}
                      title={`${clientNames[ev.clientId] ?? ev.clientId} · ${ev.type || "Evento"}`}
                    >
                      {clientNames[ev.clientId] ?? "?"} · {ev.title || ev.type || "Evento"}
                    </button>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
