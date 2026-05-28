"use client";

import { useState } from "react";
import { useColumnWidthsStore, COLUMN_FIELDS, COLUMN_TABS, PLAN_COLUMN_FIELDS, PLAN_ROW_HEIGHT_DEFAULT } from "@/store/column-widths";
import { useLeadsStore } from "@/store/leads";
import type { Lead } from "@/types";

const TAB_LABELS: Record<string, string> = {
  CRM:        "CRM",
  REUNION_1:  "Reunión 1",
  REUNION_2:  "Reunión 2",
  SEGUIMIENTO:"Seguimiento",
  CLIENTES:   "Clientes",
  BASE:       "Base",
};

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

interface Props {
  onClose: () => void;
}

/* ── Límites por columna (px): [min, max] ───────────────────────────── */
const COL_LIMITS: Record<string, [number, number]> = {
  nombre:        [100, 200],
  empresa:       [100, 200],
  observaciones: [120, 260],
  telefono:      [ 90, 140],
  responsable1:  [100, 160],
  responsable2:  [100, 160],
  fechaContacto: [110, 150],
  meetingDatetime:[120, 170],
  empresaBio:    [100, 145],
  medio:         [ 90, 130],
  actions:       [140, 200],
};

const CHAR_PX  = 7.2;  // px por carácter estimado
const CELL_PAD = 28;   // padding total de la celda

function computeAutoWidths(rows: Lead[], tab: string): Record<string, number> {
  const tabRows = tab === "BASE" ? rows : rows.filter((r) => r.tab === tab);
  const result: Record<string, number> = {};

  for (const f of COLUMN_FIELDS) {
    let maxLen = f.label.length;
    for (const row of tabRows) {
      const val = String((row as unknown as Record<string, unknown>)[f.key] ?? "");
      if (val.length > maxLen) maxLen = val.length;
    }
    const [mn, mx] = COL_LIMITS[f.key] ?? [80, 300];
    result[f.key] = Math.min(mx, Math.max(mn, Math.round(maxLen * CHAR_PX + CELL_PAD)));
  }
  return result;
}

export function ColumnWidthsModal({ onClose }: Props) {
  const { widths, setTabWidths, toggleResizeMode, resizeModeEnabled } = useColumnWidthsStore();
  const rows = useLeadsStore((s) => s.rows);

  const [local, setLocal] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    for (const tab of COLUMN_TABS)
      for (const f of COLUMN_FIELDS)
        r[`${tab}_${f.key}`] = String(widths[`${tab}_${f.key}`] ?? f.defaultWidth);
    for (const f of PLAN_COLUMN_FIELDS)
      r[`PLANIFICACION_${f.key}`] = String(widths[`PLANIFICACION_${f.key}`] ?? f.defaultWidth);
    r["PLANIFICACION_rowHeight"] = String(widths["PLANIFICACION_rowHeight"] ?? PLAN_ROW_HEIGHT_DEFAULT);
    return r;
  });

  function applyWidths() {
    for (const tab of COLUMN_TABS) {
      const colWidths: Record<string, number> = {};
      for (const f of COLUMN_FIELDS)
        colWidths[f.key] = Math.max(40, parseInt(local[`${tab}_${f.key}`]) || f.defaultWidth);
      setTabWidths(tab, colWidths);
    }
    const planWidths: Record<string, number> = {};
    for (const f of PLAN_COLUMN_FIELDS)
      planWidths[f.key] = Math.max(40, parseInt(local[`PLANIFICACION_${f.key}`]) || f.defaultWidth);
    planWidths["rowHeight"] = Math.max(24, parseInt(local["PLANIFICACION_rowHeight"]) || PLAN_ROW_HEIGHT_DEFAULT);
    setTabWidths("PLANIFICACION", planWidths);
  }

  function save() {
    applyWidths();
    onClose();
  }

  function handleEditFreely() {
    applyWidths();
    toggleResizeMode();
    onClose();
  }

  function autoFit() {
    const next = { ...local };
    for (const tab of COLUMN_TABS) {
      const computed = computeAutoWidths(rows, tab);
      for (const f of COLUMN_FIELDS) {
        next[`${tab}_${f.key}`] = String(computed[f.key]);
      }
    }
    setLocal(next);
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 980, width: "95vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Configurar ancho de columnas</h2>
          <button className="icon-btn" onClick={onClose}><CloseIcon /></button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", maxHeight: "65vh" }}>
          <div className="column-settings-grid">
            {COLUMN_TABS.map((tab) => (
              <div key={tab} className="column-settings-section">
                <div className="column-settings-section-title">{TAB_LABELS[tab]}</div>
                <div className="column-settings-fields">
                  {COLUMN_FIELDS.map((f) => {
                    const k = `${tab}_${f.key}`;
                    return (
                      <div key={f.key} className="column-settings-row">
                        <span>{f.label}</span>
                        <input
                          className="column-settings-input"
                          type="number"
                          min="40"
                          value={local[k]}
                          onChange={(e) => setLocal((p) => ({ ...p, [k]: e.target.value }))}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Planificación de contenidos */}
            <div className="column-settings-section" style={{ gridColumn: "1 / -1" }}>
              <div className="column-settings-section-title">Planificación de contenidos</div>
              <div className="column-settings-fields" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                {/* Alto de fila */}
                <div className="column-settings-row" style={{ background: "var(--amber-light, #fffbeb)", borderRadius: 8, padding: "4px 6px" }}>
                  <span style={{ fontWeight: 800 }}>Alto de fila</span>
                  <input
                    className="column-settings-input"
                    type="number"
                    min="24"
                    max="120"
                    value={local["PLANIFICACION_rowHeight"]}
                    onChange={(e) => setLocal((p) => ({ ...p, "PLANIFICACION_rowHeight": e.target.value }))}
                  />
                </div>
                {/* Anchos de columnas */}
                {PLAN_COLUMN_FIELDS.filter(f => f.label).map((f) => {
                  const k = `PLANIFICACION_${f.key}`;
                  return (
                    <div key={f.key} className="column-settings-row">
                      <span>{f.label}</span>
                      <input
                        className="column-settings-input"
                        type="number"
                        min="40"
                        value={local[k]}
                        onChange={(e) => setLocal((p) => ({ ...p, [k]: e.target.value }))}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn btn-sm ${resizeModeEnabled ? "btn-amber" : "btn-outline"}`}
              type="button"
              onClick={handleEditFreely}
            >
              {resizeModeEnabled ? "Desactivar edición libre" : "Editar libremente"}
            </button>
            <button
              className="btn btn-sm btn-outline"
              type="button"
              onClick={autoFit}
              title="Calcula el ancho óptimo de cada columna según el contenido real"
            >
              ⚡ Ajustar automáticamente
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
            <button className="btn btn-dark" onClick={save}>Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
