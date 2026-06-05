"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLeadsStore } from "@/store/leads";
import { useContentEventsStore } from "@/store/content-events";
import type { Lead } from "@/types";

function progressClass(pct: number) {
  if (pct >= 0.8) return "progress-green";
  if (pct >= 0.4) return "progress-amber";
  return "progress-red";
}

function ClientCard({
  lead, progress, contentCount, onClick,
  isDragging, isDragOver,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  lead: Lead;
  progress: number;
  contentCount: number;
  onClick: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const title   = lead.empresa || lead.nombre || "Sin nombre";
  const service = lead.servicio || "—";
  const pct     = Math.round(progress * 100);
  const activo  = lead.activo ?? true;

  return (
    <div
      className="client-card-v11"
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        opacity: isDragging ? 0.35 : activo ? 1 : 0.55,
        display: "flex",
        flexDirection: "column",
        cursor: "grab",
        outline: isDragOver ? "2px solid var(--amber, #f6bf26)" : "none",
        outlineOffset: isDragOver ? "-2px" : "0",
        transition: "opacity 0.15s, outline 0.1s",
        position: "relative",
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          position: "absolute", top: 10, right: 10,
          color: "#cbd5e1", fontSize: 13, lineHeight: 1,
          pointerEvents: "none", userSelect: "none",
          letterSpacing: -1,
        }}
        title="Arrastrá para reordenar"
      >
        ⠿
      </div>

      <div className="client-card-main-v11">
        <div className="client-card-text-v11">
          <h3 style={{ margin: 0, paddingRight: 18 }}>{title}</h3>
          <div className="client-card-v11-service">{service}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 3 }}>
            {contentCount} contenido{contentCount !== 1 ? "s" : ""}
          </div>
        </div>
        <div
          className={`client-progress-circle ${progressClass(progress)}`}
          style={{ "--pct": pct } as React.CSSProperties}
        >
          <span>{pct}%</span>
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 10 }}>
        {activo ? (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 20, padding: "2px 10px" }}>
            Activo
          </span>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 20, padding: "2px 10px" }}>
            Inactivo
          </span>
        )}
      </div>
    </div>
  );
}

export function ClientesView() {
  const rows         = useLeadsStore((s) => s.rows);
  const updateLead   = useLeadsStore((s) => s.updateLead);
  const managementEvents = useContentEventsStore((s) => s.managementEvents);
  const contentEvents    = useContentEventsStore((s) => s.contentEvents);
  const router = useRouter();

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const clients = useMemo(() => {
    const list = rows.filter((r) => r.tab === "CLIENTES");
    return [...list].sort((a, b) => {
      const ao = a.clientOrder ?? Infinity;
      const bo = b.clientOrder ?? Infinity;
      return ao !== bo ? ao - bo : 0;
    });
  }, [rows]);

  function getProgress(clientId: string) {
    const events = managementEvents.filter((e) => e.clientId === clientId);
    if (events.length === 0) return 0;
    return events.filter((e) => e.done).length / events.length;
  }

  function getContentCount(clientId: string) {
    return contentEvents.filter((e) => e.clientId === clientId).length;
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragId) setOverId(id);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }

    const fromIdx = clients.findIndex(c => c.id === dragId);
    const toIdx   = clients.findIndex(c => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...clients];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    // Persiste solo los que cambiaron de posición
    reordered.forEach((c, i) => {
      if (c.clientOrder !== i) updateLead(c.id, { clientOrder: i });
    });

    setDragId(null);
    setOverId(null);
  }

  function handleDragEnd() {
    setDragId(null);
    setOverId(null);
  }

  function exportCSV() {
    const header = "Nombre,Empresa,Teléfono";
    const rows = clients.map(c => {
      const nombre   = `"${(c.nombre  || "").replace(/"/g, '""')}"`;
      const empresa  = `"${(c.empresa || "").replace(/"/g, '""')}"`;
      const telefono = `"${(c.telefono || "").replace(/"/g, '""')}"`;
      return `${nombre},${empresa},${telefono}`;
    });
    const csv  = [header, ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="clients-v11-panel">
      <div className="panel-head">
        <div className="panel-title-row">
          <h2 className="panel-title">CLIENTES</h2>
          <div className="panel-subtitle">
            {clients.length} ACTIVO{clients.length !== 1 ? "S" : ""}
          </div>
        </div>
        {clients.length > 0 && (
          <button
            onClick={exportCSV}
            className="btn btn-outline btn-sm"
            style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}
          >
            ↓ Exportar CSV
          </button>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="empty" style={{ padding: "60px 24px" }}>
          Sin clientes aún — mové leads a la etapa CLIENTES para verlos aquí.
        </div>
      ) : (
        <div className="client-grid-v11">
          {clients.map((lead) => (
            <ClientCard
              key={lead.id}
              lead={lead}
              progress={getProgress(lead.id)}
              contentCount={getContentCount(lead.id)}
              onClick={() => !dragId && router.push(`/clientes/${lead.id}`)}
              isDragging={dragId === lead.id}
              isDragOver={overId === lead.id}
              onDragStart={(e) => handleDragStart(e, lead.id)}
              onDragOver={(e) => handleDragOver(e, lead.id)}
              onDrop={(e) => handleDrop(e, lead.id)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
