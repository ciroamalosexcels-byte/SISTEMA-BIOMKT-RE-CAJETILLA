"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useLeadsStore } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { useAppSettings } from "@/store/app-settings";
import { currentMonthBA } from "@/lib/dates";
import { WelcomeAreaChart } from "@/components/ui/welcome-area-chart";
import { STATUS91_ITEMS } from "@/lib/constants";

const MONTH_NAMES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
const pad = (n: number) => String(n).padStart(2, "0");
const fmtPesos = (n: number) => n === 0 ? "$0" : `$${n.toLocaleString("es-AR")}`;

/* ── Componente de card base ─────────────────────────────────────── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.06] rounded-[18px] overflow-hidden flex flex-col">
      <div className="px-5 py-3 bg-[#07152f] flex-shrink-0">
        <span className="text-[13px] font-black text-white uppercase tracking-[0.12em]">{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ── Resumen de Caja ─────────────────────────────────────────────── */
const CAJA_STORAGE = "biomarketing_caja_v1";
const CAJA_DEFAULT = { entra: 0, sale: 0, caja: 0, deuda: 0, calle: 0, objetivo: 0 };

function CajaRow({ label, value, onChange, amber }: { label: string; value: number; onChange: (n: number) => void; amber?: boolean }) {
  const [raw, setRaw] = useState("");
  const [focused, setFocused] = useState(false);
  const color = amber ? "#07152f" : undefined;
  return (
    <div className={`flex items-center ${amber ? "bg-amber" : "border-b border-slate-100 dark:border-white/[0.04]"}`}>
      <div
        className={`py-[6px] text-[12px] font-black uppercase tracking-[0.05em] border-r border-slate-200 dark:border-white/[0.06] flex-shrink-0 ${amber ? "text-[#07152f]" : "text-slate-500 dark:text-slate-400"}`}
        style={{ width: "48%", paddingLeft: 20, paddingRight: 12 }}
      >
        {label}
      </div>
      <div className="flex items-center gap-1 flex-1" style={{ paddingLeft: 14, paddingRight: 14 }}>
        <span className={`text-[14px] font-black flex-shrink-0 ${amber ? "text-[#07152f]" : "text-slate-900 dark:text-white"}`}>$</span>
        <input
          type="text"
          inputMode="numeric"
          value={focused ? raw : (value > 0 ? value.toLocaleString("es-AR") : "")}
          placeholder="0"
          onFocus={() => { setFocused(true); setRaw(value > 0 ? String(value) : ""); }}
          onBlur={() => { setFocused(false); onChange(Number(raw.replace(/\D/g, "")) || 0); }}
          onChange={e => { const v = e.target.value.replace(/\D/g, ""); setRaw(v); }}
          className={`flex-1 bg-transparent text-[14px] font-black ${amber ? "text-[#07152f]" : "text-slate-900 dark:text-white"}`}
          style={{ border: "none", outline: "none", fontFamily: "inherit", minWidth: 0, cursor: "text", color }}
        />
      </div>
    </div>
  );
}

function ResumenCaja() {
  const [vals, setVals] = useState(CAJA_DEFAULT);
  useEffect(() => {
    try { const r = localStorage.getItem(CAJA_STORAGE); if (r) setVals(JSON.parse(r)); } catch {}
  }, []);
  function set(key: string, val: number) {
    const next = { ...vals, [key]: val };
    setVals(next);
    localStorage.setItem(CAJA_STORAGE, JSON.stringify(next));
  }
  const rows: { key: keyof typeof CAJA_DEFAULT; label: string; amber?: boolean }[] = [
    { key: "entra",    label: "ENTRA" },
    { key: "sale",     label: "SALE" },
    { key: "caja",     label: "CAJA" },
    { key: "deuda",    label: "DEUDA" },
    { key: "calle",    label: "CALLE" },
    { key: "objetivo", label: "OBJETIVO", amber: true },
  ];
  return (
    <Card title="Resumen de Caja">
      <div className="flex flex-col">
        {rows.map(({ key, label, amber }) => (
          <CajaRow key={key} label={label} value={vals[key]} onChange={v => set(key, v)} amber={amber} />
        ))}
      </div>
    </Card>
  );
}

/* ── Clientes + Ticket ───────────────────────────────────────────── */
const TICKET_STORAGE  = "biomarketing_ticket_v1";
const OBJETIVO_CLI_STORAGE = "biomarketing_objetivo_clientes_v1";

function ClientesTicket() {
  const rows    = useLeadsStore((s) => s.rows);
  const month   = currentMonthBA();
  const [y, mo] = month.split("-").map(Number);
  const mesLabel = MONTH_NAMES[(mo ?? 1) - 1];
  const clientesRows = rows.filter((r) => r.tab === "CLIENTES");
  const clientes = clientesRows.length;

  // % conversión: clientes / total leads (todas las etapas)
  const totalLeads = rows.length;
  const convPct = totalLeads > 0 ? Math.round((clientes / totalLeads) * 100) : 0;
  const convColor = convPct >= 30 ? "#22c55e" : convPct >= 15 ? "#f59e0b" : "#ef4444";
  const convTooltip = clientes === 0 || totalLeads === 0
    ? "Sin conversiones aún"
    : convPct % 10 === 0
      ? `${convPct / 10} de cada 10 contactos se hacen clientes`
      : `${convPct} de cada 100 contactos se hacen clientes`;

  // Ticket promedio calculado desde los tickets de los clientes activos
  const ticketAuto = useMemo(() => {
    const withTicket = clientesRows.filter(r => r.ticket && r.ticket > 0);
    if (withTicket.length === 0) return 0;
    return Math.round(withTicket.reduce((sum, r) => sum + (r.ticket ?? 0), 0) / withTicket.length);
  }, [clientesRows]);

  const [ticketManual, setTicketManual] = useState(0);
  const [objetivo, setObjetivo] = useState(0);
  useEffect(() => {
    try { const r = localStorage.getItem(TICKET_STORAGE); if (r) setTicketManual(Number(r)); } catch {}
    try { const r = localStorage.getItem(OBJETIVO_CLI_STORAGE); if (r) setObjetivo(Number(r)); } catch {}
  }, []);
  function saveTicket(v: number)   { setTicketManual(v); localStorage.setItem(TICKET_STORAGE, String(v)); }
  function saveObjetivo(v: number) { setObjetivo(v); localStorage.setItem(OBJETIVO_CLI_STORAGE, String(v)); }

  // Usar ticket automático si hay datos, manual si no
  const ticket = ticketAuto > 0 ? ticketAuto : ticketManual;
  const pct = objetivo > 0 ? Math.round((clientes / objetivo) * 100) : 0;
  const pctColor = pct >= 100 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <Card title={`Clientes ${mesLabel}`}>
      <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/[0.04]">
        {/* Clientes del mes */}
        <div className="flex items-center justify-between pl-5 pr-[31px] py-[9px]">
          <span className="text-[12px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.05em]">Total clientes activos</span>
          <span className="text-[29px] font-black text-slate-900 dark:text-white leading-none">{clientes}</span>
        </div>
        {/* Objetivo de clientes */}
        <div className="flex items-center justify-between px-5 py-[9px]">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.05em]">Objetivo clientes</span>
            {objetivo > 0 && (
              <span className="text-[13px] font-black" style={{ color: pctColor }}>{pct}%</span>
            )}
          </div>
          <input
            type="number"
            value={objetivo || ""}
            onChange={e => saveObjetivo(Number(e.target.value))}
            className="bg-transparent outline-none text-right"
            placeholder="0"
            style={{ fontSize: 29, fontWeight: 900, lineHeight: 1, width: 80, border: "none", color: "#94a3b8" }}
          />
        </div>
        {/* Ticket promedio */}
        <div className="flex items-center justify-between px-5 py-[9px]">
          <div className="flex flex-col">
            <span className="text-[12px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.05em]">Ticket promedio</span>
            {ticketAuto > 0 && <span className="text-[9px] text-slate-400 dark:text-slate-600 font-medium">desde tickets de clientes</span>}
          </div>
          <div className="flex items-center gap-1 bg-amber rounded-xl px-3 py-1.5 relative">
            <span className="text-[16px] font-black text-[#07152f]">$</span>
            <span className="text-[16px] font-black text-[#07152f] text-right select-none">
              {ticket > 0 ? ticket.toLocaleString("es-AR") : "0"}
            </span>
            {ticketAuto === 0 && (
              <input
                type="number"
                value={ticketManual || ""}
                onChange={e => saveTicket(Number(e.target.value))}
                className="absolute inset-0 opacity-0 w-full cursor-text"
              />
            )}
          </div>
        </div>
        {/* Conversión a clientes */}
        <div className="flex items-center justify-between px-5 py-2 bg-amber/[0.06] dark:bg-amber/[0.04]">
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.05em]">Conversión a clientes</span>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-600">
              {clientes} de {totalLeads} contactos
            </span>
          </div>
          <div className="relative group cursor-help">
            <span className="text-[22px] font-black" style={{ color: convColor }}>{convPct}%</span>
            <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block bg-slate-800 dark:bg-slate-700 text-white text-[11px] font-semibold rounded-lg px-3 py-1.5 whitespace-nowrap z-20 shadow-lg pointer-events-none">
              {convTooltip}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ── Estado de Clientes ──────────────────────────────────────────── */
const ESTADO_FACES = [
  { emoji: "😄", label: "Excelente", color: "#22c55e", bg: "#dcfce7" },
  { emoji: "😊", label: "Bien",      color: "#3b82f6", bg: "#dbeafe" },
  { emoji: "😐", label: "Regular",   color: "#f59e0b", bg: "#fef9c3" },
  { emoji: "😟", label: "Mal",       color: "#f97316", bg: "#ffedd5" },
  { emoji: "😢", label: "Muy mal",   color: "#ef4444", bg: "#fee2e2" },
];

function EstadoClientes() {
  const rows = useLeadsStore((s) => s.rows);
  const clientes = useMemo(() => rows.filter(r => r.tab === "CLIENTES"), [rows]);

  const avgIdx = useMemo(() => {
    if (clientes.length === 0) return 1;
    let total = 0;
    clientes.forEach(c => {
      try {
        const v = localStorage.getItem(`biomarketing_client_estado_${c.id}`);
        total += v !== null ? Number(v) : 1;
      } catch { total += 1; }
    });
    return Math.round(total / clientes.length);
  }, [clientes]);

  const e = ESTADO_FACES[avgIdx] ?? ESTADO_FACES[1];

  return (
    <Card title="Estado de Clientes">
      <div
        className="flex-1 flex flex-col items-center justify-center py-5 gap-2 select-none transition-colors"
        style={{ background: `${e.bg}40` }}
      >
        <span className="text-[80px] leading-none">{e.emoji}</span>
        <span className="text-[20px] font-black" style={{ color: e.color }}>{e.label}</span>
        <span className="text-[14px] text-slate-400 dark:text-slate-500 font-medium">Promedio de {clientes.length} clientes</span>
      </div>
    </Card>
  );
}

/* ── Estado del Líder ────────────────────────────────────────────── */

function LiderBloque() {
  const members = useTeamStore((s) => s.members);
  const lider = members.find((m) => /l[ií]der/i.test(m.roles ?? ""));

  if (!lider) return (
    <Card title="Estado del Líder">
      <div className="flex-1 flex items-center justify-center p-8 text-[13px] text-slate-300 dark:text-slate-600">
        Sin líder asignado en el equipo
      </div>
    </Card>
  );

  const S91_SCORE: Record<string, number> = { red: 0, yellow: 1, green: 2, lime: 3 };
  const S91_COLOR = ["#ff1616", "#ffc21a", "#157a4d", "#52ff00"];
  const s91Vals = STATUS91_ITEMS.map(k => lider.status91?.[k] ?? "").filter(v => v in S91_SCORE);
  const avgColor = s91Vals.length === 0 ? "#d1d5db" : (() => {
    const avg = s91Vals.reduce((sum, v) => sum + S91_SCORE[v], 0) / s91Vals.length;
    return S91_COLOR[Math.round(avg)];
  })();

  return (
    <Card title="Estado del Líder">
      <div className="flex-1 flex flex-col items-center justify-center p-3 gap-2">
        <div className="w-[88px] h-[88px] rounded-full shadow-lg" style={{ background: avgColor }} />
        <span className="text-[31px] font-black text-slate-900 dark:text-white">{lider.nombre}</span>
      </div>
    </Card>
  );
}

/* ── Gráfico crecimiento mensual ─────────────────────────────────── */
function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, (mo ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function GraficoCrecimiento() {
  const rows   = useLeadsStore((s) => s.rows);
  const { settings } = useAppSettings();
  const dark   = settings.darkMode ?? false;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthBA());
  const [y, mo] = selectedMonth.split("-").map(Number);
  const days   = new Date(y, mo, 0).getDate();
  const mesLabel = MONTH_NAMES[(mo ?? 1) - 1];

  const isR1R2 = (r: typeof rows[0]) => r.tab === "REUNION_1" || r.tab === "REUNION_2";
  const isCli  = (r: typeof rows[0]) => r.tab === "CLIENTES";

  const daily = useMemo(() => Array.from({ length: days }, (_, i) => {
    const dk = `${selectedMonth}-${pad(i + 1)}`;
    const dr = rows.filter(r => r.fechaContacto?.startsWith(dk));
    return { contactos: dr.length, reuniones: dr.filter(isR1R2).length, cierres: dr.filter(isCli).length };
  }), [rows, selectedMonth, days]); // eslint-disable-line

  const cats = Array.from({ length: days }, (_, i) => String(i + 1));

  const selector = (
    <div className="flex items-center gap-2">
      <button className="calendar-mini-btn" onClick={() => setSelectedMonth(m => shiftMonth(m, -1))}>‹</button>
      <div style={{ color: "#fff", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "3px 12px", minWidth: 140, textAlign: "center", fontSize: 12, fontWeight: 900 }}>
        {mesLabel.toUpperCase()} {y}
      </div>
      <button className="calendar-mini-btn" onClick={() => setSelectedMonth(m => shiftMonth(m, 1))}>›</button>
      <button className="month-current-btn" onClick={() => setSelectedMonth(currentMonthBA())}>HOY</button>
    </div>
  );

  return (
    <WelcomeAreaChart
      title={`CRECIMIENTO MENSUAL — ${mesLabel} DE ${y}`}
      categories={cats}
      contactos={daily.map(d => d.contactos)}
      reuniones={daily.map(d => d.reuniones)}
      cierres={daily.map(d => d.cierres)}
      dark={dark}
      actions={selector}
    />
  );
}

/* ── Faro / Meta / Objetivo ──────────────────────────────────────── */
const FMO_STORAGE = "biomarketing_general_fmo_v1";
const FMO_DOT_COLORS = [
  { value: "",       bg: "#d1d5db" },
  { value: "red",    bg: "#ff1616" },
  { value: "yellow", bg: "#ffc21a" },
  { value: "green",  bg: "#157a4d" },
  { value: "lime",   bg: "#52ff00" },
];
interface FMORow { texto: string; descripcion: string; fecha: string; color: string; }
interface FMOData { faro: FMORow[]; meta: FMORow[]; objetivo: FMORow[]; }
function makeFMORows(n: number): FMORow[] {
  return Array.from({ length: n }, () => ({ texto: "", descripcion: "", fecha: "", color: "" }));
}
const FMO_DEFAULT: FMOData = { faro: makeFMORows(1), meta: makeFMORows(3), objetivo: makeFMORows(9) };

function FMOModal({ section, index, row, onSave, onClose }: {
  section: string; index: number; row: FMORow;
  onSave: (r: FMORow) => void; onClose: () => void;
}) {
  const [data, setData] = useState<FMORow>({ ...row });
  const dot = FMO_DOT_COLORS.find(c => c.value === data.color) ?? FMO_DOT_COLORS[0];
  function cycleColor() {
    const idx = FMO_DOT_COLORS.findIndex(c => c.value === data.color);
    setData(d => ({ ...d, color: FMO_DOT_COLORS[(idx + 1) % FMO_DOT_COLORS.length].value }));
  }
  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <h2 className="modal-title capitalize">{section} {index + 1}</h2>
            <button type="button" onClick={cycleColor} title={dot.value || "Sin estado"}
              style={{ width: 22, height: 22, borderRadius: "50%", background: dot.bg, border: "2px solid rgba(0,0,0,0.12)", cursor: "pointer", flexShrink: 0 }} />
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ gridTemplateColumns: "1fr", gap: 14 }}>
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1 capitalize">{section}</label>
            <textarea
              className="field w-full"
              style={{ minHeight: 80, resize: "vertical" }}
              value={data.texto}
              onChange={e => setData(d => ({ ...d, texto: e.target.value }))}
              placeholder={`Texto de ${section}...`}
            />
          </div>
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">Descripción</label>
            <textarea
              className="field w-full"
              style={{ minHeight: 60, resize: "vertical" }}
              value={data.descripcion}
              onChange={e => setData(d => ({ ...d, descripcion: e.target.value }))}
              placeholder="Descripción..."
            />
          </div>
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">Fecha</label>
            <input type="date" className="field w-full" value={data.fecha}
              onChange={e => setData(d => ({ ...d, fecha: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-amber" onClick={() => { onSave(data); onClose(); }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

function FMOPill({ row, onClick }: { row: FMORow; onClick: () => void }) {
  const dot = FMO_DOT_COLORS.find(c => c.value === row.color) ?? FMO_DOT_COLORS[0];
  const hasFecha = !!row.fecha;
  return (
    <button
      type="button"
      onClick={onClick}
      className="client-card-v11 text-left w-full"
      style={{ height: "auto", minHeight: 100, padding: 14 }}
    >
      {/* Título — igual que h3 en client-card */}
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 900, lineHeight: 1.2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
          {row.texto || ""}
        </p>
        {hasFecha && (
          <p style={{ margin: "4px 0 0", fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>
            {new Date(row.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
          </p>
        )}
      </div>
      {/* Estado — igual que pill Activo/Inactivo */}
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
        <span
          style={{
            width: 12, height: 12, borderRadius: "50%",
            background: dot.bg, display: "inline-block",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </div>
    </button>
  );
}

function FaroMetaObjetivo() {
  const [data, setData] = useState<FMOData>(FMO_DEFAULT);
  const [modal, setModal] = useState<{ section: keyof FMOData; index: number } | null>(null);

  useEffect(() => {
    try {
      const r = localStorage.getItem(FMO_STORAGE);
      if (r) {
        const p = JSON.parse(r);
        setData({
          faro:    Array.isArray(p.faro)    ? p.faro    : makeFMORows(1),
          meta:    Array.isArray(p.meta)    ? p.meta    : makeFMORows(3),
          objetivo: Array.isArray(p.objetivo) ? p.objetivo : makeFMORows(9),
        });
      }
    } catch {}
  }, []);

  const save = useCallback((section: keyof FMOData, index: number, row: FMORow) => {
    setData(prev => {
      const updated = { ...prev, [section]: prev[section].map((r, i) => i === index ? row : r) };
      localStorage.setItem(FMO_STORAGE, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const sections: { key: keyof FMOData; label: string; cols: string }[] = [
    { key: "faro",    label: "faro",    cols: "grid-cols-1" },
    { key: "meta",    label: "meta",    cols: "grid-cols-2" },
    { key: "objetivo", label: "objetivo", cols: "grid-cols-3" },
  ];

  return (
    <div className="bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.06] rounded-[18px] overflow-hidden">
      {/* Header */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 2fr 3fr" }}>
        {sections.map(({ key, label }, i) => (
          <div key={key} className={`px-4 py-2.5 bg-[#07152f] text-[13px] font-black text-white uppercase tracking-[0.1em] ${i > 0 ? "border-l border-white/[0.1]" : ""}`}>
            {label}
          </div>
        ))}
      </div>
      {/* Pills */}
      <div className="grid p-3 gap-3" style={{ gridTemplateColumns: "1fr 2fr 3fr" }}>
        {sections.map(({ key, cols }, i) => (
          <div key={key} className={`grid ${cols} gap-2 ${i > 0 ? "border-l border-slate-100 dark:border-white/[0.04] pl-3" : ""}`}>
            {data[key].map((row, idx) => (
              <FMOPill key={idx} row={row} onClick={() => setModal({ section: key, index: idx })} />
            ))}
          </div>
        ))}
      </div>
      {modal && (
        <FMOModal
          section={modal.section}
          index={modal.index}
          row={data[modal.section][modal.index]}
          onSave={row => save(modal.section, modal.index, row)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* ── Página ──────────────────────────────────────────────────────── */
export default function GeneralPage() {
  return (
    <div className="flex flex-col min-h-full bg-bio-bg dark:bg-[#080f1e]">
      <div className="bio-page-head">
        <div className="bio-page-title-row">
          <h2 className="bio-page-title">PANEL GENERAL</h2>
          <div className="bio-page-subtitle">RESUMEN CONSOLIDADO</div>
        </div>
      </div>

      <div className="px-7 pt-5 pb-12 flex flex-col gap-5">
        <div className="grid grid-cols-4 gap-4">
          <ResumenCaja />
          <ClientesTicket />
          <EstadoClientes />
          <LiderBloque />
        </div>
        <GraficoCrecimiento />
        <FaroMetaObjetivo />
      </div>
    </div>
  );
}
