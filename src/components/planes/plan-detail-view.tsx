"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePlansStore } from "@/store/plans";
import { useTeamStore } from "@/store/team";
import { useColumnWidthsStore, PLAN_COLUMN_FIELDS } from "@/store/column-widths";
import { CONTENT_TYPES, CONTENT_STATUS } from "@/lib/constants";
import type { PlanEvent } from "@/types";

/* ── Slot constants ─────────────────────────────────────────────────── */
const PLAN_DAYS = ["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"] as const;
const PLAN_WEEKS = ["A","B","C","D","E"] as const;
const PLAN_SLOTS = PLAN_WEEKS.flatMap(w => PLAN_DAYS.map(d => ({ key: `${d}_${w}`, label: `${d} ${w}` })));

/* ── Timer helpers ──────────────────────────────────────────────────── */
function computeSeconds(ev: PlanEvent): number {
  if (!ev.timerRunning || !ev.timerStartedAt) return ev.timerSeconds;
  return ev.timerSeconds + Math.floor((Date.now() - ev.timerStartedAt) / 1000);
}
function formatTimer(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

/* ── Status / type maps ─────────────────────────────────────────────── */
const TYPE_COLOR: Record<string, string> = {
  CARRUSEL: "#f59e0b", REEL: "#ec4899", PLACA: "#8b5cf6", HISTORIA: "#0ea5e9",
};
const STATUS_ROW_CLASS: Record<string, string> = {
  "SIN EDITAR": "plan-sin-editar", "EDITANDO": "plan-editando",
  "COMPLETO": "plan-completo", "CALENDARIZADO": "plan-calendarizado",
};

/* ── Timer cell ─────────────────────────────────────────────────────── */
function TimerCell({ ev, onStart, onStop, onReset }: {
  ev: PlanEvent; onStart: () => void; onStop: () => void; onReset: () => void;
}) {
  const [display, setDisplay] = useState(() => computeSeconds(ev));
  useEffect(() => {
    setDisplay(computeSeconds(ev));
    if (!ev.timerRunning) return;
    const id = setInterval(() => setDisplay(computeSeconds(ev)), 1000);
    return () => clearInterval(id);
  }, [ev.timerRunning, ev.timerStartedAt, ev.timerSeconds]);
  return (
    <div className="timer-cell">
      {ev.timerRunning
        ? <button className="btn timer-stop-sm-btn" onClick={onStop}>■</button>
        : <button className="btn timer-play-btn" onClick={onStart}>▶</button>}
      <button className="btn timer-reset-btn" onClick={onReset} title="Resetear">↺</button>
      <span className="timer-text">{formatTimer(display)}</span>
    </div>
  );
}

/* ── Content row ────────────────────────────────────────────────────── */
function ContentRow({ ev, memberNames, rowHeight, onUpdate, onDelete, onTimerStart, onTimerStop, onTimerReset }: {
  ev: PlanEvent; memberNames: string[]; rowHeight: number;
  onUpdate: (p: Partial<PlanEvent>) => void; onDelete: () => void;
  onTimerStart: () => void; onTimerStop: () => void; onTimerReset: () => void;
}) {
  return (
    <tr style={{ height: rowHeight }} className={STATUS_ROW_CLASS[ev.status] ?? ""}>
      <td><TimerCell ev={ev} onStart={onTimerStart} onStop={onTimerStop} onReset={onTimerReset} /></td>
      <td>
        <select className="cell-select" value={ev.assignee ?? ""} onChange={e => onUpdate({ assignee: e.target.value })}>
          <option value="">—</option>
          {memberNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </td>
      <td>
        <select className="cell-select" value={ev.planSlot ?? ""} onChange={e => onUpdate({ planSlot: e.target.value || undefined })}>
          <option value="">—</option>
          {PLAN_SLOTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </td>
      <td>
        <select className="cell-select" value={ev.type} onChange={e => onUpdate({ type: e.target.value as PlanEvent["type"] })}>
          <option value="">—</option>
          {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>
      <td>
        <select className="cell-select" value={ev.status} onChange={e => onUpdate({ status: e.target.value as PlanEvent["status"] })}>
          <option value="">—</option>
          {CONTENT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td><input className="cell-input" value={ev.frase ?? ""} onChange={e => onUpdate({ frase: e.target.value })} placeholder="Idea…" /></td>
      <td><input className="cell-input" value={ev.notes ?? ""} onChange={e => onUpdate({ notes: e.target.value })} placeholder="Feedback…" /></td>
      <td>
        <div style={{ display: "flex", justifyContent: "center", padding: "0 6px" }}>
          <button className="btn btn-xs btn-danger" onClick={() => { if (confirm("¿Eliminar contenido?")) onDelete(); }}>✕</button>
        </div>
      </td>
    </tr>
  );
}

/* ── Add plan event modal ───────────────────────────────────────────── */
function AddPlanEventModal({ planId, memberNames, initialSlot, onAdd, onClose }: {
  planId: string; memberNames: string[]; initialSlot?: string;
  onAdd: (ev: Omit<PlanEvent, "id" | "order">) => void; onClose: () => void;
}) {
  const [title,  setTitle]  = useState("");
  const [type,   setType]   = useState<PlanEvent["type"]>("");
  const [status, setStatus] = useState<PlanEvent["status"]>("SIN EDITAR");
  const [assignee, setAss]  = useState("");
  const [slot,   setSlot]   = useState(initialSlot ?? "");
  const [frase,  setFrase]  = useState("");
  const [notes,  setNotes]  = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ planId, title, type, status, assignee: assignee || undefined, planSlot: slot || undefined, frase: frase || undefined, notes: notes || undefined, done: false, timerSeconds: 0, timerRunning: false });
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Agregar contenido al plan</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <form id="add-plan-ev-form" onSubmit={submit} style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field-group" style={{ gridColumn: "1/-1" }}>
            <label className="field-label">Título *</label>
            <input autoFocus className="field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título del contenido…" required />
          </div>
          <div className="field-group">
            <label className="field-label">Tipo</label>
            <select className="field" value={type} onChange={e => setType(e.target.value as PlanEvent["type"])}>
              <option value="">—</option>
              {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Estado</label>
            <select className="field" value={status} onChange={e => setStatus(e.target.value as PlanEvent["status"])}>
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
            <label className="field-label">Día del plan</label>
            <select className="field" value={slot} onChange={e => setSlot(e.target.value)}>
              <option value="">—</option>
              {PLAN_SLOTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div className="field-group" style={{ gridColumn: "1/-1" }}>
            <label className="field-label">Idea</label>
            <input className="field" value={frase} onChange={e => setFrase(e.target.value)} placeholder="Idea…" />
          </div>
          <div className="field-group" style={{ gridColumn: "1/-1" }}>
            <label className="field-label">Feedback</label>
            <input className="field" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Feedback…" />
          </div>
        </form>
        <div className="modal-footer">
          <button type="button" className="btn btn-sm btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" form="add-plan-ev-form" className="btn btn-sm btn-amber">+ Agregar</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────────────────── */
export function PlanDetailView({ planId }: { planId: string }) {
  const router = useRouter();
  const { plans, planEvents, updatePlan, deletePlan, addPlanEvent, updatePlanEvent, deletePlanEvent } = usePlansStore();
  const members   = useTeamStore(s => s.members);
  const allWidths = useColumnWidthsStore(s => s.widths);
  const getWidth  = useColumnWidthsStore(s => s.getWidth);
  const planRowHeight = allWidths["PLANIFICACION_rowHeight"] ?? 36;

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal]         = useState("");
  const [showAdd, setShowAdd]         = useState(false);
  const [clickedSlot, setClickedSlot] = useState<string | undefined>(undefined);

  const tableRef = useRef<HTMLTableElement>(null);
  const dragRef  = useRef<{ col: string; startX: number; startWidth: number; th: HTMLTableCellElement } | null>(null);
  const { setWidth, resizeModeEnabled } = useColumnWidthsStore();

  const plan = plans.find(p => p.id === planId);
  const myEvents = useMemo(
    () => planEvents.filter(e => e.planId === planId).sort((a, b) => a.order - b.order),
    [planEvents, planId]
  );
  const memberNames = members.map(m => m.nombre);

  /* columnas — igual que planificación sin "cliente" */
  const cols = useMemo(() => PLAN_COLUMN_FIELDS.filter(f => f.key !== "cliente"), []);
  const totalTableWidth = useMemo(
    () => cols.reduce((s, f) => s + getWidth("PLANIFICACION", f.key), 0),
    [cols, allWidths] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* slot map */
  const eventsBySlot = useMemo(() => {
    const map: Record<string, PlanEvent[]> = {};
    for (const ev of myEvents) {
      const s = ev.planSlot ?? "";
      if (!s) continue;
      (map[s] ??= []).push(ev);
    }
    return map;
  }, [myEvents]);

  function startResize(e: React.MouseEvent<HTMLDivElement>, col: string, th: HTMLTableCellElement) {
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { col, startX: e.clientX, startWidth: th.offsetWidth, th };
    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const w = Math.max(40, dragRef.current.startWidth + (ev.clientX - dragRef.current.startX));
      dragRef.current.th.style.width = w + "px";
    }
    function onUp(ev: MouseEvent) {
      if (!dragRef.current) return;
      setWidth("PLANIFICACION", dragRef.current.col, Math.max(40, dragRef.current.startWidth + (ev.clientX - dragRef.current.startX)));
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  if (!plan) {
    return (
      <div className="empty" style={{ padding: "60px 20px" }}>
        Plan no encontrado.{" "}
        <button onClick={() => router.push("/planes")} style={{ color: "var(--dark)", textDecoration: "underline", fontWeight: 700 }}>Volver</button>
      </div>
    );
  }

  return (
    <section className="client-detail-page">

      {/* Header */}
      <div className="client-detail-head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {editingName ? (
            <input
              autoFocus
              className="field"
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={() => { if (nameVal.trim()) updatePlan(planId, { nombre: nameVal.trim() }); setEditingName(false); }}
              onKeyDown={e => { if (e.key === "Enter") { if (nameVal.trim()) updatePlan(planId, { nombre: nameVal.trim() }); setEditingName(false); } if (e.key === "Escape") setEditingName(false); }}
              style={{ fontSize: 20, fontWeight: 900, width: 300 }}
            />
          ) : (
            <h2 className="client-detail-title" style={{ cursor: "pointer" }} onClick={() => { setNameVal(plan.nombre); setEditingName(true); }}>
              {plan.nombre}
              <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginLeft: 8 }}>✎</span>
            </h2>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button" className="btn btn-sm btn-outline"
            style={{ color: "#dc2626", borderColor: "#dc2626" }}
            onClick={() => { if (confirm("¿Eliminar este plan?")) { deletePlan(planId); router.push("/planes"); } }}
          >
            Borrar plan
          </button>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => router.push("/planes")}>Volver</button>
        </div>
      </div>

      <div className="client-detail-body" style={{ padding: 16 }}>

        {/* Plantilla de slots del plan */}
        <div style={{ background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 22, overflow: "hidden", marginBottom: 20 }}>
          {/* Celdas de slots */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, padding: 6, background: "linear-gradient(160deg,#f1f5f9 0%,#f8fafc 50%,#ffffff 100%)" }}>
            {PLAN_SLOTS.map(({ key, label }) => {
              const slotEvs = eventsBySlot[key] ?? [];
              return (
                <div
                  key={key}
                  className="cal-cell"
                  onClick={() => { setClickedSlot(key); setShowAdd(true); }}
                  style={{ minHeight: 68, borderRadius: 10, padding: "5px 4px", cursor: "pointer", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.07),0 1px 2px rgba(0,0,0,0.04)" }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 5, fontSize: 9, fontWeight: 900, color: "#1e293b", padding: "1px 4px", background: "#e2e8f0" }}>
                    {label}
                  </span>
                  {slotEvs.slice(0, 3).map(ev => {
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

        {/* Tabla de contenidos */}
        <div className="cd-table-panel">
          <div className="cd-table-head">
            <h2 className="cd-table-title">
              CONTENIDOS DEL PLAN
              <span className="cd-table-subtitle"> {myEvents.length} contenido{myEvents.length !== 1 ? "s" : ""}</span>
            </h2>
            <button className="btn btn-amber btn-sm" type="button" onClick={() => { setClickedSlot(undefined); setShowAdd(true); }}>
              + Agregar contenido
            </button>
          </div>

          {resizeModeEnabled && (
            <div className="col-resize-banner">
              <span>Modo edición libre — arrastrá el borde de las columnas.</span>
            </div>
          )}

          <div className="cd-table-wrap">
            <table ref={tableRef} className="plan-table" style={{ width: totalTableWidth, tableLayout: "fixed" }}>
              <thead>
                <tr>
                  {cols.map(f => (
                    <th key={f.key} style={{ width: getWidth("PLANIFICACION", f.key), position: resizeModeEnabled ? "relative" : undefined }}>
                      {f.key === "fecha" ? "Día del plan" : f.label}
                      {resizeModeEnabled && (
                        <div className="col-resize-handle" onMouseDown={e => startResize(e, f.key, e.currentTarget.parentElement as HTMLTableCellElement)} />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myEvents.length === 0 ? (
                  <tr><td colSpan={cols.length} style={{ textAlign: "center", padding: "32px 16px", color: "#94a3b8", fontWeight: 700 }}>
                    Sin contenidos — agregá uno con el botón de arriba.
                  </td></tr>
                ) : myEvents.map(ev => (
                  <ContentRow
                    key={ev.id}
                    ev={ev}
                    memberNames={memberNames}
                    rowHeight={planRowHeight}
                    onUpdate={p => updatePlanEvent(ev.id, p)}
                    onDelete={() => deletePlanEvent(ev.id)}
                    onTimerStart={() => updatePlanEvent(ev.id, { timerRunning: true, timerStartedAt: Date.now() })}
                    onTimerStop={() => {
                      const elapsed = ev.timerStartedAt ? Math.floor((Date.now() - ev.timerStartedAt) / 1000) : 0;
                      updatePlanEvent(ev.id, { timerRunning: false, timerSeconds: ev.timerSeconds + elapsed, timerStartedAt: undefined });
                    }}
                    onTimerReset={() => updatePlanEvent(ev.id, { timerRunning: false, timerSeconds: 0, timerStartedAt: undefined })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAdd && (
        <AddPlanEventModal
          planId={planId}
          memberNames={memberNames}
          initialSlot={clickedSlot}
          onAdd={ev => { addPlanEvent(ev); setShowAdd(false); setClickedSlot(undefined); }}
          onClose={() => { setShowAdd(false); setClickedSlot(undefined); }}
        />
      )}
    </section>
  );
}
