"use client";

import { useState, useMemo } from "react";
import { useLeadsStore } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { useAppSettings } from "@/store/app-settings";
import { todayBA, currentMonthBA } from "@/lib/dates";
import { ReactApexChart } from "@/components/ui/apex-chart";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import type { Lead } from "@/types";
import type { ApexOptions } from "apexcharts";

// ── Helpers ───────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");

const MONTH_NAMES = [
  "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE",
];

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return `${MONTH_NAMES[mo - 1]} DE ${y}`;
}
function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function countByMember(rows: Lead[], member: string) {
  return rows.filter((r) => r.responsable1 === member || r.responsable2 === member).length;
}
function pctColor(pct: number) {
  if (pct >= 120) return "#22c55e";
  if (pct >= 100) return "#16a34a";
  if (pct >= 70)  return "#f59e0b";
  return "#ef4444";
}

// ── KPI Card con sparkline ────────────────────────────────────────────
function KpiCard({
  label, value, trend, series, color, dark,
}: {
  label: string; value: number; trend: number; series: number[];
  color: string; dark: boolean;
}) {
  const sparkOpts: ApexOptions = {
    chart: {
      type: "area",
      sparkline: { enabled: true },
      background: "transparent",
      animations: { enabled: true, speed: 600 },
    },
    stroke: { curve: "smooth", width: 2.5 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.02,
        stops: [0, 100],
      },
    },
    colors: [color],
    tooltip: {
      fixed: { enabled: false },
      x: { show: false },
      y: { formatter: (v: number) => String(v) },
      theme: dark ? "dark" : "light",
      marker: { show: false },
    },
    theme: { mode: dark ? "dark" : "light" },
  };

  return (
    <div className="bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.06] rounded-[18px] overflow-hidden">
      <div className="flex items-start justify-between px-[18px] pt-5 pb-3">
        <div>
          <div className="text-[10px] font-black text-slate-400 dark:text-[#1e3a5f] uppercase tracking-[0.1em] mb-1.5">{label}</div>
          <div className="text-4xl font-black leading-none [font-variant-numeric:tabular-nums]" style={{ color }}>{value.toLocaleString("es-AR")}</div>
        </div>
        <div className={`text-[11px] font-black px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${trend >= 0 ? "bg-green-100 dark:bg-green-500/[0.1] text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-500/[0.1] text-red-700 dark:text-red-400"}`}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
        </div>
      </div>
      <div className="-mx-0">
        <ReactApexChart
          type="area"
          series={[{ data: series }]}
          options={sparkOpts}
          height={70}
        />
      </div>
    </div>
  );
}

// ── Color de barra según % de cumplimiento del objetivo ──────────────
function perfColor(contacts: number, goal: number): string {
  if (goal <= 0) return "#94a3b8";
  const pct = (contacts / goal) * 100;
  if (pct >= 161) return "#a3e635"; // lima
  if (pct >= 100) return "#16a34a"; // verde oscuro
  if (pct >= 70)  return "#f59e0b"; // amarillo
  return "#ef4444";                   // rojo
}

// ── Reporte Diario — barras distribuidas + línea de objetivo ─────────
function DailyReportChart({
  memberNames, contactados, objetivos, setGoal, today, dark,
}: {
  memberNames: string[];
  contactados: number[];
  objetivos: number[];
  setGoal: (name: string, val: number) => void;
  today: string;
  dark: boolean;
}) {
  const dateLabel = today.split("-").reverse().slice(0, 2).join("/");

  /* Un color por barra según performance */
  const barColors = memberNames.map((_, i) => perfColor(contactados[i], objetivos[i]));
  const markerColor = dark ? "#475569" : "#94a3b8";

  const opts: ApexOptions = {
    chart: {
      type: "bar",
      background: "transparent",
      toolbar: { show: false },
      animations: { enabled: true, speed: 600 },
    },
    theme: { mode: dark ? "dark" : "light" },
    colors: barColors,
    plotOptions: {
      bar: {
        distributed: true,
        borderRadius: 8,
        borderRadiusApplication: "end" as const,
        columnWidth: "55%",
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "12px",
        fontWeight: "900",
        fontFamily: "Poppins, sans-serif",
      },
      formatter: (val: number) => (val > 0 ? String(val) : ""),
      background: { enabled: false },
      dropShadow: { enabled: false },
    },
    /* Marcadores de objetivo por miembro — sin línea */
    annotations: {
      points: memberNames.map((name, i) => ({
        x: name,
        y: objetivos[i],
        marker: {
          size: 5,
          fillColor: markerColor,
          strokeColor: markerColor,
          strokeWidth: 2,
          shape: "rect" as const,
        },
        label: {
          text: `obj: ${objetivos[i]}`,
          borderColor: "transparent",
          style: {
            background: "transparent",
            color: markerColor,
            fontSize: "9px",
            fontWeight: "700",
            fontFamily: "Poppins, sans-serif",
          },
          offsetY: -4,
        },
      })),
    },
    xaxis: {
      categories: memberNames,
      labels: {
        style: {
          fontSize: "11px",
          fontFamily: "Poppins, sans-serif",
          colors: Array(memberNames.length).fill(dark ? "#4b6a8a" : "#94a3b8"),
          fontWeight: "700",
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      max: (computed: number) => Math.max(computed + 1, 10),
      tickAmount: 5,
      labels: {
        style: {
          fontSize: "10px",
          fontFamily: "Poppins, sans-serif",
          colors: dark ? "#334155" : "#94a3b8",
          fontWeight: "700",
        },
      },
    },
    grid: {
      borderColor: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
      strokeDashArray: 3,
      padding: { top: -10, bottom: 0 },
    },
    legend: { show: false },
    tooltip: {
      theme: dark ? "dark" : "light",
      y: {
        formatter: (val: number, opts?: { dataPointIndex?: number }) => {
          const idx = opts?.dataPointIndex ?? 0;
          const goal = objetivos[idx] ?? 0;
          if (goal <= 0) return `${val} contactados`;
          const pct = Math.round((val / goal) * 100);
          return `${val} — ${pct}% del obj. (${goal})`;
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.06] rounded-[18px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-[#111827]">
        <span className="text-[10px] font-black text-white uppercase tracking-[0.12em]">
          REPORTE DIARIO — {dateLabel}
        </span>
        <div className="flex items-center gap-3 text-[9px] font-bold text-white/[0.45] uppercase tracking-[0.06em]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444] inline-block" />0–69%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f59e0b] inline-block" />70–99%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#16a34a] inline-block" />100–160%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#a3e635] inline-block" />161%+</span>
        </div>
      </div>

      <ReactApexChart
        type="bar"
        series={[{ name: "Contactados", data: contactados }]}
        options={opts}
        height={220}
      />

      {/* Fila editable de objetivos */}
      <div className="px-5 py-3 border-t border-slate-100 dark:border-white/[0.04] flex items-center gap-3 flex-wrap">
        <span className="text-[9px] font-black text-slate-400 dark:text-[#1e3a5f] uppercase tracking-[0.08em] flex-shrink-0">
          Objetivo diario:
        </span>
        {memberNames.map((name, i) => (
          <div key={name} className="flex items-center gap-1">
            <span
              className="text-[9px] font-bold"
              style={{ color: perfColor(contactados[i], objetivos[i]) }}
            >
              {name}
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={objetivos[i] || ""}
              className="w-9 h-6 text-center text-[11px] font-black bg-amber/[0.08] dark:bg-amber/[0.06] border border-amber/[0.25] dark:border-amber/[0.2] rounded outline-none text-amber-3 dark:text-amber focus:bg-amber/[0.15] transition-colors"
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n)) setGoal(name, n);
                else if (e.target.value === "") setGoal(name, 0);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main area chart (bienvenida) ──────────────────────────────────────
function WelcomeAreaChart({
  categories, contactos, reuniones, cierres, title, dark,
}: {
  categories: string[]; contactos: number[]; reuniones: number[];
  cierres: number[]; title: string; dark: boolean;
}) {
  const opts: ApexOptions = {
    chart: {
      type: "area",
      background: "transparent",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 800 },
    },
    theme: { mode: dark ? "dark" : "light" },
    colors: ["#f6bf26", "#3b82f6", "#22c55e"],
    stroke: { curve: "smooth", width: 2.5 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.2,
        opacityTo: 0.01,
        stops: [0, 100],
      },
    },
    dataLabels: { enabled: false },
    markers: { size: 0, hover: { size: 5 } },
    xaxis: {
      categories,
      labels: {
        style: {
          fontSize: "9px",
          fontFamily: "Poppins, sans-serif",
          colors: dark ? "#334155" : "#94a3b8",
          fontWeight: 700,
        },
        rotate: 0,
        hideOverlappingLabels: false,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: categories.length,
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "10px",
          fontFamily: "Poppins, sans-serif",
          colors: dark ? "#334155" : "#94a3b8",
          fontWeight: 700,
        },
      },
    },
    grid: {
      borderColor: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
      strokeDashArray: 3,
      padding: { left: 0, right: 0, top: -10, bottom: 0 },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontFamily: "Poppins, sans-serif",
      fontSize: "11px",
      fontWeight: 700,
      labels: { colors: dark ? "#64748b" : "#94a3b8" },
      markers: { size: 5 },
    },
    tooltip: {
      theme: dark ? "dark" : "light",
      shared: true,
      intersect: false,
      x: { formatter: (v: string | number) => `Día ${v}` },
    },
  };

  return (
    <div className="bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.06] rounded-[18px] overflow-hidden">
      {/* Header negro */}
      <div className="px-5 py-2.5 bg-[#111827]">
        <span className="text-[10px] font-black text-white uppercase tracking-[0.12em]">{title}</span>
      </div>
      <div className="p-5 pb-3">
      <ReactApexChart
        type="area"
        series={[
          { name: "Contactos", data: contactos },
          { name: "Reuniones", data: reuniones },
          { name: "Cierres",   data: cierres },
        ]}
        options={opts}
        height={220}
      />
      </div>
    </div>
  );
}

// ── Bar chart por métrica ─────────────────────────────────────────────
function MetricBarChart({
  title, data, color, dark,
}: {
  title: string; data: { label: string; value: number }[];
  color: string; dark: boolean;
}) {
  const opts: ApexOptions = {
    chart: {
      type: "bar",
      background: "transparent",
      toolbar: { show: false },
      animations: { enabled: true, speed: 600 },
    },
    theme: { mode: dark ? "dark" : "light" },
    colors: [color],
    plotOptions: {
      bar: {
        borderRadius: 3,
        columnWidth: "70%",
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: data.map((d) => d.label),
      labels: {
        show: true,
        style: {
          fontSize: "8px",
          fontFamily: "Poppins, sans-serif",
          colors: dark ? "#1e3a5f" : "#cbd5e1",
          fontWeight: 700,
        },
        formatter: (v: string) => {
          const n = parseInt(v);
          return n === 1 || n % 5 === 0 ? v : "";
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { show: false } },
    grid: { show: false, padding: { left: -10, right: -10, top: -15, bottom: 0 } },
    tooltip: {
      theme: dark ? "dark" : "light",
      x: { formatter: (v: string | number) => `Día ${v}` },
      y: { formatter: (v: number) => String(v) },
    },
  };

  return (
    <div className="bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.06] rounded-[18px] p-4 pb-1">
      <div className="text-[10px] font-black text-slate-400 dark:text-[#1e3a5f] uppercase tracking-[0.1em] mb-0.5">{title}</div>
      <ReactApexChart
        type="bar"
        series={[{ data: data.map((d) => d.value) }]}
        options={opts}
        height={140}
      />
    </div>
  );
}

// ── shadcn Table para datos ───────────────────────────────────────────
interface BoxRow {
  label: string;
  values: number[];
  accent?: boolean;
  editable?: boolean;
  onEdit?: (i: number, v: number) => void;
  valueColors?: string[];
}

function DashTable({
  title, subtitle, members, rows: tableRows, memberDots, totalDot,
}: {
  title: string; subtitle?: string; members: string[]; rows: BoxRow[];
  memberDots?: string[]; totalDot?: string;
}) {
  const fs = useAppSettings((s) => s.settings.dashboardFontSize) || 16;
  return (
    <div className="bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.06] rounded-[18px] overflow-hidden">
      <div className="flex items-center justify-between px-[18px] py-[10px] bg-[#07152f]">
        <span className="text-[10px] font-black text-amber tracking-[0.12em] uppercase">{title}</span>
        {subtitle && <span className="text-[9px] font-bold text-white/[0.22] tracking-[0.08em] uppercase whitespace-nowrap">{subtitle}</span>}
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-[#07152f] border-b-0 hover:bg-[#07152f]">
            <TableHead className="text-left bg-amber text-bio-dark min-w-[160px] border-r-black/[0.12]">MÉTRICA</TableHead>
            {members.map((m, i) => (
              <TableHead key={m} className="bg-[#111827]">
                {memberDots?.[i] && <span className="inline-block w-[7px] h-[7px] rounded-full mr-1.5 align-middle" style={{ background: memberDots[i] }} />}
                {m}
              </TableHead>
            ))}
            <TableHead className="bg-[#111827]">
              {totalDot && <span className="inline-block w-[7px] h-[7px] rounded-full mr-1.5 align-middle" style={{ background: totalDot }} />}
              TOTAL
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableRows.map((row) => {
            const total = row.values.reduce((a, b) => a + b, 0);
            return (
              <TableRow key={row.label}>
                <TableCell
                  className="text-left border-r-0 px-4 whitespace-normal leading-tight"
                  style={{ background: "#111827", color: "#f1f5f9", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "Poppins, sans-serif", }}
                >
                  {row.label}
                </TableCell>
                {row.values.map((v, i) => (
                  <TableCell key={i} className={row.accent ? "bg-amber/[0.08] dark:bg-amber/[0.06]" : ""}>
                    {row.editable ? (
                      <input
                        type="text" inputMode="numeric" value={v || ""}
                        className="font-black bg-transparent border-none outline-none text-center cursor-text w-14 [font-variant-numeric:tabular-nums] text-amber-3"
                        style={{ fontSize: fs }}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (!isNaN(n) && row.onEdit) row.onEdit(i, n);
                          else if (e.target.value === "" && row.onEdit) row.onEdit(i, 0);
                        }}
                      />
                    ) : (
                      <span
                        className="font-black [font-variant-numeric:tabular-nums] text-slate-900 dark:text-slate-200"
                        style={{ ...(row.valueColors?.[i] ? { color: row.valueColors[i] } : {}), fontSize: fs }}
                      >
                        {v}
                      </span>
                    )}
                  </TableCell>
                ))}
                <TableCell className={row.accent ? "bg-amber/[0.08] dark:bg-amber/[0.06]" : ""}>
                  <span className="font-black [font-variant-numeric:tabular-nums] text-slate-900 dark:text-slate-200" style={{ fontSize: fs }}>{total}</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Dashboard View ────────────────────────────────────────────────────
export function DashboardView() {
  const rows = useLeadsStore((s) => s.rows);
  const members = useTeamStore((s) => s.members);
  const settings = useAppSettings((s) => s.settings);
  const updateSettings = useAppSettings((s) => s.update);

  const today = todayBA();
  const currentYear = today.slice(0, 4);
  const [selectedMonth, setSelectedMonth] = useState(
    settings.calendarViewMonth || currentMonthBA()
  );

  const dark = settings.darkMode ?? false;
  const memberNames = members.map((m) => m.nombre);

  const dailyGoals = settings.dailyGoals ?? {};
  const getGoal = (name: string) => dailyGoals[name] ?? 9;
  const setGoal = (name: string, val: number) =>
    updateSettings({ dailyGoals: { ...dailyGoals, [name]: val } });

  const todayRows  = rows.filter((r) => r.fechaContacto?.startsWith(today));
  const yearRows   = rows.filter((r) => r.fechaContacto?.startsWith(currentYear));
  const monthRows  = rows.filter((r) => r.fechaContacto?.startsWith(selectedMonth));

  const isR1R2 = (r: Lead) => r.tab === "REUNION_1" || r.tab === "REUNION_2";
  const isCli  = (r: Lead) => r.tab === "CLIENTES";

  const handleMonth = (m: string) => {
    setSelectedMonth(m);
    updateSettings({ calendarViewMonth: m });
  };

  const [y, mo] = selectedMonth.split("-").map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();

  // ── Daily series for current month ──
  const dailySeries = useMemo(() => (
    Array.from({ length: daysInMonth }, (_, i) => {
      const dk = `${selectedMonth}-${pad(i + 1)}`;
      const dr = rows.filter((r) => r.fechaContacto?.startsWith(dk));
      return {
        label: String(i + 1),
        contactos: dr.length,
        reuniones: dr.filter(isR1R2).length,
        clientes:  dr.filter(isCli).length,
      };
    })
  ), [rows, selectedMonth, daysInMonth]); // eslint-disable-line

  // ── Last month for trend ──
  const lastMonth = shiftMonth(selectedMonth, -1);
  const lastMonthRows = rows.filter((r) => r.fechaContacto?.startsWith(lastMonth));

  const monthContacts  = monthRows.length;
  const monthMeetings  = monthRows.filter(isR1R2).length;
  const monthClosings  = monthRows.filter(isCli).length;
  const lastContacts   = lastMonthRows.length;
  const lastMeetings   = lastMonthRows.filter(isR1R2).length;
  const lastClosings   = lastMonthRows.filter(isCli).length;

  const trend = (cur: number, prev: number) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0;

  // ── Member performance ──
  const memberDots = memberNames.map((n) => {
    const c = countByMember(todayRows, n);
    const g = getGoal(n);
    return pctColor(g > 0 ? (c / g) * 100 : 0);
  });
  const contactColors = memberDots; // same colors for the number cells

  const totalTodayC = memberNames.reduce((s, n) => s + countByMember(todayRows, n), 0);
  const totalGoal   = memberNames.reduce((s, n) => s + getGoal(n), 0);
  const totalDot    = pctColor(totalGoal > 0 ? (totalTodayC / totalGoal) * 100 : 0);

  function dayData(filter: (r: Lead) => boolean) {
    return dailySeries.map((d) => ({
      label: d.label,
      value: rows.filter((r) => r.fechaContacto?.startsWith(`${selectedMonth}-${pad(parseInt(d.label))}`) && filter(r)).length,
    }));
  }

  const monthShort = MONTH_NAMES[mo - 1]?.slice(0, 3) ?? "";
  const cats = dailySeries.map((d) => d.label);

  // ── Yearly area chart ──
  const yearlyData = Array.from({ length: 12 }, (_, i) => {
    const mk = `${currentYear}-${pad(i + 1)}`;
    const mr = rows.filter((r) => r.fechaContacto?.startsWith(mk));
    return {
      label: MONTH_NAMES[i].slice(0, 3),
      contactos: mr.length,
      reuniones: mr.filter(isR1R2).length,
      clientes:  mr.filter(isCli).length,
    };
  });

  const DEFAULT_LAYOUT = [
    { id: "nav",          visible: true, order: 0 },
    { id: "kpi",          visible: true, order: 1 },
    { id: "area_mensual", visible: true, order: 2 },
    { id: "barras",       visible: true, order: 3 },
    { id: "hoy",          visible: true, order: 4 },
    { id: "area_anual",   visible: true, order: 5 },
  ];
  const layout = (() => {
    const saved = settings.dashboardLayout ?? [];
    const merged = DEFAULT_LAYOUT.map((def) => {
      const s = saved.find((x) => x.id === def.id);
      return s ? { ...def, ...s } : def;
    });
    return [...merged].sort((a, b) => a.order - b.order);
  })();

  const sectionMap: Record<string, React.ReactNode> = {
    // ── Selector de mes
    nav: (
      <div className="bio-page-head">
        <div className="bio-page-title-row">
          <h2 className="bio-page-title">DASHBOARD</h2>
          <div className="bio-page-subtitle">VENTAS BIOMARKETING</div>
        </div>
        <div className="bio-page-actions">
          <button
            className="calendar-mini-btn"
            onClick={() => handleMonth(shiftMonth(selectedMonth, -1))}
          >‹</button>
          <div style={{
            color: "var(--dark)", background: "#f8fafc",
            border: "1px solid var(--slate-200)", borderRadius: 12,
            padding: "4px 16px", minWidth: 170, textAlign: "center",
            fontSize: 13, fontWeight: 900,
          }}>
            {monthLabel(selectedMonth).toUpperCase()}
          </div>
          <button
            className="calendar-mini-btn"
            onClick={() => handleMonth(shiftMonth(selectedMonth, 1))}
          >›</button>
          <button
            className="month-current-btn"
            onClick={() => handleMonth(currentMonthBA())}
          >HOY</button>
        </div>
      </div>
    ),

    // ── KPI Cards (welcome)
    kpi: (
      <div className="grid grid-cols-3 gap-3.5">
        <KpiCard label="Contactados del mes" value={monthContacts} trend={trend(monthContacts, lastContacts)} series={dailySeries.map((d) => d.contactos)} color="#f6bf26" dark={dark} />
        <KpiCard label="Reuniones del mes"   value={monthMeetings} trend={trend(monthMeetings, lastMeetings)} series={dailySeries.map((d) => d.reuniones)} color="#3b82f6" dark={dark} />
        <KpiCard label="Cierres del mes"     value={monthClosings} trend={trend(monthClosings, lastClosings)} series={dailySeries.map((d) => d.clientes)} color="#22c55e" dark={dark} />
      </div>
    ),

    // ── Área bienvenida
    area_mensual: (
      <WelcomeAreaChart
        title={`CRECIMIENTO MENSUAL — ${monthLabel(selectedMonth)}`}
        categories={cats}
        contactos={dailySeries.map((d) => d.contactos)}
        reuniones={dailySeries.map((d) => d.reuniones)}
        cierres={dailySeries.map((d) => d.clientes)}
        dark={dark}
      />
    ),

    // ── Gráficos de barras
    barras: (
      <section className="flex flex-col gap-3.5">
        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-200">{`GRÁFICOS DIARIOS (${monthShort})`}</h3>
        <div className="grid grid-cols-3 gap-3.5">
          <MetricBarChart title="Contactos CRM" data={dayData((r) => r.tab === "CRM")} color="#f6bf26" dark={dark} />
          <MetricBarChart title="Reuniones"     data={dayData(isR1R2)} color="#3b82f6" dark={dark} />
          <MetricBarChart title="Cierres"       data={dayData(isCli)}  color="#22c55e" dark={dark} />
        </div>
      </section>
    ),

    // ── Reporte Diario — gráfico
    hoy: (
      <DailyReportChart
        memberNames={memberNames}
        contactados={memberNames.map((n) => countByMember(todayRows, n))}
        objetivos={memberNames.map((n) => getGoal(n))}
        setGoal={(name, val) => setGoal(name, val)}
        today={today}
        dark={dark}
      />
    ),

    // ── Tabla AÑO
    anio: (
      <DashTable
        title={`TABLA AÑO (${currentYear})`}
        subtitle="ACUMULADO ANUAL"
        members={memberNames}
        rows={[
          { label: "TOTAL CONTACTADOS", values: memberNames.map((n) => countByMember(yearRows, n)) },
          { label: "TOTAL REUNIONES",   values: memberNames.map((n) => countByMember(yearRows.filter(isR1R2), n)) },
          { label: "TOTAL CIERRES",     values: memberNames.map((n) => countByMember(yearRows.filter(isCli), n)), accent: true },
        ]}
      />
    ),

    // ── Tabla MES
    mes: (
      <DashTable
        title={`TABLA MES (${monthLabel(selectedMonth)})`}
        subtitle="TOTALES MENSUALES"
        members={memberNames}
        rows={[
          { label: "TOTAL CONTACTADOS", values: memberNames.map((n) => countByMember(monthRows, n)) },
          { label: "TOTAL REUNIONES",   values: memberNames.map((n) => countByMember(monthRows.filter(isR1R2), n)) },
          { label: "CLIENTES CERRADOS", values: memberNames.map((n) => countByMember(monthRows.filter(isCli), n)), accent: true },
        ]}
      />
    ),

    // ── Área anual
    area_anual: (
      <WelcomeAreaChart
        title={`CRECIMIENTO ANUAL — ${currentYear}`}
        categories={yearlyData.map((d) => d.label)}
        contactos={yearlyData.map((d) => d.contactos)}
        reuniones={yearlyData.map((d) => d.reuniones)}
        cierres={yearlyData.map((d) => d.clientes)}
        dark={dark}
      />
    ),
  };

  /* Agrupar mes + anio side-by-side */
  const visible = layout.filter((s) => s.visible);
  const rendered: React.ReactNode[] = [];
  let i = 0;
  while (i < visible.length) {
    const s = visible[i];
    const next = visible[i + 1];
    const isTable = (id: string) => id === "mes" || id === "anio";
    if (isTable(s.id) && next && isTable(next.id)) {
      rendered.push(
        <div key="tables-pair" className="grid grid-cols-2 gap-4">
          {sectionMap[s.id]}
          {sectionMap[next.id]}
        </div>
      );
      i += 2;
    } else {
      rendered.push(<div key={s.id}>{sectionMap[s.id]}</div>);
      i++;
    }
  }

  return <div className="px-7 pt-7 pb-12 flex flex-col gap-5 min-h-full">{rendered}</div>;
}
