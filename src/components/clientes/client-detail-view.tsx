"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLeadsStore } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { useContentEventsStore } from "@/store/content-events";
import { usePlansStore } from "@/store/plans";
import { CONTENT_TYPES, CONTENT_STATUS } from "@/lib/constants";
import { useColumnWidthsStore, PLAN_COLUMN_FIELDS } from "@/store/column-widths";
import { baParts } from "@/lib/dates";
import type { Lead, ContentEvent } from "@/types";

/* ── Calendar helpers ───────────────────────────────────────────────── */
const MONTH_NAMES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
const WEEKDAYS_SHORT = ["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"];

interface GridCell { date: string; inMonth: boolean; }

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
  return `${MONTH_NAMES[(m ?? 1) - 1]} ${y}`;
}
function buildGrid(key: string): GridCell[] {
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
function todayDate() {
  const { year, month: mo, day } = baParts();
  return `${year}-${mo}-${day}`;
}

/* ── Timer helpers ──────────────────────────────────────────────────── */
function getTimerSecs(ev: ContentEvent): number {
  if (!ev.timerRunning || !ev.timerStartedAt) return ev.timerSeconds;
  return ev.timerSeconds + Math.floor((Date.now() - ev.timerStartedAt) / 1000);
}
function formatTimer(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── Colores por tipo de contenido ──────────────────────────────────── */
const TYPE_COLOR: Record<string, string> = {
  CARRUSEL: "#f59e0b",
  REEL:     "#ec4899",
  PLACA:    "#8b5cf6",
  HISTORIA: "#0ea5e9",
};

const STATUS_ROW_CLASS: Record<string, string> = {
  "SIN EDITAR":    "plan-sin-editar",
  "EDITANDO":      "plan-editando",
  "COMPLETO":      "plan-completo",
  "CALENDARIZADO": "plan-calendarizado",
};

/* ── Slot → fecha real ──────────────────────────────────────────────── */
const SLOT_DAY_TO_DOW: Record<string, number> = {
  LUN: 1, MAR: 2, "MIÉ": 3, JUE: 4, VIE: 5, "SÁB": 6, DOM: 0,
};
const SLOT_WEEK_TO_IDX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };

function slotToDate(slot: string, year: number, month: number): string | undefined {
  const [dayCode, weekCode] = slot.split("_");
  const dow = SLOT_DAY_TO_DOW[dayCode];
  const weekIdx = SLOT_WEEK_TO_IDX[weekCode];
  if (dow === undefined || weekIdx === undefined) return undefined;
  const daysInMonth = new Date(year, month, 0).getDate();
  const matches: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month - 1, d).getDay() === dow) matches.push(d);
  }
  const day = matches[weekIdx];
  if (day === undefined) return undefined;
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

type CalEvent = { id: string; scheduledDate?: string; type: string; title: string };

/* ── Mini calendar ──────────────────────────────────────────────────── */
function ClientCalendarCard({
  title, monthKey, onShift, contentEvents: cevs, onDayClick,
}: {
  title: string;
  monthKey: string;
  onShift: (d: 1 | -1) => void;
  contentEvents: CalEvent[];
  onDayClick?: (date: string) => void;
}) {
  const isContent = title.includes("CONTENIDO");
  const grid      = useMemo(() => buildGrid(monthKey), [monthKey]);
  const today     = todayDate();

  const contentByDay = useMemo(() => {
    if (!isContent) return {} as Record<string, CalEvent[]>;
    const map: Record<string, CalEvent[]> = {};
    for (const ev of cevs) {
      const d = (ev.scheduledDate ?? "").slice(0, 10);
      if (!d) continue;
      (map[d] ??= []).push(ev);
    }
    return map;
  }, [cevs, isContent]);

  return (
    <div style={{ background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 22, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", background: "var(--slate-50)", borderBottom: "1px solid var(--slate-200)" }}>
        <span style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--dark)" }}>{title}</span>
      </div>
      {/* Nombres de días */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", background: "#000" }}>
        {WEEKDAYS_SHORT.map((d, i) => (
          <div key={d} style={{ padding: "6px 2px", textAlign: "center", fontSize: 10, fontWeight: 900, color: "#fff", textTransform: "uppercase", borderRight: i < 6 ? "1.5px solid rgba(255,255,255,0.35)" : "none" }}>
            {d}
          </div>
        ))}
      </div>
      {/* Celdas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, padding: 6, background: "linear-gradient(160deg,#f1f5f9 0%,#f8fafc 50%,#ffffff 100%)", borderRadius: "0 0 22px 22px" }}>
        {grid.map(({ date, inMonth }, idx) => {
          const isToday = date === today;
          const dayEvs  = inMonth && isContent ? (contentByDay[date] ?? []) : [];
          return (
            <div
              key={idx}
              className="cal-cell"
              onClick={() => inMonth && onDayClick?.(date)}
              style={{ minHeight: 68, borderRadius: 10, padding: "5px 4px", cursor: inMonth ? "pointer" : "default", background: !inMonth ? "#f1f5f9" : isToday ? "#dbeafe" : "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.07),0 1px 2px rgba(0,0,0,0.04)" }}
            >
              <span style={{ display: "inline-flex", width: 20, height: 20, alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: 10, fontWeight: 900, background: isToday ? "var(--dark)" : "transparent", color: isToday ? "#fff" : inMonth ? "#475569" : "#cbd5e1" }}>
                {parseInt(date.slice(8))}
              </span>
              {dayEvs.slice(0, 3).map(ev => {
                const color = TYPE_COLOR[ev.type] ?? "#94a3b8";
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
  );
}

/* ── Content table row ──────────────────────────────────────────────── */
function ContentRow({
  ev, tick, rowHeight, memberNames, onUpdate, onDelete,
}: {
  ev: ContentEvent;
  tick: number;
  rowHeight: number;
  memberNames: string[];
  onUpdate: (p: Partial<ContentEvent>) => void;
  onDelete: () => void;
}) {
  void tick;
  const secs    = getTimerSecs(ev);
  const running = ev.timerRunning;
  const statusClass = STATUS_ROW_CLASS[ev.status] ?? "";

  function toggleTimer() {
    if (running) {
      onUpdate({ timerRunning: false, timerSeconds: secs, timerStartedAt: undefined });
    } else {
      onUpdate({ timerRunning: true, timerStartedAt: Date.now() });
    }
  }
  function resetTimer() {
    onUpdate({ timerRunning: false, timerSeconds: 0, timerStartedAt: undefined });
  }

  return (
    <tr style={{ height: rowHeight }} className={statusClass}>
      <td>
        <div className="timer-cell">
          {running ? (
            <button type="button" className="btn timer-stop-sm-btn" onClick={toggleTimer}>■</button>
          ) : (
            <button type="button" className="btn timer-play-btn" onClick={toggleTimer}>▶</button>
          )}
          <button type="button" className="timer-reset-btn" onClick={resetTimer} title="Resetear">↺</button>
          <span className="timer-text">{formatTimer(secs)}</span>
        </div>
      </td>
      <td>
        <select className="cell-select" value={ev.assignee ?? ""} onChange={e => onUpdate({ assignee: e.target.value })}>
          <option value="">—</option>
          {memberNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </td>
      <td>
        <input type="datetime-local" className="cell-input" value={ev.scheduledDate ? (ev.scheduledDate.includes("T") ? ev.scheduledDate.slice(0,16) : `${ev.scheduledDate}T00:00`) : ""} onChange={e => onUpdate({ scheduledDate: e.target.value })} />
      </td>
      <td>
        <select className="cell-select" value={ev.type} onChange={e => onUpdate({ type: e.target.value as ContentEvent["type"] })}>
          <option value="">—</option>
          {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>
      <td>
        <select className="cell-select" value={ev.status} onChange={e => onUpdate({ status: e.target.value as ContentEvent["status"] })}>
          <option value="">—</option>
          {CONTENT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td>
        <input className="cell-input" value={ev.frase ?? ""} onChange={e => onUpdate({ frase: e.target.value })} placeholder="Idea…" />
      </td>
      <td>
        <input className="cell-input" value={ev.notes ?? ""} onChange={e => onUpdate({ notes: e.target.value })} placeholder="Feedback…" />
      </td>
      <td>
        <div style={{ display: "flex", justifyContent: "center", padding: "0 6px" }}>
          <button type="button" className="btn btn-xs btn-danger" onClick={() => { if (confirm("¿Eliminar contenido?")) onDelete(); }} title="Eliminar">✕</button>
        </div>
      </td>
    </tr>
  );
}

/* ── Confirm delete modal ───────────────────────────────────────────── */
function ConfirmDeleteModal({ clientName, onConfirm, onClose }: {
  clientName: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const canDelete = value === "Biomarketing";

  return (
    <div className="modal-backdrop open" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: "#dc2626" }}>Eliminar cliente</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ margin: "0 0 8px", color: "#475569", fontSize: 14, lineHeight: 1.5 }}>
            Estás por eliminar permanentemente a <strong>{clientName}</strong>. Esta acción no se puede deshacer.
          </p>
          <p style={{ margin: "0 0 16px", color: "#475569", fontSize: 14, lineHeight: 1.5 }}>
            Para confirmar, escribí <strong>Biomarketing</strong> en el campo de abajo:
          </p>
          <div className="field-group" style={{ margin: 0 }}>
            <input
              autoFocus
              className="field"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Biomarketing"
            />
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-sm btn-outline" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn btn-sm"
            style={{
              background: canDelete ? "#dc2626" : "#fca5a5",
              color: "#fff",
              borderColor: canDelete ? "#dc2626" : "#fca5a5",
              cursor: canDelete ? "pointer" : "not-allowed",
            }}
            disabled={!canDelete}
            onClick={onConfirm}
          >
            Eliminar definitivamente
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Client data modal ──────────────────────────────────────────────── */
function ClientDataModal({ lead, members, plans, onUpdate, onDelete, onToggleActivo, onClose }: {
  lead: Lead;
  members: string[];
  plans: { id: string; nombre: string }[];
  onUpdate: (p: Partial<Lead>) => void;
  onDelete: () => void;
  onToggleActivo: () => void;
  onClose: () => void;
}) {
  const [showClave, setShowClave]               = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showContacto2, setShowContacto2] = useState(() => !!(lead.nombre2 || lead.telefono2 || lead.cumpleanos2));

  return (
    <>
    {showConfirmDelete && (
      <ConfirmDeleteModal
        clientName={lead.empresa || lead.nombre || "este cliente"}
        onConfirm={onDelete}
        onClose={() => setShowConfirmDelete(false)}
      />
    )}
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Datos del cliente</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ overflowY: "auto", padding: "28px 32px", gap: 20 }}>

          {/* ── Contacto principal ────────────────────── */}
          <div className="field-group">
            <label className="field-label">Nombre</label>
            <input className="field" value={lead.nombre ?? ""} onChange={e => onUpdate({ nombre: e.target.value })} placeholder="Nombre" />
          </div>
          <div className="field-group">
            <label className="field-label">Cumpleaños</label>
            <input type="date" className="field" value={lead.cumpleanos ?? ""} onChange={e => onUpdate({ cumpleanos: e.target.value })} />
          </div>
          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label className="field-label">Teléfono</label>
            <input className="field" value={lead.telefono ?? ""} onChange={e => onUpdate({ telefono: e.target.value })} placeholder="Teléfono" />
          </div>

          {/* ── Segundo contacto (opcional) ────────────── */}
          {showContacto2 ? (
            <div style={{ gridColumn: "1 / -1", background: "var(--slate-50,#f8fafc)", borderRadius: 12, padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".04em" }}>Otro contacto</span>
                <button
                  type="button"
                  onClick={() => { setShowContacto2(false); onUpdate({ nombre2: "", telefono2: "", cumpleanos2: "" }); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 12, fontWeight: 600, padding: 0 }}
                >
                  Quitar
                </button>
              </div>
              <div className="field-group" style={{ margin: 0 }}>
                <label className="field-label">Nombre</label>
                <input autoFocus className="field" value={lead.nombre2 ?? ""} onChange={e => onUpdate({ nombre2: e.target.value })} placeholder="Nombre…" />
              </div>
              <div className="field-group" style={{ margin: 0 }}>
                <label className="field-label">Cumpleaños</label>
                <input type="date" className="field" value={lead.cumpleanos2 ?? ""} onChange={e => onUpdate({ cumpleanos2: e.target.value })} />
              </div>
              <div className="field-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
                <label className="field-label">Teléfono</label>
                <input className="field" value={lead.telefono2 ?? ""} onChange={e => onUpdate({ telefono2: e.target.value })} placeholder="Teléfono…" />
              </div>
            </div>
          ) : (
            <div style={{ gridColumn: "1 / -1" }}>
              <button
                type="button"
                onClick={() => setShowContacto2(true)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--amber)", fontSize: 13, fontWeight: 700, padding: 0 }}
              >
                + Agregar otro contacto
              </button>
            </div>
          )}

          {/* ── Empresa ───────────────────────────────── */}
          <div className="field-group">
            <label className="field-label">Empresa</label>
            <input className="field" value={lead.empresa ?? ""} onChange={e => onUpdate({ empresa: e.target.value })} placeholder="Empresa" />
          </div>
          <div className="field-group">
            <label className="field-label">Email</label>
            <input className="field" value={lead.email ?? ""} onChange={e => onUpdate({ email: e.target.value })} placeholder="Email" />
          </div>
          <div className="field-group">
            <label className="field-label">Rubro</label>
            <input className="field" value={lead.rubro ?? ""} onChange={e => onUpdate({ rubro: e.target.value })} placeholder="Rubro" />
          </div>
          <div className="field-group">
            <label className="field-label">Dirección</label>
            <input className="field" value={lead.direccion ?? ""} onChange={e => onUpdate({ direccion: e.target.value })} placeholder="Dirección" />
          </div>

          {/* ── Servicio / Responsables ───────────────── */}
          <div className="field-group">
            <label className="field-label">Servicio</label>
            <select className="field" value={lead.servicio ?? ""} onChange={e => onUpdate({ servicio: e.target.value })}>
              <option value="">—</option>
              <option value="Contenido Audiovisual">Contenido Audiovisual</option>
              <option value="Página Web">Página Web</option>
              <option value="Branding">Branding</option>
              <option value="Pauta Publicitaria">Pauta Publicitaria</option>
              <option value="Eventos y Acompañamiento">Eventos y Acompañamiento</option>
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Plan de contenido</label>
            <select className="field" value={lead.planId ?? ""} onChange={e => onUpdate({ planId: e.target.value || undefined })}>
              <option value="">Sin plan</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Responsable 1</label>
            <select className="field" value={lead.responsable1 ?? ""} onChange={e => onUpdate({ responsable1: e.target.value })}>
              <option value="">—</option>
              {members.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Responsable 2</label>
            <select className="field" value={lead.responsable2 ?? ""} onChange={e => onUpdate({ responsable2: e.target.value })}>
              <option value="">—</option>
              {members.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* ── Credenciales ──────────────────────────── */}
          <div className="field-group">
            <label className="field-label">Instagram</label>
            <input className="field" value={lead.instagram ?? ""} onChange={e => onUpdate({ instagram: e.target.value })} placeholder="Instagram" />
          </div>
          <div className="field-group">
            <label className="field-label">Clave</label>
            <div style={{ position: "relative" }}>
              <input
                type={showClave ? "text" : "password"}
                className="field"
                value={lead.clave ?? ""}
                onChange={e => onUpdate({ clave: e.target.value })}
                placeholder="Clave"
                style={{ paddingRight: 38 }}
              />
              <button
                type="button"
                onClick={() => setShowClave(v => !v)}
                title={showClave ? "Ocultar" : "Mostrar"}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "flex", alignItems: "center" }}
              >
                {showClave ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* ── Notas ─────────────────────────────────── */}
          <div className="field-group" style={{ gridColumn: "1/-1" }}>
            <label className="field-label">Objetivos</label>
            <textarea className="textarea" value={lead.objetivos ?? ""} onChange={e => onUpdate({ objetivos: e.target.value })} placeholder="Objetivos…" />
          </div>
          <div className="field-group" style={{ gridColumn: "1/-1" }}>
            <label className="field-label">Observaciones</label>
            <textarea className="textarea" value={lead.observaciones ?? ""} onChange={e => onUpdate({ observaciones: e.target.value })} placeholder="Observaciones…" />
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: "#dc2626", color: "#fff", borderColor: "#dc2626" }}
              onClick={() => setShowConfirmDelete(true)}
            >
              Borrar cliente
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={!(lead.activo ?? true) ? { color: "#16a34a", borderColor: "#16a34a" } : { color: "#64748b" }}
              onClick={onToggleActivo}
            >
              {(lead.activo ?? true) ? "Marcar inactivo" : "Marcar activo"}
            </button>
          </div>
          <button className="btn btn-sm btn-amber" onClick={onClose}>Listo</button>
        </div>
      </div>
    </div>
    </>
  );
}

/* ── Add content modal ──────────────────────────────────────────────── */
function AddContentModal({ clientId, memberNames, initialDate, onAdd, onClose }: {
  clientId: string;
  memberNames: string[];
  initialDate?: string;
  onAdd: (ev: Omit<ContentEvent, "id" | "order">) => void;
  onClose: () => void;
}) {
  const [title, setTitle]     = useState("");
  const [type, setType]       = useState<ContentEvent["type"]>("");
  const [status, setStatus]   = useState<ContentEvent["status"]>("SIN EDITAR");
  const [assignee, setAss]    = useState("");
  const [scheduled, setSched] = useState(() => {
    if (!initialDate) return "";
    if (initialDate.includes("T")) return initialDate.slice(0, 16);
    return `${initialDate}T00:00`;
  });
  const [objetivo, setObj]    = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      clientId, title, type, status,
      assignee: assignee || undefined,
      scheduledDate: scheduled || undefined,
      objetivo: objetivo || undefined,
      done: false, timerSeconds: 0, timerRunning: false,
    });
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Añadir contenido</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <form id="add-content-form" onSubmit={submit} style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field-group" style={{ gridColumn: "1/-1" }}>
            <label className="field-label">Título *</label>
            <input autoFocus className="field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título del contenido…" required />
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
          <button type="submit" form="add-content-form" className="btn btn-amber">+ Añadir contenido</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────────────────── */

interface Props { clientId: string; }

export function ClientDetailView({ clientId }: Props) {
  const router = useRouter();

  /* stores */
  const rows        = useLeadsStore(s => s.rows);
  const updateLead  = useLeadsStore(s => s.updateLead);
  const members     = useTeamStore(s => s.members);
  const {
    contentEvents,
    addContentEvent, updateContentEvent, deleteContentEvent,
  } = useContentEventsStore();
  const { plans, planEvents } = usePlansStore();

  const allWidths     = useColumnWidthsStore(s => s.widths);
  const getWidth      = useColumnWidthsStore(s => s.getWidth);
  const planRowHeight = allWidths["PLANIFICACION_rowHeight"] ?? 36;

  /* columnas del cliente — igual que planificación pero sin "cliente" */
  const clientDetailCols = useMemo(
    () => PLAN_COLUMN_FIELDS.filter(f => f.key !== "cliente"),
    []
  );
  const totalTableWidth = useMemo(
    () => clientDetailCols.reduce((sum, f) => sum + getWidth("PLANIFICACION", f.key), 0),
    [clientDetailCols, allWidths] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* state */
  const [monthKey, setMonthKey]     = useState(todayKey);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd]       = useState(false);
  const [clickedDate, setClickedDate] = useState<string | undefined>(undefined);
  const [showData, setShowData]     = useState(false);
  const [tick, setTick]             = useState(0);

  /* estado del cliente (carita) */
  const ESTADO_FACES = [
    { emoji: "😄", label: "Excelente", color: "#16a34a" },
    { emoji: "😊", label: "Bien",      color: "#22c55e" },
    { emoji: "😐", label: "Regular",   color: "#f59e0b" },
    { emoji: "😟", label: "Mal",       color: "#f97316" },
    { emoji: "😢", label: "Muy mal",   color: "#ef4444" },
  ];
  const ESTADO_KEY = `biomarketing_client_estado_${clientId}`;
  const [estadoIdx, setEstadoIdx] = useState<number>(() => {
    try { const v = localStorage.getItem(ESTADO_KEY); return v !== null ? Number(v) : 1; } catch { return 1; }
  });
  function cycleEstado() {
    const next = (estadoIdx + 1) % ESTADO_FACES.length;
    setEstadoIdx(next);
    try { localStorage.setItem(ESTADO_KEY, String(next)); } catch {}
  }

  /* timer tick every second */
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const lead    = rows.find(r => r.id === clientId);
  const clients = useMemo(() => rows.filter(r => r.tab === "CLIENTES"), [rows]);
  const curIdx  = clients.findIndex(r => r.id === clientId);

  const memberNames = members.map(m => m.nombre);

  const myContent = useMemo(
    () => contentEvents
      .filter(e => e.clientId === clientId)
      .sort((a, b) => new Date(b.scheduledDate ?? "").getTime() - new Date(a.scheduledDate ?? "").getTime()),
    [contentEvents, clientId]
  );

  /* eventos del plan asignado — slots resueltos al mes visible */
  const myPlanEvents = useMemo(() => {
    if (!lead?.planId) return [];
    const [y, m] = monthKey.split("-").map(Number);
    return planEvents
      .filter(e => e.planId === lead.planId)
      .flatMap(e => {
        if (e.planSlot) {
          const date = slotToDate(e.planSlot, y, m ?? 1);
          if (!date) return [];
          return [{ ...e, scheduledDate: date }];
        }
        return e.scheduledDate ? [e] : [];
      });
  }, [planEvents, lead?.planId, monthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* filter content by search — all months */
  const filtered = useMemo(() => {
    if (!search) return myContent;
    const q = search.toLowerCase();
    return myContent.filter(e =>
      [e.title, e.type, e.status, e.assignee, e.frase, e.notes].some(f => (f ?? "").toLowerCase().includes(q))
    );
  }, [myContent, search]);

  function navigate(delta: 1 | -1) {
    const next = clients[(curIdx + delta + clients.length) % clients.length];
    if (next) router.push(`/clientes/${next.id}`);
  }

  const patch = useCallback((p: Partial<Lead>) => updateLead(clientId, p), [clientId, updateLead]);

  function deleteClient() {
    if (!confirm("¿Eliminar este cliente? Esta acción no se puede deshacer.")) return;
    useLeadsStore.getState().deleteLead(clientId);
    router.push("/clientes");
  }

  if (!lead) {
    return (
      <div className="empty" style={{ padding: "60px 20px" }}>
        Cliente no encontrado.{" "}
        <button onClick={() => router.push("/clientes")} style={{ color: "var(--dark)", textDecoration: "underline", fontWeight: 700 }}>
          Volver
        </button>
      </div>
    );
  }
  const title = lead.empresa || lead.nombre || "Sin nombre";

  return (
    <section className="client-detail-page">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="client-detail-head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {clients.length > 1 && (
            <div style={{ display: "flex", gap: 4 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(-1)} style={{ fontSize: 16, padding: "4px 10px" }}>‹</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(1)}  style={{ fontSize: 16, padding: "4px 10px" }}>›</button>
            </div>
          )}
          <button
            type="button"
            onClick={cycleEstado}
            title={ESTADO_FACES[estadoIdx].label}
            style={{ fontSize: 28, lineHeight: 1, background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
          >
            {ESTADO_FACES[estadoIdx].emoji}
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <h2 className="client-detail-title" style={{ margin: 0 }}>{title}</h2>
              {lead.servicio && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>{lead.servicio}</span>
              )}
              {(lead.activo ?? true) ? (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 20, padding: "2px 10px", whiteSpace: "nowrap" }}>Activo</span>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 20, padding: "2px 10px", whiteSpace: "nowrap" }}>Inactivo</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button className="btn btn-sm btn-outline" type="button" onClick={() => setMonthKey(k => shiftMonth(k, -1))}>‹</button>
            <span className="btn btn-sm btn-outline" style={{ pointerEvents: "none", minWidth: 110, textAlign: "center" }}>
              {monthLabel(monthKey)}
            </span>
            <button className="btn btn-sm btn-outline" type="button" onClick={() => setMonthKey(k => shiftMonth(k, 1))}>›</button>
          </div>
          <button type="button" className="btn btn-amber btn-sm" onClick={() => setShowData(true)}>
            Datos del cliente
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => router.push("/clientes")}>
            Volver
          </button>
        </div>
      </div>

      {/* ── Contenido principal ─────────────────────────────────────── */}
      <div className="client-detail-body" style={{ padding: "16px" }}>
          {/* Two calendars side by side */}
          <div className="cd-cal-grid">
            <ClientCalendarCard
              title="CALENDARIO DE GESTIÓN"
              monthKey={monthKey}
              onShift={d => setMonthKey(k => shiftMonth(k, d))}
              contentEvents={[]}
              onDayClick={date => { setClickedDate(date); setShowAdd(true); }}
            />
            <ClientCalendarCard
              title="CALENDARIO DE CONTENIDO"
              monthKey={monthKey}
              onShift={d => setMonthKey(k => shiftMonth(k, d))}
              contentEvents={[...myContent, ...myPlanEvents]}
              onDayClick={date => { setClickedDate(date); setShowAdd(true); }}
            />
          </div>
      </div>

      {/* Content planning table — full width */}
      <div className="cd-table-panel" style={{ borderRadius: 0, border: "none", borderTop: "1px solid var(--slate-200)" }}>

            {/* Table header */}
            <div className="cd-table-head">
              <div>
                <h2 className="cd-table-title">
                  PLANIFICACIÓN DE CONTENIDOS
                  <span className="cd-table-subtitle"> LISTA DE CONTENIDOS DEL CLIENTE</span>
                </h2>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div className="search-wrap">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                  <input
                    className="search-input"
                    placeholder="Buscar…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <button type="button" className="btn btn-amber btn-sm" onClick={() => setShowAdd(true)}>
                  + Añadir contenido
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="cd-table-wrap">
              <table className="plan-table" style={{ width: totalTableWidth, tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    {clientDetailCols.map(f => (
                      <th key={f.key} style={{ width: getWidth("PLANIFICACION", f.key) }}>{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "32px 16px", color: "#94a3b8", fontWeight: 700 }}>
                        Sin contenidos.{" "}
                        <button type="button" onClick={() => setShowAdd(true)} style={{ color: "var(--amber)", fontWeight: 900, textDecoration: "underline", cursor: "pointer" }}>
                          Añadir contenido
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filtered.map(ev => (
                      <ContentRow
                        key={ev.id}
                        ev={ev}
                        tick={tick}
                        rowHeight={planRowHeight}
                        memberNames={memberNames}
                        onUpdate={p => updateContentEvent(ev.id, p)}
                        onDelete={() => deleteContentEvent(ev.id)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {showData && (
        <ClientDataModal
          lead={lead}
          members={memberNames}
          plans={plans}
          onUpdate={patch}
          onDelete={deleteClient}
          onToggleActivo={() => patch({ activo: !(lead.activo ?? true) })}
          onClose={() => setShowData(false)}
        />
      )}
      {showAdd && (
        <AddContentModal
          clientId={clientId}
          memberNames={memberNames}
          initialDate={clickedDate}
          onAdd={ev => { addContentEvent(ev); setShowAdd(false); setClickedDate(undefined); }}
          onClose={() => { setShowAdd(false); setClickedDate(undefined); }}
        />
      )}
    </section>
  );
}
