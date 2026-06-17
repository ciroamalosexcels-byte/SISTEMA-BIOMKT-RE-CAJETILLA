"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useLeadsStore } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { useContentEventsStore } from "@/store/content-events";
import { useColumnWidthsStore, PLAN_COLUMN_FIELDS } from "@/store/column-widths";
import { CONTENT_TYPES, CONTENT_STATUS } from "@/lib/constants";
import { baParts } from "@/lib/dates";
import type { ContentEvent } from "@/types";

/* ─── Timer helpers ─────────────────────────────────────────────────────── */

function computeSeconds(event: ContentEvent): number {
  if (!event.timerRunning || !event.timerStartedAt) return event.timerSeconds;
  return event.timerSeconds + Math.floor((Date.now() - event.timerStartedAt) / 1000);
}

function formatTimer(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/* ─── Status row CSS class map ──────────────────────────────────────────── */

const STATUS_ROW_CLASS: Record<string, string> = {
  "SIN EDITAR":    "plan-sin-editar",
  "EDITANDO":      "plan-editando",
  "COMPLETO":      "plan-completo",
  "CALENDARIZADO": "plan-calendarizado",
};

/* ─── Status chip colors (calendar) ─────────────────────────────────────── */
const STATUS_COLOR: Record<string, string> = {
  "SIN EDITAR":    "#ef4444",
  "EDITANDO":      "#f97316",
  "COMPLETO":      "#eab308",
  "CALENDARIZADO": "#22c55e",
};

/* ─── Calendar helpers ───────────────────────────────────────────────────── */
const MONTH_NAMES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
const WEEKDAYS_SHORT = ["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"];
interface GridCell { date: string; inMonth: boolean; }

function planTodayKey() {
  const { year, month } = baParts();
  return `${year}-${month}`;
}
function planShiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function planMonthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[(m ?? 1) - 1]} ${y}`;
}
function planBuildGrid(key: string): GridCell[] {
  const [y, m] = key.split("-").map(Number);
  const firstDay = new Date(y, (m ?? 1) - 1, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(y, m ?? 1, 0).getDate();
  const prevDate = new Date(y, (m ?? 1) - 2, 1);
  const prevY = prevDate.getFullYear(), prevMo = prevDate.getMonth() + 1;
  const daysInPrev = new Date(prevY, prevMo, 0).getDate();
  const cells: GridCell[] = [];
  for (let i = startOffset - 1; i >= 0; i--)
    cells.push({ date: `${prevY}-${String(prevMo).padStart(2,"0")}-${String(daysInPrev-i).padStart(2,"0")}`, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`, inMonth: true });
  const nextDate = new Date(y, m ?? 1, 1);
  const nextY = nextDate.getFullYear(), nextMo = nextDate.getMonth() + 1;
  let nextD = 1;
  while (cells.length % 7 !== 0)
    cells.push({ date: `${nextY}-${String(nextMo).padStart(2,"0")}-${String(nextD++).padStart(2,"0")}`, inMonth: false });
  return cells;
}

/* ─── Timer cell (live update) ──────────────────────────────────────────── */

function TimerCell({
  event,
  onStart,
  onStop,
  onReset,
}: {
  event: ContentEvent;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}) {
  const [display, setDisplay] = useState(() => computeSeconds(event));

  useEffect(() => {
    setDisplay(computeSeconds(event));
    if (!event.timerRunning) return;
    const id = setInterval(() => setDisplay(computeSeconds(event)), 1000);
    return () => clearInterval(id);
  }, [event.timerRunning, event.timerStartedAt, event.timerSeconds]);

  return (
    <div className="timer-cell">
      {event.timerRunning ? (
        <button className="btn timer-stop-sm-btn" onClick={onStop}>■</button>
      ) : (
        <button className="btn timer-play-btn" onClick={onStart}>▶</button>
      )}
      <button className="btn timer-reset-btn" onClick={onReset} title="Resetear">↺</button>
      <span className="timer-text">{formatTimer(display)}</span>
    </div>
  );
}

/* ─── Text Paragraph Modal ──────────────────────────────────────────────── */

function TextParagraphModal({
  label,
  value,
  onSave,
  onClose,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(value);
  return (
    <div
      className="modal-backdrop open"
      onClick={onClose}
      style={{ zIndex: 9999 }}
    >
      <div
        className="modal"
        style={{ maxWidth: 540, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{label}</h2>
          <button className="icon-btn" type="button" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
        <div className="modal-body" style={{ padding: 20 }}>
          <textarea
            autoFocus
            className="textarea"
            style={{ width: "100%", minHeight: 160, resize: "vertical", fontSize: 14 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Escribí el ${label.toLowerCase()}…`}
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-amber" type="button" onClick={() => { onSave(text); onClose(); }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Content row ───────────────────────────────────────────────────────── */

function ContentRow({
  event,
  clients,
  memberNames,
  rowHeight,
  onUpdate,
  onDelete,
  onTimerStart,
  onTimerStop,
  onTimerReset,
}: {
  event: ContentEvent;
  clients: { id: string; name: string }[];
  memberNames: string[];
  rowHeight: number;
  onUpdate: (p: Partial<ContentEvent>) => void;
  onDelete: () => void;
  onTimerStart: () => void;
  onTimerStop: () => void;
  onTimerReset: () => void;
}) {
  const statusClass = STATUS_ROW_CLASS[event.status] ?? "";
  const [textModal, setTextModal] = useState<{ field: "frase" | "notes"; label: string } | null>(null);

  return (
    <>
    {textModal && (
      <TextParagraphModal
        label={textModal.label}
        value={textModal.field === "frase" ? (event.frase ?? "") : (event.notes ?? "")}
        onSave={(v) => onUpdate({ [textModal.field]: v })}
        onClose={() => setTextModal(null)}
      />
    )}
    <tr style={{ height: rowHeight }} className={`${event.done ? "opacity-50" : ""} ${statusClass}`}>

      {/* timer */}
      <td>
        <TimerCell
          event={event}
          onStart={onTimerStart}
          onStop={onTimerStop}
          onReset={onTimerReset}
        />
      </td>

      {/* encargado */}
      <td>
        <select className="cell-select" value={event.assignee ?? ""} onChange={(e) => onUpdate({ assignee: e.target.value })}>
          <option value="">—</option>
          {memberNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </td>

      {/* fecha publicación */}
      <td>
        <input type="datetime-local" className="cell-input" value={event.scheduledDate ? (event.scheduledDate.includes("T") ? event.scheduledDate.slice(0,16) : `${event.scheduledDate}T00:00`) : ""} onChange={(e) => onUpdate({ scheduledDate: e.target.value })} />
      </td>

      {/* cliente */}
      <td>
        <select className="cell-select" value={event.clientId} onChange={(e) => onUpdate({ clientId: e.target.value })}>
          <option value="">—</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>

      {/* tipo */}
      <td>
        <select className="cell-select" value={event.type} onChange={(e) => onUpdate({ type: e.target.value as ContentEvent["type"] })}>
          <option value="">—</option>
          {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>

      {/* estado */}
      <td>
        <select className="cell-select" value={event.status} onChange={(e) => onUpdate({ status: e.target.value as ContentEvent["status"] })}>
          <option value="">—</option>
          {CONTENT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>

      {/* idea */}
      <td>
        <button
          type="button"
          className="cell-input"
          style={{ textAlign: "left", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", width: "100%", background: "none", border: "none", padding: "0 6px", color: event.frase ? "inherit" : "var(--slate-400, #94a3b8)" }}
          onClick={() => setTextModal({ field: "frase", label: "Idea" })}
          title={event.frase ?? ""}
        >
          {event.frase || "Idea…"}
        </button>
      </td>

      {/* notas */}
      <td>
        <button
          type="button"
          className="cell-input"
          style={{ textAlign: "left", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", width: "100%", background: "none", border: "none", padding: "0 6px", color: event.notes ? "inherit" : "var(--slate-400, #94a3b8)" }}
          onClick={() => setTextModal({ field: "notes", label: "Feedback" })}
          title={event.notes ?? ""}
        >
          {event.notes || "Feedback…"}
        </button>
      </td>

      {/* delete */}
      <td>
        <div style={{ display: "flex", justifyContent: "center", padding: "0 6px" }}>
          <button
            onClick={() => { if (confirm("¿Eliminar contenido?")) onDelete(); }}
            className="btn btn-xs btn-danger"
          >✕</button>
        </div>
      </td>
    </tr>
    </>
  );
}

/* ─── Add Content Modal ─────────────────────────────────────────────────── */

function AddModal({
  clientIds,
  clientNames,
  memberNames,
  initialDate,
  onAdd,
  onClose,
}: {
  clientIds: string[];
  clientNames: string[];
  memberNames: string[];
  initialDate?: string;
  onAdd: (ev: Omit<ContentEvent, "id" | "order">) => void;
  onClose: () => void;
}) {
  const [title,    setTitle]   = useState("");
  const [clientId, setClient]  = useState("");
  const [type,     setType]    = useState<ContentEvent["type"]>("");
  const [status,   setStatus]  = useState<ContentEvent["status"]>("SIN EDITAR");
  const [assignee, setAss]     = useState("");
  const [scheduled, setSched]  = useState(() => {
    if (!initialDate) return "";
    if (initialDate.includes("T")) return initialDate.slice(0, 16);
    return `${initialDate}T00:00`;
  });
  const [objetivo, setObj]     = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !clientId) return;
    onAdd({
      clientId, title, type, status,
      assignee:     assignee   || undefined,
      scheduledDate: scheduled || undefined,
      objetivo:     objetivo   || undefined,
      done: false, timerSeconds: 0, timerRunning: false,
    });
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Nuevo contenido</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <form id="add-plan-modal-form" onSubmit={submit} style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field-group" style={{ gridColumn: "1/-1" }}>
            <label className="field-label">Título *</label>
            <input autoFocus className="field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título del contenido…" required />
          </div>
          <div className="field-group" style={{ gridColumn: "1/-1" }}>
            <label className="field-label">Cliente *</label>
            <select className="field" value={clientId} onChange={e => setClient(e.target.value)} required>
              <option value="">Seleccionar cliente…</option>
              {clientIds.map((id, i) => (
                <option key={id} value={id}>{clientNames[i]}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Tipo</label>
            <select className="field" value={type} onChange={e => setType(e.target.value as ContentEvent["type"])}>
              <option value="">—</option>
              {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Estado</label>
            <select className="field" value={status} onChange={e => setStatus(e.target.value as ContentEvent["status"])}>
              {CONTENT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Encargado</label>
            <select className="field" value={assignee} onChange={e => setAss(e.target.value)}>
              <option value="">—</option>
              {memberNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Fecha de publicación</label>
            <input type="datetime-local" className="field" value={scheduled} onChange={e => setSched(e.target.value)} />
          </div>
          <div className="field-group" style={{ gridColumn: "1/-1" }}>
            <label className="field-label">Objetivo</label>
            <input className="field" value={objetivo} onChange={e => setObj(e.target.value)} placeholder="Objetivo del contenido…" />
          </div>
        </form>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" form="add-plan-modal-form" className="btn btn-amber">+ Añadir contenido</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main view ─────────────────────────────────────────────────────────── */

export function PlanificacionView() {
  const rows = useLeadsStore((s) => s.rows);
  const members = useTeamStore((s) => s.members);
  const {
    contentEvents,
    addContentEvent,
    updateContentEvent,
    deleteContentEvent,
  } = useContentEventsStore();
  const { getWidth, setWidth, resizeModeEnabled, toggleResizeMode } = useColumnWidthsStore();
  const allWidths   = useColumnWidthsStore((s) => s.widths);
  const planRowHeight = allWidths["PLANIFICACION_rowHeight"] ?? 36;

  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [monthKey, setMonthKey] = useState(planTodayKey);
  const [clickedDate, setClickedDate] = useState<string | undefined>(undefined);

  const tableRef = useRef<HTMLTableElement>(null);
  const dragRef  = useRef<{
    col: string;
    startX: number;
    startWidth: number;
    tableStartWidth: number;
    th: HTMLTableCellElement;
  } | null>(null);

  const totalTableWidth = useMemo(
    () => PLAN_COLUMN_FIELDS.reduce((sum, f) => sum + (allWidths[`PLANIFICACION_${f.key}`] ?? f.defaultWidth), 0),
    [allWidths]
  );

  function startResize(e: React.MouseEvent<HTMLDivElement>, col: string, th: HTMLTableCellElement) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { col, startX: e.clientX, startWidth: th.offsetWidth, tableStartWidth: tableRef.current?.offsetWidth ?? 0, th };

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const newColW = Math.max(40, dragRef.current.startWidth + (ev.clientX - dragRef.current.startX));
      const delta   = newColW - dragRef.current.startWidth;
      dragRef.current.th.style.width = newColW + "px";
      if (tableRef.current) tableRef.current.style.width = (dragRef.current.tableStartWidth + delta) + "px";
    }
    function onUp(ev: MouseEvent) {
      if (!dragRef.current) return;
      const newW = Math.max(40, dragRef.current.startWidth + (ev.clientX - dragRef.current.startX));
      setWidth("PLANIFICACION", dragRef.current.col, newW);
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const clients = useMemo(() => rows.filter((r) => r.tab === "CLIENTES"), [rows]);
  const clientList = useMemo(
    () => clients.map((c) => ({ id: c.id, name: c.empresa || c.nombre || c.id })),
    [clients]
  );
  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c.empresa || c.nombre || c.id])),
    [clients]
  );
  const memberNames = members.map((m) => m.nombre);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return contentEvents
      .filter((ev) => {
        if (filterStatus && ev.status !== filterStatus) return false;
        if (filterType && ev.type !== filterType) return false;
        if (q) {
          const name = clientMap[ev.clientId] ?? "";
          if (
            !ev.title.toLowerCase().includes(q) &&
            !name.toLowerCase().includes(q) &&
            !(ev.objetivo ?? "").toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.clientId !== b.clientId) return a.clientId.localeCompare(b.clientId);
        return a.order - b.order;
      });
  }, [contentEvents, query, filterStatus, filterType, clientMap]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, ContentEvent[]> = {};
    for (const ev of contentEvents) {
      const d = (ev.scheduledDate ?? "").slice(0, 10);
      if (!d) continue;
      (map[d] ??= []).push(ev);
    }
    return map;
  }, [contentEvents]);

  const grid = useMemo(() => planBuildGrid(monthKey), [monthKey]);

  const todayStr = useMemo(() => {
    const { year, month: mo, day } = baParts();
    return `${year}-${mo}-${day}`;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTimerStart(id: string) {
    updateContentEvent(id, { timerRunning: true, timerStartedAt: Date.now() });
  }

  function handleTimerStop(ev: ContentEvent) {
    const elapsed = ev.timerStartedAt
      ? Math.floor((Date.now() - ev.timerStartedAt) / 1000)
      : 0;
    updateContentEvent(ev.id, {
      timerRunning: false,
      timerSeconds: ev.timerSeconds + elapsed,
      timerStartedAt: undefined,
    });
  }

  function handleTimerReset(id: string) {
    updateContentEvent(id, { timerRunning: false, timerSeconds: 0, timerStartedAt: undefined });
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="table-top">
        <div className="table-top-left">
          <div className="table-title-row">
            <h2 className="table-section-title">PLANIFICACIÓN</h2>
            <div className="table-section-subtitle">CONTENIDOS, TIMERS Y ESTADO DE PRODUCCIÓN</div>
          </div>
        </div>
        <div className="table-top-right">
          <div className="filters">
            <div className="search-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                className="search-input"
                placeholder="Buscar…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="btn btn-outline btn-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {CONTENT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              className="btn btn-outline btn-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={() => { setClickedDate(undefined); setShowAdd(true); }} className="btn btn-amber btn-sm" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14"/><path d="M5 12h14"/>
              </svg>
              Agregar contenido
            </button>
          </div>
        </div>
      </div>

        {/* Calendario mensual de contenidos */}
        <div style={{ borderBottom: "1px solid var(--slate-200)" }}>
          <div style={{ padding: "10px 16px", background: "var(--slate-50)", borderBottom: "1px solid var(--slate-200)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--dark)" }}>CALENDARIO DE CONTENIDOS</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button className="calendar-mini-btn" type="button" onClick={() => setMonthKey(k => planShiftMonth(k, -1))}>‹</button>
              <span style={{ fontSize: 11, fontWeight: 900, color: "var(--dark)", minWidth: 140, textAlign: "center", textTransform: "uppercase" }}>
                {planMonthLabel(monthKey)}
              </span>
              <button className="calendar-mini-btn" type="button" onClick={() => setMonthKey(k => planShiftMonth(k, 1))}>›</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", background: "#000" }}>
            {WEEKDAYS_SHORT.map((d, i) => (
              <div key={d} style={{ padding: "6px 2px", textAlign: "center", fontSize: 10, fontWeight: 900, color: "#fff", textTransform: "uppercase", borderRight: i < 6 ? "1.5px solid rgba(255,255,255,0.35)" : "none" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, padding: 6, background: "linear-gradient(160deg,#f1f5f9 0%,#f8fafc 50%,#ffffff 100%)" }}>
            {grid.map(({ date, inMonth }, idx) => {
              const isToday = date === todayStr;
              const dayEvs  = inMonth ? (eventsByDay[date] ?? []) : [];
              return (
                <div
                  key={idx}
                  className="cal-cell"
                  onClick={() => { if (!inMonth) return; setClickedDate(date); setShowAdd(true); }}
                  style={{ minHeight: 68, borderRadius: 10, padding: "5px 4px", cursor: inMonth ? "pointer" : "default", background: !inMonth ? "#f1f5f9" : isToday ? "#dbeafe" : "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.07),0 1px 2px rgba(0,0,0,0.04)" }}
                >
                  <span style={{ display: "inline-flex", width: 20, height: 20, alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: 10, fontWeight: 900, background: isToday ? "var(--dark)" : "transparent", color: isToday ? "#fff" : inMonth ? "#475569" : "#cbd5e1" }}>
                    {parseInt(date.slice(8))}
                  </span>
                  {dayEvs.slice(0, 3).map(ev => {
                    const color = STATUS_COLOR[ev.status] ?? "#94a3b8";
                    return (
                      <div key={ev.id} title={ev.title} style={{ marginTop: 2, padding: "1px 4px", borderRadius: 5, borderLeft: `3px solid ${color}`, background: color + "18", fontSize: 9, fontWeight: 800, color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.type || ev.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Banner modo resize */}
        {resizeModeEnabled && (
          <div className="col-resize-banner">
            <span>Modo edición libre activo — arrastrá el borde de las columnas para redimensionar.</span>
            <button className="btn btn-xs btn-dark" onClick={toggleResizeMode}>Desactivar</button>
          </div>
        )}

        {/* Tabla scrollable */}
        <div className="table-wrap">
          <table
            ref={tableRef}
            className="plan-table"
            style={{ width: totalTableWidth, tableLayout: "fixed" }}
          >
            <thead>
              <tr>
                {PLAN_COLUMN_FIELDS.map((f) => (
                  <th
                    key={f.key}
                    style={{
                      width: getWidth("PLANIFICACION", f.key),
                      position: resizeModeEnabled ? "relative" : undefined,
                    }}
                  >
                    {f.label}
                    {resizeModeEnabled && (
                      <div
                        className="col-resize-handle"
                        onMouseDown={(e) => {
                          const th = e.currentTarget.parentElement as HTMLTableCellElement;
                          startResize(e, f.key, th);
                        }}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 font-bold">
                    {contentEvents.length === 0
                      ? "Sin contenidos — agregá uno con el botón de arriba"
                      : "Sin resultados para los filtros aplicados"}
                  </td>
                </tr>
              )}
              {filtered.map((ev) => (
                <ContentRow
                  key={ev.id}
                  event={ev}
                  clients={clientList}
                  memberNames={memberNames}
                  rowHeight={planRowHeight}
                  onUpdate={(p) => updateContentEvent(ev.id, p)}
                  onDelete={() => deleteContentEvent(ev.id)}
                  onTimerStart={() => handleTimerStart(ev.id)}
                  onTimerStop={() => handleTimerStop(ev)}
                  onTimerReset={() => handleTimerReset(ev.id)}
                />
              ))}
            </tbody>
          </table>
        </div>

      {showAdd && (
        <AddModal
          clientIds={clients.map((c) => c.id)}
          clientNames={clients.map((c) => c.empresa || c.nombre || c.id)}
          memberNames={memberNames}
          initialDate={clickedDate}
          onAdd={(ev) => { addContentEvent(ev); setShowAdd(false); setClickedDate(undefined); }}
          onClose={() => { setShowAdd(false); setClickedDate(undefined); }}
        />
      )}
    </div>
  );
}
