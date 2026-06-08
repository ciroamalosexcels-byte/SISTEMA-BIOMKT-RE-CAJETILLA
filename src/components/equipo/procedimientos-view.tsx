"use client";

import { useEffect, useRef, useState } from "react";
import { saveToSheets } from "@/lib/sheets";

/* ── Types ─────────────────────────────────────────────────────── */
interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  done: boolean;
  icon?: string;
  duration?: string;
}

/* ── Íconos disponibles para pasos ─────────────────────────────── */
const STEP_ICONS: Record<string, { label: string; d: string }> = {
  flag:     { label: "Inicio",     d: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" },
  rocket:   { label: "Arranque",   d: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" },
  star:     { label: "Destacado",  d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  trophy:   { label: "Hito",       d: "M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0012 0V2z" },
  crown:    { label: "Logro",      d: "M2 20h20M5 20l2.5-8 4.5 3 4.5-3 2.5 8" },
  target:   { label: "Objetivo",   d: "M22 12A10 10 0 1112 2a10 10 0 0110 10zM12 12m-4 0a4 4 0 108 0 4 4 0 00-8 0M12 12h.01" },
  zap:      { label: "Urgente",    d: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
  warning:  { label: "Atención",   d: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" },
  lock:     { label: "Bloqueado",  d: "M19 11H5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4" },
  bookmark: { label: "Referencia", d: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" },
  heart:    { label: "Pasión",     d: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" },
  finish:   { label: "Meta final", d: "M5 3v18M5 3h14l-3 4.5 3 4.5H5" },
};
interface Procedure {
  id: string;
  name: string;
  steps: RoadmapStep[];
}

/* ── Storage ────────────────────────────────────────────────────── */
const STORAGE_KEY = "biomarketing_procedures_v3";

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadProcedures(): Procedure[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // Migrate from roadmap_v1 (flat step array)
    const v1 = localStorage.getItem("biomarketing_roadmap_v1");
    if (v1) {
      const steps = JSON.parse(v1) as RoadmapStep[];
      if (steps.length > 0)
        return [{ id: makeId(), name: "Procedimiento General", steps }];
    }
    // Migrate from procedures_v1 (nombre/contenido)
    const old = localStorage.getItem("biomarketing_procedures_v1");
    if (old) {
      const procs = JSON.parse(old) as Array<{ id: string; nombre: string; contenido: string }>;
      if (procs.length > 0)
        return [{
          id: makeId(),
          name: "Procedimientos importados",
          steps: procs.map((p) => ({ id: p.id, title: p.nombre, description: p.contenido, done: false })),
        }];
    }
  } catch {}
  return [];
}

const MAX_PASOS = 30;

function persistProcs(procs: Procedure[]) {
  if (typeof window !== "undefined")
    localStorage.setItem(STORAGE_KEY, JSON.stringify(procs));
  saveToSheets({ action: "saveProcedures", procedimientos: procsToSheetsRows(procs) }).catch(() => {});
}

function procsToSheetsRows(procs: Procedure[]): Array<Record<string, unknown>> {
  const now = new Date().toISOString();
  return procs.map((proc) => {
    const row: Record<string, unknown> = {
      id: proc.id,
      titulo: proc.name,
      categoria: "",
      totalPasos: proc.steps.length,
      creadoEn: "",
      actualizadoEn: now,
    };
    for (let i = 1; i <= MAX_PASOS; i++) {
      const step = proc.steps[i - 1];
      row[`paso_${i}`]      = step?.title       ?? "";
      row[`paso_${i}_desc`] = step?.description ?? "";
      row[`paso_${i}_done`] = step?.done ? "SI" : "";
    }
    return row;
  });
}

/* ── SVG roadmap layout ─────────────────────────────────────────── */
const STEPS_PER_ROW = 5;
const NODE_R  = 30;  // 38 × 0.8
const PLUS_R  = 21;  // 26 × 0.8
const H_STEP  = 168;
const V_STEP  = 120; // must equal 2 × TURN_R
const TURN_R  = 60;
const PAD_X   = 110;
const PAD_Y   = 108;
const LBL_GAP = 12;
const SVG_VW  = PAD_X + 4 * H_STEP + TURN_R + 44; // ≈ 921

function nodePos(idx: number) {
  const row = Math.floor(idx / STEPS_PER_ROW);
  const posInRow = idx % STEPS_PER_ROW;
  const col = row % 2 === 0 ? posInRow : STEPS_PER_ROW - 1 - posInRow;
  return { cx: PAD_X + col * H_STEP, cy: PAD_Y + row * V_STEP, row, col };
}

function buildSnakePath(count: number): string {
  if (count < 2) return "";
  const CR = 18;        // radio de la esquina redondeada
  const EXT = TURN_R;  // cuánto se extiende la línea más allá del último nodo antes de doblar
  let d = "";
  for (let i = 0; i < count; i++) {
    const { cx, cy, row } = nodePos(i);
    if (i === 0) {
      d = `M ${cx} ${cy}`;
    } else {
      const prev = nodePos(i - 1);
      if (prev.row === row) {
        d += ` L ${cx} ${cy}`;
      } else if (prev.row % 2 === 0) {
        // giro derecho: horizontal → baja → horizontal (esquinas pequeñas)
        const rx = cx + EXT;
        d += ` L ${rx - CR} ${prev.cy}`;
        d += ` A ${CR} ${CR} 0 0 1 ${rx} ${prev.cy + CR}`;
        d += ` L ${rx} ${cy - CR}`;
        d += ` A ${CR} ${CR} 0 0 1 ${rx - CR} ${cy}`;
        d += ` L ${cx} ${cy}`;
      } else {
        // giro izquierdo: horizontal → baja → horizontal (esquinas pequeñas)
        const lx = cx - EXT;
        d += ` L ${lx + CR} ${prev.cy}`;
        d += ` A ${CR} ${CR} 0 0 0 ${lx} ${prev.cy + CR}`;
        d += ` L ${lx} ${cy - CR}`;
        d += ` A ${CR} ${CR} 0 0 0 ${lx + CR} ${cy}`;
        d += ` L ${cx} ${cy}`;
      }
    }
  }
  return d;
}

function wrapLabel(title: string): [string, string] {
  const MAX = 15;
  if (title.length <= MAX) return [title, ""];
  const words = title.split(" ");
  let line1 = "";
  for (const w of words) {
    const c = line1 ? `${line1} ${w}` : w;
    if (c.length <= MAX) line1 = c;
    else break;
  }
  if (!line1) line1 = title.slice(0, MAX - 1) + "…";
  const rest = title.slice(line1.length).trim();
  const line2 = rest.length > MAX ? rest.slice(0, MAX - 1) + "…" : rest;
  return [line1, line2];
}

/* ── Main view ──────────────────────────────────────────────────── */
export function ProcedimientosView() {
  const [procs, setProcs] = useState<Procedure[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newProcModal, setNewProcModal] = useState(false);

  useEffect(() => { setProcs(loadProcedures()); }, []);

  function saveProcs(list: Procedure[]) { setProcs(list); persistProcs(list); }

  function addProcedure(name: string) {
    const p: Procedure = { id: makeId(), name: name.trim(), steps: [] };
    saveProcs([...procs, p]);
    setSelectedId(p.id);
  }

  function renameProcedure(id: string, name: string) {
    saveProcs(procs.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function deleteProcedure(id: string) {
    if (!confirm("¿Eliminar este procedimiento y todos sus pasos?")) return;
    saveProcs(procs.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updateSteps(id: string, steps: RoadmapStep[]) {
    saveProcs(procs.map((p) => (p.id === id ? { ...p, steps } : p)));
  }

  const selected = procs.find((p) => p.id === selectedId) ?? null;

  if (selected) {
    return (
      <RoadmapView
        proc={selected}
        onBack={() => setSelectedId(null)}
        onUpdateSteps={(steps) => updateSteps(selected.id, steps)}
        onRename={(name) => renameProcedure(selected.id, name)}
        onDelete={() => { deleteProcedure(selected.id); }}
      />
    );
  }

  return (
    <div className="team-panel-page mock-team-v23">
      <div className="team-panel-head">
        <div className="team-panel-title-wrap">
          <h2 className="team-panel-title">PROCEDIMIENTOS</h2>
          <div className="team-panel-sub">SELECCIONÁ UN PROCESO PARA VER SU ROADMAP</div>
        </div>
        <button className="btn btn-amber" onClick={() => setNewProcModal(true)}>
          + Nuevo proceso
        </button>
      </div>

      <div className="team-panel-body" style={{ padding: "24px 20px" }}>
        {procs.length === 0 ? (
          <div className="proc-empty-state">
            <div style={{ fontSize: 48, marginBottom: 12, opacity: .3 }}>🗺</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--dark)", marginBottom: 6 }}>
              Todavía no hay procesos
            </div>
            <div style={{ fontSize: 13, color: "var(--slate-400)", marginBottom: 20 }}>
              Creá un proceso para empezar a armar el roadmap de pasos.
            </div>
            <button className="btn btn-amber" onClick={() => setNewProcModal(true)}>
              + Crear primer proceso
            </button>
          </div>
        ) : (
          <div className="proc-grid">
            {procs.map((proc) => {
              const total = proc.steps.length;
              const done  = proc.steps.filter((s) => s.done).length;
              const pct   = total === 0 ? 0 : Math.round((done / total) * 100);
              return (
                <div
                  key={proc.id}
                  className="proc-card"
                  onClick={() => setSelectedId(proc.id)}
                >
                  <div className="proc-card-name">{proc.name}</div>
                  <div className="proc-card-meta">
                    {total === 0
                      ? "Sin pasos aún"
                      : `${done} de ${total} pasos completados`}
                  </div>
                  {total > 0 && (
                    <div className="proc-progress-track">
                      <div className="proc-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <div className="proc-card-footer">
                    <span className="proc-card-pct">{total === 0 ? "—" : `${pct}%`}</span>
                    <button
                      className="btn btn-xs btn-outline proc-card-del"
                      title="Eliminar proceso"
                      onClick={(e) => { e.stopPropagation(); deleteProcedure(proc.id); }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="proc-card proc-card-add" onClick={() => setNewProcModal(true)}>
              <div className="proc-card-add-icon">+</div>
              <div className="proc-card-add-label">Nuevo proceso</div>
            </div>
          </div>
        )}
      </div>

      {newProcModal && (
        <NewProcModal
          onSave={addProcedure}
          onCancel={() => setNewProcModal(false)}
        />
      )}
    </div>
  );
}

/* ── Roadmap view (single procedure) ───────────────────────────── */
function RoadmapView({
  proc, onBack, onUpdateSteps, onRename, onDelete,
}: {
  proc: Procedure;
  onBack: () => void;
  onUpdateSteps: (steps: RoadmapStep[]) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const steps = proc.steps;
  const [viewMode, setViewMode]  = useState<"roadmap" | "tres-pasos">("roadmap");
  const [tooltip, setTooltip]   = useState<{ x: number; y: number; step: RoadmapStep } | null>(null);
  const [viewModal, setViewModal] = useState<RoadmapStep | null>(null);
  const [editModal, setEditModal] = useState<{ step: Partial<RoadmapStep>; isNew: boolean } | null>(null);
  const [ctxMenu, setCtxMenu]   = useState<{ x: number; y: number; idx: number } | null>(null);
  const [renaming, setRenaming]  = useState(false);
  const [renameTxt, setRenameTxt] = useState(proc.name);
  const ctxMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const h = (e: MouseEvent) => {
      if (ctxMenuRef.current?.contains(e.target as Node)) return;
      setCtxMenu(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ctxMenu]);

  function save(list: RoadmapStep[]) { onUpdateSteps(list); }

  function addStep(title: string, description: string, duration?: string) {
    save([...steps, { id: makeId(), title: title.trim(), description: description.trim(), done: false, duration: duration?.trim() || undefined }]);
  }

  function updateStep(id: string, changes: Partial<RoadmapStep>) {
    save(steps.map((s) => (s.id === id ? { ...s, ...changes } : s)));
  }

  function toggleDone(id: string) {
    save(steps.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
    setViewModal((v) => (v?.id === id ? { ...v, done: !v.done } : v));
  }

  function deleteStep(idx: number) {
    if (!confirm("¿Eliminar este paso?")) return;
    save(steps.filter((_, i) => i !== idx));
    setCtxMenu(null);
  }

  function setStepIcon(idx: number, icon: string) {
    save(steps.map((s, i) => i === idx ? { ...s, icon: icon || undefined } : s));
    setCtxMenu(null);
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const t = idx + dir;
    if (t < 0 || t >= steps.length) return;
    const list = [...steps];
    [list[idx], list[t]] = [list[t], list[idx]];
    save(list);
    setCtxMenu(null);
  }

  const totalNodes = steps.length + 1;
  const numRows    = Math.max(1, Math.ceil(totalNodes / STEPS_PER_ROW));
  const svgVH      = PAD_Y + (numRows - 1) * V_STEP + NODE_R + 72;
  const plusPos    = nodePos(steps.length);
  const pathD      = buildSnakePath(totalNodes);

  return (
    <div className="team-panel-page mock-team-v23">
      <div className="team-panel-head">
        <div className="team-panel-title-wrap">
          <button className="proc-back-btn" onClick={onBack} title="Volver a procedimientos">
            ← Volver
          </button>
          {renaming ? (
            <form
              style={{ display: "flex", gap: 8, alignItems: "center" }}
              onSubmit={(e) => {
                e.preventDefault();
                if (renameTxt.trim()) { onRename(renameTxt.trim()); setRenaming(false); }
              }}
            >
              <input
                className="field"
                value={renameTxt}
                onChange={(e) => setRenameTxt(e.target.value)}
                autoFocus
                style={{ fontWeight: 800, fontSize: 18 }}
              />
              <button className="btn btn-amber btn-sm" type="submit">OK</button>
              <button className="btn btn-outline btn-sm" type="button" onClick={() => setRenaming(false)}>Cancelar</button>
            </form>
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h2 className="team-panel-title">{proc.name.toUpperCase()}</h2>
              <button
                className="btn btn-outline btn-sm"
                style={{ fontSize: 11 }}
                onClick={() => { setRenameTxt(proc.name); setRenaming(true); }}
              >
                Renombrar
              </button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Selector de vista */}
          <div style={{ display: "flex", gap: 4, background: "var(--slate-100,#f1f5f9)", borderRadius: 10, padding: 3 }}>
            <button
              className={viewMode === "roadmap" ? "btn btn-dark btn-sm" : "btn btn-outline btn-sm"}
              style={{ fontSize: 12, borderRadius: 8 }}
              onClick={() => setViewMode("roadmap")}
            >
              Roadmap
            </button>
            <button
              className={viewMode === "tres-pasos" ? "btn btn-dark btn-sm" : "btn btn-outline btn-sm"}
              style={{ fontSize: 12, borderRadius: 8 }}
              onClick={() => setViewMode("tres-pasos")}
            >
              Tres pasos
            </button>
          </div>
          <button
            className="btn btn-outline btn-sm"
            style={{ color: "#dc2626", borderColor: "#dc2626" }}
            onClick={onDelete}
          >
            Eliminar proceso
          </button>
        </div>
      </div>

      {/* ── Vista Tres Pasos ── */}
      {viewMode === "tres-pasos" && (
        <TresPasosView
          steps={steps}
          onStepClick={(step) => setViewModal(step)}
          onAddStep={() => setEditModal({ step: { title: "", description: "", done: false }, isNew: true })}
        />
      )}

      {/* ── Vista Roadmap ── */}
      {viewMode === "roadmap" && (
      <div
        className="team-panel-body"
        style={{ padding: "20px 16px 32px", overflowX: "auto" }}
        onClick={() => setCtxMenu(null)}
      >
        <svg
          viewBox={`0 0 ${SVG_VW} ${svgVH}`}
          width="100%"
          style={{ display: "block", minWidth: Math.min(SVG_VW, 480) }}
          onClick={() => setCtxMenu(null)}
        >
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--slate-200)"
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {steps.map((step, idx) => {
            const { cx, cy, row } = nodePos(idx);
            const labelAbove = row % 2 === 0;
            const [l1, l2] = wrapLabel(step.title);
            const textBaseY = labelAbove
              ? cy - NODE_R - LBL_GAP - (l2 ? 14 : 0)
              : cy + NODE_R + LBL_GAP + (l2 ? 14 : 0);

            return (
              <g
                key={step.id}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, step })}
                onMouseMove={(e) => setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : null))}
                onMouseLeave={() => setTooltip(null)}
                onClick={(e) => { e.stopPropagation(); setViewModal(step); }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCtxMenu({ x: e.clientX, y: e.clientY, idx });
                }}
              >
                <circle
                  cx={cx} cy={cy} r={NODE_R}
                  fill="var(--surface, #fff)"
                  stroke={step.done ? "#157a4d" : "var(--slate-300)"}
                  strokeWidth={step.done ? 4 : 3}
                />
                {step.done ? (
                  <path
                    d={`M ${cx - 10} ${cy} L ${cx - 3} ${cy + 7} L ${cx + 10} ${cy - 8}`}
                    fill="none" stroke="#157a4d" strokeWidth={4}
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                ) : step.icon && STEP_ICONS[step.icon] ? (
                  <g>
                    <path
                      d={STEP_ICONS[step.icon].d}
                      fill="none"
                      stroke="#d97706"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      transform={`translate(${cx - 7},${cy - 12})`}
                    />
                    <circle cx={cx - 18} cy={cy - 18} r={9} fill="white" stroke="var(--slate-200)" strokeWidth={1.5} />
                    <text
                      x={cx - 18} y={cy - 18} textAnchor="middle" dominantBaseline="central"
                      fontSize={9} fontWeight={800} fill="var(--dark)"
                    >
                      {idx + 1}
                    </text>
                  </g>
                ) : (
                  <text
                    x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                    fontSize={12} fontWeight={800} fill="var(--dark)"
                  >
                    {idx + 1}
                  </text>
                )}
                <text textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--dark)">
                  <tspan x={cx} y={textBaseY}>{l1}</tspan>
                  {l2 && <tspan x={cx} dy={14}>{l2}</tspan>}
                </text>
              </g>
            );
          })}

          <g
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              setEditModal({ step: { title: "", description: "", done: false }, isNew: true });
            }}
          >
            <circle
              cx={plusPos.cx} cy={plusPos.cy} r={PLUS_R}
              fill="none" stroke="var(--slate-300)" strokeWidth={2.5} strokeDasharray="5 4"
            />
            <text
              x={plusPos.cx} y={plusPos.cy}
              textAnchor="middle" dominantBaseline="central"
              fontSize={26} fontWeight={300} fill="var(--slate-400)"
            >
              +
            </text>
          </g>
        </svg>
      </div>
      )} {/* fin roadmap */}

      {/* Tooltip */}
      {tooltip && (
        <div className="roadmap-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}>
          <div className="roadmap-tooltip-title">{tooltip.step.title}</div>
          {tooltip.step.description && (
            <div className="roadmap-tooltip-desc">
              {tooltip.step.description.length > 140
                ? tooltip.step.description.slice(0, 140) + "…"
                : tooltip.step.description}
            </div>
          )}
        </div>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <div
          ref={ctxMenuRef}
          className="roadmap-ctx-menu"
          style={{ left: ctxMenu.x, top: ctxMenu.y, minWidth: 180 }}
        >
          <button
            className="roadmap-ctx-btn"
            onClick={() => { setEditModal({ step: { ...steps[ctxMenu.idx] }, isNew: false }); setCtxMenu(null); }}
          >
            Editar
          </button>
          {ctxMenu.idx > 0 && (
            <button className="roadmap-ctx-btn" onClick={() => moveStep(ctxMenu.idx, -1)}>Mover arriba</button>
          )}
          {ctxMenu.idx < steps.length - 1 && (
            <button className="roadmap-ctx-btn" onClick={() => moveStep(ctxMenu.idx, 1)}>Mover abajo</button>
          )}
          <div style={{ borderTop: "1px solid var(--slate-200)", margin: "4px 0 2px" }} />
          <div style={{ padding: "2px 10px 4px", fontSize: 10, fontWeight: 700, color: "var(--slate-400)", letterSpacing: "0.06em" }}>ÍCONO</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 2, padding: "0 6px 6px" }}>
            {Object.entries(STEP_ICONS).map(([key, icon]) => (
              <button
                key={key}
                title={icon.label}
                onClick={() => setStepIcon(ctxMenu.idx, key)}
                style={{
                  width: 28, height: 28, padding: 4, border: "1px solid var(--slate-200)",
                  borderRadius: 6, background: steps[ctxMenu.idx]?.icon === key ? "var(--amber)" : "#fff",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={icon.d} />
                </svg>
              </button>
            ))}
            {steps[ctxMenu.idx]?.icon && (
              <button
                title="Quitar ícono"
                onClick={() => setStepIcon(ctxMenu.idx, "")}
                style={{
                  width: 28, height: 28, padding: 4, border: "1px solid var(--slate-200)",
                  borderRadius: 6, background: "#fff", cursor: "pointer",
                  fontSize: 12, color: "var(--slate-400)", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >✕</button>
            )}
          </div>
          <div style={{ borderTop: "1px solid var(--slate-200)", margin: "0 0 2px" }} />
          <button className="roadmap-ctx-btn roadmap-ctx-danger" onClick={() => deleteStep(ctxMenu.idx)}>
            Eliminar
          </button>
        </div>
      )}

      {/* View / detail modal */}
      {viewModal && (
        <div className="modal-backdrop open" onClick={() => setViewModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{viewModal.title}</h3>
              <button className="roadmap-modal-close" onClick={() => setViewModal(null)}>×</button>
            </div>
            <div style={{ padding: "20px 24px", color: "var(--dark)", fontSize: 14, lineHeight: 1.6, minHeight: 80 }}>
              {viewModal.description || <span style={{ color: "var(--slate-400)" }}>Sin descripción.</span>}
            </div>
            <div className="modal-footer">
              <button
                className={`btn ${viewModal.done ? "btn-outline" : "btn-amber"}`}
                onClick={() => toggleDone(viewModal.id)}
              >
                {viewModal.done ? "Desmarcar completado" : "Marcar como completado"}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => { setEditModal({ step: { ...viewModal }, isNew: false }); setViewModal(null); }}
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / add step modal */}
      {editModal && (
        <EditStepModal
          step={editModal.step}
          isNew={editModal.isNew}
          onSave={(title, description, duration) => {
            if (editModal.isNew) addStep(title, description, duration);
            else updateStep(editModal.step.id!, { title, description, duration: duration || undefined });
            setEditModal(null);
          }}
          onCancel={() => setEditModal(null)}
        />
      )}
    </div>
  );
}

/* ── Vista Tres Pasos ───────────────────────────────────────────── */
function TresPasosView({ steps, onStepClick, onAddStep }: {
  steps: RoadmapStep[];
  onStepClick: (step: RoadmapStep) => void;
  onAddStep: () => void;
}) {
  if (steps.length === 0) {
    return (
      <div style={{ padding: "60px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 12 }}>📋</div>
        <div style={{ fontWeight: 800, fontSize: 15, color: "var(--dark)", marginBottom: 8 }}>Sin pasos aún</div>
        <button className="btn btn-amber" onClick={onAddStep}>+ Agregar primer paso</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 24px 48px", overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", minWidth: steps.length * 220, position: "relative" }}>

        {/* Línea horizontal que conecta los círculos */}
        <div style={{
          position: "absolute",
          top: 48,
          left: 80,
          right: 80,
          height: 2,
          background: "var(--slate-200,#e2e8f0)",
          zIndex: 0,
        }} />

        {steps.map((step, idx) => (
          <div
            key={step.id}
            onClick={() => onStepClick(step)}
            style={{
              flex: 1,
              minWidth: 200,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: "pointer",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Círculo numerado */}
            <div style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              border: `4px solid ${step.done ? "#157a4d" : "var(--slate-200,#e2e8f0)"}`,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: step.done ? 0 : 32,
              fontWeight: 700,
              color: "var(--dark,#07152f)",
              position: "relative",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              transition: "border-color 0.2s",
            }}>
              {step.done ? (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#157a4d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <span>{idx + 1}</span>
              )}
            </div>

            {/* Flecha hacia abajo */}
            <div style={{ fontSize: 20, color: "var(--slate-300,#cbd5e1)", margin: "10px 0 14px", lineHeight: 1 }}>↓</div>

            {/* Contenido */}
            <div style={{ textAlign: "center", padding: "0 12px", width: "100%" }}>
              <div style={{
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--dark,#07152f)",
                marginBottom: 10,
                lineHeight: 1.3,
              }}>
                {step.title}
              </div>
              {step.description && (
                <div style={{
                  fontSize: 12,
                  color: "var(--slate-500,#64748b)",
                  lineHeight: 1.55,
                  marginBottom: 14,
                  fontWeight: 400,
                }}>
                  {step.description}
                </div>
              )}
              {step.duration && (
                <div style={{
                  display: "inline-block",
                  background: "#dcfce7",
                  color: "#166534",
                  fontSize: 11,
                  fontWeight: 800,
                  borderRadius: 20,
                  padding: "3px 14px",
                  letterSpacing: "0.04em",
                }}>
                  {step.duration}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Botón agregar paso */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 120, zIndex: 1 }}>
          <div
            onClick={onAddStep}
            style={{
              width: 96, height: 96, borderRadius: "50%",
              border: "2.5px dashed var(--slate-300,#cbd5e1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 32, color: "var(--slate-300,#cbd5e1)",
              background: "#fff",
            }}
          >+</div>
          <div style={{ marginTop: 24, fontSize: 11, color: "var(--slate-400)", fontWeight: 600 }}>Agregar paso</div>
        </div>
      </div>
    </div>
  );
}

/* ── Modal: new procedure ────────────────────────────────────────── */
function NewProcModal({ onSave, onCancel }: { onSave: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  return (
    <div className="modal-backdrop open" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Nuevo proceso</h3>
          <button className="roadmap-modal-close" onClick={onCancel}>×</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <label className="roadmap-field-label">Nombre del proceso</label>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Onboarding de clientes…"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name)}
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
          <button
            className="btn btn-amber"
            disabled={!name.trim()}
            onClick={() => { if (name.trim()) onSave(name); }}
          >
            Crear proceso
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal: edit / add step ─────────────────────────────────────── */
function EditStepModal({
  step, isNew, onSave, onCancel,
}: {
  step: Partial<RoadmapStep>;
  isNew: boolean;
  onSave: (title: string, description: string, duration: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle]       = useState(step.title ?? "");
  const [description, setDesc]  = useState(step.description ?? "");
  const [duration, setDuration]  = useState(step.duration ?? "");
  return (
    <div className="modal-backdrop open" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isNew ? "Nuevo paso" : "Editar paso"}</h3>
          <button className="roadmap-modal-close" onClick={onCancel}>×</button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="roadmap-field-label">Título</label>
            <input
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre del paso…"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && title.trim() && onSave(title, description, duration)}
            />
          </div>
          <div>
            <label className="roadmap-field-label">Descripción</label>
            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describí el paso, instrucciones o notas…"
              rows={4}
              style={{ resize: "vertical" }}
            />
          </div>
          <div>
            <label className="roadmap-field-label">Duración (ej: 30 MIN)</label>
            <input
              className="field"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="30 MIN, 1 HORA…"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
          <button
            className="btn btn-amber"
            disabled={!title.trim()}
            onClick={() => { if (title.trim()) onSave(title, description, duration); }}
          >
            {isNew ? "Agregar paso" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
