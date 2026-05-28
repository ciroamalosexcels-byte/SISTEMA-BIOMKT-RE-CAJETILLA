"use client";

import { useMemo } from "react";
import { useLeadsStore } from "@/store/leads";
import type { Lead } from "@/types";

const PIN_COLORS: Record<string, string> = {
  CLIENTES:    "#22c55e",
  SEGUIMIENTO: "#f59e0b",
  REUNION_1:   "#38bdf8",
  REUNION_2:   "#a855f7",
  CRM:         "#64748b",
  BASE:        "#64748b",
};

function hash(str: string, range: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % range;
}

function pinPos(lead: Lead) {
  const seed = lead.direccion || lead.empresa || lead.nombre || lead.id;
  return { x: 6 + hash(seed + "x", 86), y: 8 + hash(seed + "y", 78) };
}

function getTitle(lead: Lead) {
  return lead.empresa || lead.nombre || "Sin nombre";
}

const LEGEND = [
  { label: "Clientes",     color: "#22c55e" },
  { label: "Seguimientos", color: "#f59e0b" },
  { label: "Reunión 1",    color: "#38bdf8" },
  { label: "Reunión 2",    color: "#a855f7" },
  { label: "Otros",        color: "#64748b" },
];

export function MapaView() {
  const rows = useLeadsStore((s) => s.rows);

  const pins = useMemo(
    () =>
      rows
        .filter((r) => ["CLIENTES", "SEGUIMIENTO", "REUNION_1", "REUNION_2"].includes(r.tab))
        .map((lead, idx) => ({
          lead,
          idx: idx + 1,
          ...pinPos(lead),
          color: PIN_COLORS[lead.tab] ?? "#64748b",
        })),
    [rows]
  );

  return (
    <section className="map-panel-v30">
      <div className="panel-head">
        <div className="panel-title-row">
          <h2 className="panel-title">MAPA</h2>
          <div className="panel-subtitle">CLIENTES, SEGUIMIENTOS Y REUNIONES</div>
        </div>
      </div>

      <div className="map-canvas-v30">
        {pins.map(({ lead, idx, x, y, color }) => (
          <a
            key={lead.id}
            className="map-pin-v30"
            style={{ left: `${x}%`, top: `${y}%`, background: color }}
            href={`https://www.google.com/maps/search/${encodeURIComponent(
              (lead.direccion || getTitle(lead)) + " Mar del Plata Argentina"
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            title={`${getTitle(lead)} · ${lead.direccion || "Sin dirección"} · ${lead.tab}`}
          >
            <span>{idx}</span>
          </a>
        ))}
        {pins.length === 0 && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "var(--slate-400)", fontWeight: 700, fontSize: 14,
          }}>
            Sin leads para mostrar en el mapa.
          </div>
        )}
      </div>

      <div className="map-legend-v30">
        {LEGEND.map((l) => (
          <span key={l.label} style={{ borderLeft: `4px solid ${l.color}` }}>{l.label}</span>
        ))}
      </div>
    </section>
  );
}
