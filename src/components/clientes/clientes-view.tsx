"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLeadsStore } from "@/store/leads";
import { useContentEventsStore } from "@/store/content-events";
import { currentMonthBA, monthLabel, shiftMonth, todayBA } from "@/lib/dates";
import { CONTENIDOS_CATEGORIAS } from "@/lib/constants";
import { getContratadoProgress, getEstadoProgress, progressClass } from "@/lib/client-progress";
import { resolveMonthlyContent } from "@/lib/client-monthly-content";
import { BulkEventsModal } from "./bulk-events-modal";
import { useClientMonthlyContentStore } from "@/store/client-monthly-content";
import { MonthPickerMenu } from "@/components/shared/month-picker-menu";
import type { ClientMonthlyContentInput, ContentCounts, Lead } from "@/types";

type ContentPatch = Omit<ClientMonthlyContentInput, "clientId" | "month">;

const RAINBOW_COLORS = ["#ef4444", "#22c55e", "#f6bf26", "#3b82f6"];

function rainbowText(text: string) {
  return [...text].map((char, i) => (
    <span key={i} style={{ color: RAINBOW_COLORS[i % RAINBOW_COLORS.length] }}>{char}</span>
  ));
}

function isBirthdayToday(lead: Lead, todayMD: string) {
  return lead.cumpleanos?.slice(5, 10) === todayMD || lead.cumpleanos2?.slice(5, 10) === todayMD;
}

function ClientCard({
  lead, progress, onClick,
  isDragging, isDragOver,
  onDragStart, onDragOver, onDrop, onDragEnd,
  monthlyRecord,
  onAdjustContent,
}: {
  lead: Lead;
  progress: number | null;
  onClick: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  monthlyRecord: ContentCounts | undefined;
  onAdjustContent: (hechoKey: keyof ContentPatch, delta: number) => void;
}) {
  const title   = lead.empresa || lead.nombre || "Sin nombre";
  const service = lead.servicio || "—";
  const hasContent = progress !== null;
  const pct     = hasContent ? Math.round(progress * 100) : 0;
  const activo  = lead.activo ?? true;
  const isBirthday = isBirthdayToday(lead, todayBA().slice(5, 10));

  const contenidoRows = CONTENIDOS_CATEGORIAS
    .map(({ cardLabel, hechoKey, contratadoKey }) => ({
      cardLabel,
      hechoKey,
      contratadoKey,
      hecho: monthlyRecord?.[hechoKey] ?? 0,
      contratado: monthlyRecord?.[contratadoKey] ?? 0,
    }))
    .filter((r) => r.contratado > 0);

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
        justifyContent: "flex-start",
        cursor: "grab",
        outline: isDragOver ? "2px solid var(--amber, #f6bf26)" : "none",
        outlineOffset: isDragOver ? "-2px" : "0",
        transition: "opacity 0.15s, outline 0.1s",
        position: "relative",
        minHeight: 0,
      }}
    >
      {/* Logo del cliente */}
      <div
        style={{
          position: "absolute", top: 6, right: 6,
          width: 38, height: 38, borderRadius: "50%", overflow: "hidden",
          background: "#e2e8f0", flexShrink: 0,
        }}
      >
        {lead.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lead.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>

      {/* Drag handle */}
      <div
        style={{
          position: "absolute", top: 14, right: 14,
          color: "#cbd5e1", fontSize: 13, lineHeight: 1,
          pointerEvents: "none", userSelect: "none",
          letterSpacing: -1,
        }}
        title="Arrastrá para reordenar"
      >
        ⠿
      </div>

      <div className="client-card-text-v11">
        <h3 style={{ margin: 0, paddingRight: 18 }}>
          {isBirthday ? rainbowText(title) : title}
          {isBirthday && <span title="¡Cumpleaños!" style={{ marginLeft: 6 }}>🎂</span>}
        </h3>
        <div className="client-card-v11-service">{service}</div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {contenidoRows.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {contenidoRows.map((r) => (
                  <div key={r.cardLabel} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3, fontSize: 13, fontWeight: 700, color: "#334155" }}>
                    <span style={{ whiteSpace: "nowrap" }}>-{r.contratado} {r.cardLabel}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAdjustContent(r.hechoKey, 1); }}
                        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onAdjustContent(r.hechoKey, -1); }}
                        title="Click: +1 hecho · Click derecho: -1 hecho"
                        style={{ background: "none", border: "none", padding: 0, color: "#22c55e", fontSize: 14, fontWeight: 900, cursor: "pointer", lineHeight: 1 }}
                      >
                        +
                      </button>
                      <span style={{ color: "#94a3b8", minWidth: 24, textAlign: "right" }}>{r.hecho}/{r.contratado}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                Sin contenidos definidos
              </div>
            )}
          </div>
          <div
            className={`client-progress-circle ${hasContent ? progressClass(progress) : "progress-none"}`}
            style={{ "--pct": pct, width: 42, height: 42, minWidth: 42 } as React.CSSProperties}
          >
            <span>{hasContent ? `${pct}%` : "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const SEARCH_TYPE_WINDOW_MS = 3000;

function ClearSearchCard({ onClear }: { onClear: () => void }) {
  return (
    <div
      className="client-card-v11"
      onClick={onClear}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        border: "2px dashed var(--slate-300, #cbd5e1)",
        background: "var(--slate-50, #f8fafc)",
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 800, color: "#64748b" }}>✕ Limpiar búsqueda</span>
    </div>
  );
}

export function ClientesView() {
  const rows          = useLeadsStore((s) => s.rows);
  const updateLead    = useLeadsStore((s) => s.updateLead);
  const contentEvents = useContentEventsStore((s) => s.contentEvents);
  const bulkEventSeries = useContentEventsStore((s) => s.bulkEventSeries);
  const createBulkEventSeries = useContentEventsStore((s) => s.createBulkEventSeries);
  const updateBulkEventSeries = useContentEventsStore((s) => s.updateBulkEventSeries);
  const deleteBulkEventSeries = useContentEventsStore((s) => s.deleteBulkEventSeries);
  const progressMode  = useContentEventsStore((s) => s.progressMode);
  const setProgressMode = useContentEventsStore((s) => s.setProgressMode);
  const monthlyContentRecords = useClientMonthlyContentStore((s) => s.records);
  const upsertMonthlyContent = useClientMonthlyContentStore((s) => s.upsert);
  const router = useRouter();

  const [monthKey, setMonthKey] = useState(currentMonthBA);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [bulkEventsOpen, setBulkEventsOpen] = useState(false);

  /* type-ahead: escribir letras filtra clientes cuyo nombre las contiene en ese orden */
  const [searchBuffer, setSearchBuffer] = useState("");
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;

      if (e.key === "Backspace") {
        clearSearch();
        return;
      }
      if (!/^[\p{L}\p{N}]$/u.test(e.key)) return;

      const now = Date.now();
      setSearchBuffer((prev) => (now - lastKeyTimeRef.current < SEARCH_TYPE_WINDOW_MS ? prev : "") + e.key);
      lastKeyTimeRef.current = now;
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function clearSearch() {
    setSearchBuffer("");
    lastKeyTimeRef.current = 0;
  }

  const { activos, inactivos } = useMemo(() => {
    const list = rows.filter((r) => r.tab === "CLIENTES");
    const sorted = [...list].sort((a, b) => {
      const ao = a.clientOrder ?? Infinity;
      const bo = b.clientOrder ?? Infinity;
      return ao !== bo ? ao - bo : 0;
    });
    return {
      activos:   sorted.filter((c) => c.activo !== false),
      inactivos: sorted.filter((c) => c.activo === false),
    };
  }, [rows]);
  const clients = useMemo(() => [...activos, ...inactivos], [activos, inactivos]);

  const searchActive = searchBuffer.length > 0;
  const filteredActivos = useMemo(() => {
    if (!searchActive) return activos;
    const needle = searchBuffer.toLowerCase();
    return activos.filter((c) => (c.empresa || c.nombre || "").toLowerCase().includes(needle));
  }, [activos, searchActive, searchBuffer]);
  const filteredInactivos = useMemo(() => {
    if (!searchActive) return inactivos;
    const needle = searchBuffer.toLowerCase();
    return inactivos.filter((c) => (c.empresa || c.nombre || "").toLowerCase().includes(needle));
  }, [inactivos, searchActive, searchBuffer]);

  function getProgress(lead: Lead): number | null {
    return progressMode === "contratado"
      ? getContratadoProgress(resolveMonthlyContent(monthlyContentRecords, lead.id, monthKey))
      : getEstadoProgress(lead.id, contentEvents, monthKey);
  }

  function adjustContent(leadId: string, hechoKey: keyof ContentPatch, delta: number) {
    const current: ContentPatch = resolveMonthlyContent(monthlyContentRecords, leadId, monthKey) ?? {
      historiasHechas: 0, historiasContratadas: 0,
      reelsHechos: 0, reelsContratados: 0,
      publicacionesHechas: 0, publicacionesContratadas: 0,
    };
    const nextHecho = Math.max(0, current[hechoKey] + delta);
    upsertMonthlyContent(leadId, monthKey, { ...current, [hechoKey]: nextHecho });
  }

  const globalProgress = useMemo(() => {
    const values = activos
      .map((lead) => getProgress(lead))
      .filter((v): v is number => v !== null);
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activos, progressMode, contentEvents, monthlyContentRecords, monthKey]);

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
    const header = "Cliente,Nombre,Teléfono,Dirección,Servicio,Mes de entrada,Ticket";
    const rows = clients.map(c => {
      const q = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      return [
        q(c.empresa),
        q(c.nombre),
        q(c.telefono),
        q(c.direccion),
        q(c.servicio),
        q(c.mesEntrada),
        q(c.ticket),
      ].join(",");
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
            {activos.length} ACTIVO{activos.length !== 1 ? "S" : ""}
          </div>
          <button
            type="button"
            onClick={() => setProgressMode(progressMode === "estado" ? "contratado" : "estado")}
            className={`client-progress-circle client-progress-circle-header ${globalProgress !== null ? progressClass(globalProgress) : "progress-none"}`}
            style={{ "--pct": globalProgress !== null ? Math.round(globalProgress * 100) : 0 } as React.CSSProperties}
            title={
              progressMode === "estado"
                ? "Progreso por estado mensual de contenidos · click para ver contratado vs. hecho"
                : "Progreso contratado vs. hecho · click para ver estado mensual de contenidos"
            }
          >
            <span>{globalProgress !== null ? `${Math.round(globalProgress * 100)}%` : "—"}</span>
          </button>
        </div>
        {clients.length > 0 && (
          <div className="client-panel-actions">
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setMonthKey(k => shiftMonth(k, -1))}>‹</button>
              <MonthPickerMenu
                monthKey={monthKey}
                onSelect={setMonthKey}
                monthLabel={monthLabel}
                className="btn btn-sm btn-outline"
                style={{ padding: "8px 11px", color: "var(--slate-700)", minWidth: 110, textAlign: "center" }}
              >
                {monthLabel(monthKey)}
              </MonthPickerMenu>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setMonthKey(k => shiftMonth(k, 1))}>›</button>
            </div>
            <button
              onClick={() => setBulkEventsOpen(true)}
              className="btn btn-amber btn-sm"
              style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}
            >
              + Añadir eventos masivamente
              {bulkEventSeries.length > 0 && <span className="bulk-button-count">{bulkEventSeries.length}</span>}
            </button>
            <button
              onClick={exportCSV}
              className="btn btn-outline btn-sm"
              style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}
            >
              ↓ Exportar CSV
            </button>
          </div>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="empty" style={{ padding: "60px 24px" }}>
          Sin clientes aún — mové leads a la etapa CLIENTES para verlos aquí.
        </div>
      ) : (
        <div style={{ padding: "0 0 24px" }}>
          {filteredActivos.length > 0 && (
            <div className="client-grid-v11">
              {filteredActivos.map((lead) => (
                <ClientCard
                  key={lead.id}
                  lead={lead}
                  progress={getProgress(lead)}
                  onClick={() => !dragId && router.push(`/clientes/${lead.id}`)}
                  isDragging={dragId === lead.id}
                  isDragOver={overId === lead.id}
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  onDragOver={(e) => handleDragOver(e, lead.id)}
                  onDrop={(e) => handleDrop(e, lead.id)}
                  onDragEnd={handleDragEnd}
                  monthlyRecord={resolveMonthlyContent(monthlyContentRecords, lead.id, monthKey)}
                  onAdjustContent={(hechoKey, delta) => adjustContent(lead.id, hechoKey, delta)}
                />
              ))}
              {searchActive && filteredInactivos.length === 0 && <ClearSearchCard onClear={clearSearch} />}
            </div>
          )}

          {filteredInactivos.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 10px" }}>
                <div style={{ flex: 1, height: 1, background: "var(--slate-200, #e2e8f0)" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  Inactivos · {filteredInactivos.length}
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--slate-200, #e2e8f0)" }} />
              </div>
              <div className="client-grid-v11">
                {filteredInactivos.map((lead) => (
                  <ClientCard
                    key={lead.id}
                    lead={lead}
                    progress={getProgress(lead)}
                    onClick={() => !dragId && router.push(`/clientes/${lead.id}`)}
                    isDragging={dragId === lead.id}
                    isDragOver={overId === lead.id}
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onDragOver={(e) => handleDragOver(e, lead.id)}
                    onDrop={(e) => handleDrop(e, lead.id)}
                    onDragEnd={handleDragEnd}
                    monthlyRecord={resolveMonthlyContent(monthlyContentRecords, lead.id, monthKey)}
                    onAdjustContent={(hechoKey, delta) => adjustContent(lead.id, hechoKey, delta)}
                  />
                ))}
                {searchActive && <ClearSearchCard onClear={clearSearch} />}
              </div>
            </>
          )}

          {searchActive && filteredActivos.length === 0 && filteredInactivos.length === 0 && (
            <div className="client-grid-v11">
              <ClearSearchCard onClear={clearSearch} />
            </div>
          )}
        </div>
      )}
      {bulkEventsOpen && (
        <BulkEventsModal
          clients={clients}
          series={bulkEventSeries}
          onCreate={createBulkEventSeries}
          onUpdate={updateBulkEventSeries}
          onDelete={deleteBulkEventSeries}
          onClose={() => setBulkEventsOpen(false)}
        />
      )}
    </div>
  );
}
