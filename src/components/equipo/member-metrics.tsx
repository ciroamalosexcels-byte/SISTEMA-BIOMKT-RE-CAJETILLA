"use client";

import { useState, useMemo } from "react";
import { baParts } from "@/lib/dates";
import type { Lead } from "@/types";

type Tab = "CRM" | "REUNION_1" | "REUNION_2" | "SEGUIMIENTO" | "CLIENTES" | "BASE";

const MONTH_NAMES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[(m ?? 1) - 1]} DE ${y}`;
}
function monthShort(key: string) {
  const [, m] = key.split("-").map(Number);
  return MONTH_NAMES[(m ?? 1) - 1] ?? "";
}
function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function todayMonthKey() {
  const { year, month } = baParts();
  return `${year}-${month}`;
}
function daysInMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function groupByDay(rows: Lead[], nombre: string, tabs: Tab[], monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const count: Record<string, number> = {};
  for (const row of rows) {
    if (row.responsable1 !== nombre && row.responsable2 !== nombre) continue;
    if (!tabs.includes(row.tab as Tab)) continue;
    const dateKey = (row.fechaContacto ?? "").slice(0, 10);
    if (!dateKey) continue;
    const [ry, rm] = dateKey.split("-").map(Number);
    if (ry !== year || rm !== month) continue;
    count[dateKey] = (count[dateKey] ?? 0) + 1;
  }
  const days = daysInMonth(monthKey);
  return Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const dk = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { label: String(day).padStart(2, "0"), value: count[dk] ?? 0 };
  });
}

function BarChart({ title, data, color }: { title: string; data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const chartH = 160;
  return (
    <article className="stat-wide" style={{ "--days": data.length } as React.CSSProperties}>
      <h3 className="stat-wide-title">{title}</h3>
      <div className="month-chart-wide">
        <div className="bars-area-wide" style={{ minHeight: chartH }}>
          {data.map((d, i) => {
            const h = Math.max(5, Math.round((d.value / max) * (chartH - 25)));
            return (
              <div key={i} className="bar-wrap-wide">
                <div className="bar-val-wide">{d.value}</div>
                <div className="bar-wide" style={{ height: h, background: color, borderRadius: "999px 999px 2px 2px" }} />
              </div>
            );
          })}
        </div>
        <div className="days-row-wide">
          {data.map((d, i) => (
            <div key={i} className="day-label-wide">{d.label}</div>
          ))}
        </div>
      </div>
    </article>
  );
}

interface Props {
  nombre: string;
  rows: Lead[];
}

export function MemberMetricsCharts({ nombre, rows }: Props) {
  const [monthKey, setMonthKey] = useState(todayMonthKey);

  const contactos = useMemo(
    () => groupByDay(rows, nombre, ["CRM", "REUNION_1", "REUNION_2", "SEGUIMIENTO", "CLIENTES"], monthKey),
    [rows, nombre, monthKey]
  );
  const reuniones = useMemo(
    () => groupByDay(rows, nombre, ["REUNION_1", "REUNION_2"], monthKey),
    [rows, nombre, monthKey]
  );
  const cierres = useMemo(
    () => groupByDay(rows, nombre, ["CLIENTES"], monthKey),
    [rows, nombre, monthKey]
  );

  const label = monthLabel(monthKey);
  const short = monthShort(monthKey);

  return (
    <div className="team-clone-charts-v23">
      <div className="month-controls-panel">
        <h3>MÉTRICAS DE {nombre} · {label}</h3>
        <div className="month-controls-actions">
          <button className="calendar-mini-btn" type="button" onClick={() => setMonthKey((k) => shiftMonth(k, -1))}>‹</button>
          <div className="calendar-month-label-v11">{label}</div>
          <button className="calendar-mini-btn" type="button" onClick={() => setMonthKey((k) => shiftMonth(k, 1))}>›</button>
          <button className="month-current-btn" type="button" onClick={() => setMonthKey(todayMonthKey())}>MES ACTUAL</button>
        </div>
      </div>
      <div className="charts-grid" style={{ marginTop: 14 }}>
        <BarChart title={`Contactos de ${short}`} data={contactos} color="#38bdf8" />
        <BarChart title={`Reuniones de ${short}`} data={reuniones} color="#f6bf26" />
        <BarChart title={`Clientes cerrados de ${short}`} data={cierres} color="#10254b" />
      </div>
    </div>
  );
}
