"use client";

import { useState } from "react";
import { useLeadsStore } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { useAppSettings } from "@/store/app-settings";
import { todayBA, currentMonthBA } from "@/lib/dates";
import type { Lead } from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");

const MONTH_NAMES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];

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

// ── Day Bar Chart ─────────────────────────────────────────────────────
function DayBarChart({ title, data, barH = 110 }: { title: string; data: { label: string; value: number }[]; barH?: number }) {
  const days = data.length || 1;
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <article className="stat-wide" style={{ "--days": days } as React.CSSProperties}>
      <h3 className="stat-wide-title">{title}</h3>
      <div className="month-chart-wide">
        <div className="bars-area-wide" style={{ minHeight: barH }}>
          {data.map((d) => {
            const height = Math.max(5, Math.round((d.value / max) * (barH - 35)));
            return (
              <div key={d.label} className="bar-wrap-wide">
                <div className="bar-val-wide">{d.value > 0 ? d.value : ""}</div>
                <div className="bar-wide" style={{ height }} />
              </div>
            );
          })}
        </div>
        <div className="days-row-wide">
          {data.map((d) => (
            <div key={d.label} className="day-label-wide">{d.label}</div>
          ))}
        </div>
      </div>
    </article>
  );
}

// ── Monthly Area Chart ────────────────────────────────────────────────
interface MonthSerie { label: string; contactos: number; reuniones: number; clientes: number; }

interface TooltipState { i: number; x: number; y: number; }

function MonthAreaChart({ data, title = "Crecimiento mensual" }: { data: MonthSerie[]; title?: string }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const W = 1000;
  const H = 180;
  const PAD = { top: 18, right: 16, bottom: 36, left: 36 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const n = data.length || 1;

  const maxVal = Math.max(1,
    ...data.map((d) => d.contactos),
    ...data.map((d) => d.reuniones),
    ...data.map((d) => d.clientes),
  );

  const xOf = (i: number) => PAD.left + (i / Math.max(n - 1, 1)) * iW;
  const yOf = (v: number) => PAD.top + iH - (v / maxVal) * iH;

  function polyPoints(key: keyof MonthSerie) {
    if (n === 1) {
      const x = xOf(0); const y = yOf(data[0][key] as number);
      return `${PAD.left},${PAD.top + iH} ${x},${y} ${PAD.left + iW},${PAD.top + iH}`;
    }
    const top = data.map((d, i) => `${xOf(i)},${yOf(d[key] as number)}`).join(" ");
    return `${PAD.left},${PAD.top + iH} ${top} ${PAD.left + iW},${PAD.top + iH}`;
  }

  function linePath(key: keyof MonthSerie) {
    return data.map((d, i) => `${i === 0 ? "M" : "L"}${xOf(i)},${yOf(d[key] as number)}`).join(" ");
  }

  const series: { key: keyof MonthSerie; color: string; label: string }[] = [
    { key: "contactos", color: "#ef4444", label: "Contactos" },
    { key: "reuniones", color: "#f6bf26", label: "Reuniones" },
    { key: "clientes",  color: "#3b82f6", label: "Clientes cerrados" },
  ];

  const TW = 160; const TH = 72; const TP = 10;

  return (
    <article className="stat-wide">
      <h3 className="stat-wide-title">{title}</h3>
      <div className="area-chart-legend">
        {series.map((s) => (
          <span key={s.key} className="area-legend-item">
            <svg width="28" height="12" viewBox="0 0 28 12" aria-hidden="true">
              <line x1="0" y1="6" x2="28" y2="6" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="14" cy="6" r="4" fill={s.color} stroke="#fff" strokeWidth="1.5" />
            </svg>
            {s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.03" />
            </linearGradient>
          ))}
        </defs>

        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = PAD.top + iH * (1 - f);
          return (
            <g key={f}>
              <line x1={PAD.left} x2={PAD.left + iW} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="700">
                {Math.round(maxVal * f)}
              </text>
            </g>
          );
        })}

        {/* areas */}
        {series.map((s) => (
          <polygon key={s.key} points={polyPoints(s.key)} fill={`url(#grad-${s.key})`} />
        ))}

        {/* lines */}
        {series.map((s) => (
          <path key={s.key} d={linePath(s.key)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* hover vertical line */}
        {tooltip && (
          <line
            x1={xOf(tooltip.i)} x2={xOf(tooltip.i)}
            y1={PAD.top} y2={PAD.top + iH}
            stroke="#07152f" strokeWidth="1" strokeDasharray="3 3" opacity="0.4"
            pointerEvents="none"
          />
        )}

        {/* dots con hover */}
        {series.map((s) =>
          data.map((d, i) => (
            <circle
              key={`${s.key}-${i}`}
              cx={xOf(i)} cy={yOf(d[s.key] as number)}
              r={tooltip?.i === i ? 6 : 4}
              fill={s.color}
              stroke="#fff"
              strokeWidth={tooltip?.i === i ? 2 : 1.5}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setTooltip({ i, x: xOf(i), y: Math.min(yOf(d[s.key] as number), PAD.top + 10) })}
              onMouseLeave={() => setTooltip(null)}
            />
          ))
        )}

        {/* invisible wide hover zones por columna */}
        {data.map((d, i) => (
          <rect
            key={`hz-${i}`}
            x={xOf(i) - (iW / Math.max(n - 1, 1)) / 2}
            y={PAD.top}
            width={iW / Math.max(n - 1, 1)}
            height={iH}
            fill="transparent"
            onMouseEnter={() => setTooltip({ i, x: xOf(i), y: PAD.top })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {/* x labels */}
        {data.map((d, i) => (
          <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize="10" fontWeight="700"
            fill={tooltip?.i === i ? "#07152f" : "#64748b"}>
            {d.label}
          </text>
        ))}

        {/* tooltip box */}
        {tooltip && (() => {
          const d = data[tooltip.i];
          const tx = Math.min(tooltip.x, W - TW - 4);
          const ty = PAD.top - 4;
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={TW} height={TH} rx="7" ry="7" fill="#07152f" opacity="0.92" />
              <text x={tx + TP} y={ty + TP + 11} fontSize="11" fontWeight="900" fill="#f6bf26">{d.label}</text>
              <circle cx={tx + TP + 5} cy={ty + TP + 24} r="4" fill="#ef4444" />
              <text x={tx + TP + 13} y={ty + TP + 28} fontSize="10" fontWeight="700" fill="#fff">Contactos: {d.contactos}</text>
              <circle cx={tx + TP + 5} cy={ty + TP + 38} r="4" fill="#f6bf26" />
              <text x={tx + TP + 13} y={ty + TP + 42} fontSize="10" fontWeight="700" fill="#fff">Reuniones: {d.reuniones}</text>
              <circle cx={tx + TP + 5} cy={ty + TP + 52} r="4" fill="#3b82f6" />
              <text x={tx + TP + 13} y={ty + TP + 56} fontSize="10" fontWeight="700" fill="#fff">Clientes: {d.clientes}</text>
            </g>
          );
        })()}
      </svg>
    </article>
  );
}

// ── Dashboard Box Table ───────────────────────────────────────────────
interface BoxRow {
  label: string;
  values: number[];
  accent?: boolean;
  editable?: boolean;
  onEdit?: (memberIndex: number, value: number) => void;
}

function DashboardBox({ title, members, rows: tableRows, memberDots, totalDot }: { title: string; members: string[]; rows: BoxRow[]; memberDots?: string[]; totalDot?: string }) {
  const settings = useAppSettings((s) => s.settings);
  const lw = settings.dashboardLabelWidth || 200;
  const mw = settings.dashboardMemberWidth || 128;
  const tw = settings.dashboardTotalWidth || 160;
  const fs = settings.dashboardFontSize || 17;

  return (
    <div className="box" style={{ "--dashboard-number-font-size": `${fs}px` } as React.CSSProperties}>
      <div className="box-scroll">
        <table>
          <colgroup>
            <col style={{ width: lw }} />
            {members.map((m) => <col key={m} style={{ width: mw }} />)}
            <col style={{ width: tw }} />
          </colgroup>
          <thead>
            <tr>
              <th>{title}</th>
              {members.map((m, i) => (
                <th key={m}>
                  {memberDots?.[i] && (
                    <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: memberDots[i], marginRight: 6, verticalAlign: "middle", flexShrink: 0 }} />
                  )}
                  {m}
                </th>
              ))}
              <th>
                {totalDot && (
                  <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: totalDot, marginRight: 6, verticalAlign: "middle", flexShrink: 0 }} />
                )}
                TOTAL GRUPAL
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => {
              const total = row.values.reduce((a, b) => a + b, 0);
              return (
                <tr key={row.label} className={row.accent ? "accent" : ""}>
                  <td>{row.label}</td>
                  {row.values.map((v, i) =>
                    row.editable ? (
                      <td key={i}>
                        <input
                          className="box-number box-goal-input"
                          type="text"
                          inputMode="numeric"
                          value={v || ""}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            if (!isNaN(n) && row.onEdit) row.onEdit(i, n);
                            else if (e.target.value === "" && row.onEdit) row.onEdit(i, 0);
                          }}
                        />
                      </td>
                    ) : (
                      <td key={i}><span className="box-number">{v}</span></td>
                    )
                  )}
                  <td><span className="box-number">{total}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────
export function DashboardView() {
  const rows = useLeadsStore((s) => s.rows);
  const members = useTeamStore((s) => s.members);
  const settings = useAppSettings((s) => s.settings);
  const updateSettings = useAppSettings((s) => s.update);

  const today = todayBA();
  const currentYear = today.slice(0, 4);
  const [selectedMonth, setSelectedMonth] = useState(settings.calendarViewMonth || currentMonthBA());
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

  const memberDots = memberNames.map((n) => {
    const contacts = countByMember(todayRows, n);
    const goal = getGoal(n);
    const pct = goal > 0 ? (contacts / goal) * 100 : 0;
    if (pct >= 120) return "#52ff00";
    if (pct >= 100) return "#157a4d";
    if (pct >= 70)  return "#ffc21a";
    return "#ff1616";
  });

  const totalTodayContacts = memberNames.reduce((sum, n) => sum + countByMember(todayRows, n), 0);
  const totalGoal = memberNames.reduce((sum, n) => sum + getGoal(n), 0);
  const totalPct = totalGoal > 0 ? (totalTodayContacts / totalGoal) * 100 : 0;
  const totalDot = totalPct >= 120 ? "#52ff00" : totalPct >= 100 ? "#157a4d" : totalPct >= 70 ? "#ffc21a" : "#ff1616";

  const handleMonth = (m: string) => {
    setSelectedMonth(m);
    updateSettings({ calendarViewMonth: m });
  };

  // Day-of-month chart data
  const [y, mo] = selectedMonth.split("-").map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();

  // Monthly growth data — daily breakdown of the selected month
  const monthlyData: MonthSerie[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateKey = `${selectedMonth}-${pad(day)}`;
    const dRows = rows.filter((r) => r.fechaContacto?.startsWith(dateKey));
    return {
      label: String(day),
      contactos: dRows.length,
      reuniones: dRows.filter(isR1R2).length,
      clientes:  dRows.filter(isCli).length,
    };
  });

  // Yearly growth data — 12 months of the current year
  const yearlyData: MonthSerie[] = Array.from({ length: 12 }, (_, i) => {
    const mm = pad(i + 1);
    const monthKey = `${currentYear}-${mm}`;
    const mRows = rows.filter((r) => r.fechaContacto?.startsWith(monthKey));
    return {
      label: MONTH_NAMES[i].slice(0, 3),
      contactos: mRows.length,
      reuniones: mRows.filter(isR1R2).length,
      clientes:  mRows.filter(isCli).length,
    };
  });

  function dayData(filter: (r: Lead) => boolean) {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateKey = `${selectedMonth}-${pad(day)}`;
      return {
        label: String(day),
        value: rows.filter((r) => r.fechaContacto?.startsWith(dateKey) && filter(r)).length,
      };
    });
  }

  const DEFAULT_LAYOUT = [
    { id: "nav", visible: true, order: 0 },
    { id: "hoy", visible: true, order: 1 },
    { id: "anio", visible: true, order: 2 },
    { id: "mes", visible: true, order: 3 },
    { id: "barras", visible: true, order: 4 },
    { id: "area_mensual", visible: true, order: 5 },
    { id: "area_anual", visible: true, order: 6 },
  ];
  const layout = (() => {
    const saved = settings.dashboardLayout ?? [];
    const merged = DEFAULT_LAYOUT.map((def) => {
      const s = saved.find((x) => x.id === def.id);
      return s ? { ...def, ...s } : def;
    });
    return [...merged].sort((a, b) => a.order - b.order);
  })();

  const chartH = Math.round(110 * (settings.chartScale ?? 1));

  const sectionMap: Record<string, React.ReactNode> = {
    nav: (
      <div className="dashboard-month-controls-clean">
        <button className="calendar-mini-btn" type="button" onClick={() => handleMonth(shiftMonth(selectedMonth, -1))}>‹</button>
        <div className="calendar-month-label-v11">{monthLabel(selectedMonth)}</div>
        <button className="calendar-mini-btn" type="button" onClick={() => handleMonth(shiftMonth(selectedMonth, 1))}>›</button>
        <button className="month-current-btn" type="button" onClick={() => handleMonth(currentMonthBA())}>MES ACTUAL</button>
      </div>
    ),
    hoy: (
      <DashboardBox
        title={`HOY ${today.split("-").reverse().join("/")}`}
        members={memberNames}
        memberDots={memberDots}
        totalDot={totalDot}
        rows={[
          { label: "TOTAL CONTACTADOS", values: memberNames.map((n) => countByMember(todayRows, n)) },
          { label: "TOTAL DE REUNIONES", values: memberNames.map((n) => countByMember(todayRows.filter(isR1R2), n)) },
          { label: "OBJETIVO DIARIO", values: memberNames.map((n) => getGoal(n)), accent: true, editable: true, onEdit: (i, v) => setGoal(memberNames[i], v) },
        ]}
      />
    ),
    anio: (
      <DashboardBox
        title={currentYear}
        members={memberNames}
        rows={[
          { label: "TOTAL CONTACTADOS", values: memberNames.map((n) => countByMember(yearRows, n)) },
          { label: "TOTAL DE REUNIONES", values: memberNames.map((n) => countByMember(yearRows.filter(isR1R2), n)) },
          { label: "TOTAL DE CIERRES", values: memberNames.map((n) => countByMember(yearRows.filter(isCli), n)), accent: true },
        ]}
      />
    ),
    mes: (
      <DashboardBox
        title={monthLabel(selectedMonth)}
        members={memberNames}
        rows={[
          { label: "TOTAL CONTACTADOS", values: memberNames.map((n) => countByMember(monthRows, n)) },
          { label: "TOTAL DE REUNIONES", values: memberNames.map((n) => countByMember(monthRows.filter(isR1R2), n)) },
          { label: "CLIENTES CERRADOS", values: memberNames.map((n) => countByMember(monthRows.filter(isCli), n)), accent: true },
        ]}
      />
    ),
    barras: (
      <div className="charts-grid">
        <DayBarChart title={`Contactos CRM - ${monthLabel(selectedMonth)}`} data={dayData((r) => r.tab === "CRM")} barH={chartH} />
        <DayBarChart title={`Reuniones generadas - ${monthLabel(selectedMonth)}`} data={dayData(isR1R2)} barH={chartH} />
        <DayBarChart title={`Clientes cerrados - ${monthLabel(selectedMonth)}`} data={dayData(isCli)} barH={chartH} />
      </div>
    ),
    area_mensual: <MonthAreaChart title={`Crecimiento mensual ${monthLabel(selectedMonth)}`} data={monthlyData} />,
    area_anual:   <MonthAreaChart title={`Crecimiento anual ${currentYear}`} data={yearlyData} />,
  };

  return (
    <div className="dashboard">
      <div className="dashboard-main">
        <div className="dashboard-left">
          {layout.filter((s) => s.visible).map((s) => (
            <div key={s.id}>{sectionMap[s.id]}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
