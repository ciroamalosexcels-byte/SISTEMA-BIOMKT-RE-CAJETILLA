"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Phone } from "lucide-react";
import { useLeadsStore } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { useColumnWidthsStore } from "@/store/column-widths";
import { EMPRESA_BIO_OPTS, MEDIO_OPTS } from "@/lib/constants";
import { formatDateDisplay, normalizeISODate } from "@/lib/dates";
import type { Lead, TabKey } from "@/types";

interface Props {
  tab: TabKey;
  query: string;
}

const TAB_MOVE_TARGETS: Partial<Record<TabKey, { label: string; to: TabKey }[]>> = {
  CRM: [
    { label: "Reu 1", to: "REUNION_1" },
    { label: "Seg", to: "SEGUIMIENTO" },
    { label: "Cliente", to: "CLIENTES" },
  ],
  REUNION_1: [
    { label: "Reu 2", to: "REUNION_2" },
    { label: "Seg", to: "SEGUIMIENTO" },
    { label: "Cliente", to: "CLIENTES" },
  ],
  REUNION_2: [
    { label: "Seg", to: "SEGUIMIENTO" },
    { label: "Cliente", to: "CLIENTES" },
  ],
  SEGUIMIENTO: [
    { label: "Reu 1", to: "REUNION_1" },
    { label: "Cliente", to: "CLIENTES" },
  ],
};

// Tabs que necesitan modal de fecha/hora al recibir un lead
const DATE_PROMPT_ON_MOVE: Partial<Record<TabKey, { field: "meetingDatetime" | "proximoSeguimientoFecha"; title: string }>> = {
  REUNION_1:   { field: "meetingDatetime",         title: "Reunión 1"    },
  REUNION_2:   { field: "meetingDatetime",         title: "Reunión 2"    },
  SEGUIMIENTO: { field: "proximoSeguimientoFecha", title: "Seguimiento"  },
};

// Tabs que muestran "Contactado" con tiempo relativo (en vez de fecha)
const TABS_RELATIVE_CONTACT: TabKey[] = ["REUNION_1", "REUNION_2", "SEGUIMIENTO"];

const BASE_COLUMNS = [
  { key: "nombre",                  label: "Nombre"           },
  { key: "empresa",                 label: "Empresa / Negocio"},
  { key: "observaciones",           label: "Observaciones"    },
  { key: "telefono",                label: "Teléfono"         },
  { key: "responsable1",            label: "Responsable 1"    },
  { key: "responsable2",            label: "Responsable 2"    },
  { key: "fechaContacto",           label: "Primer Contacto"  },
  { key: "meetingDatetime",         label: "Reunión"          }, // solo REUNION_1/2
  { key: "proximoSeguimientoFecha", label: "Seguimiento"      }, // solo SEGUIMIENTO
  { key: "empresaBio",              label: "Empresa Bio"      },
  { key: "medio",                   label: "Medio"            },
  { key: "actions",                 label: "Pasar a"          },
] as const;

type ColKey = typeof BASE_COLUMNS[number]["key"];

const TAB_LABELS: Partial<Record<TabKey, string>> = {
  CRM:        "CRM",
  REUNION_1:  "Reunión 1",
  REUNION_2:  "Reunión 2",
  SEGUIMIENTO:"Seguimiento",
  CLIENTES:   "Cliente",
};

/* ── Modal fecha y hora ───────────────────────────────────────────── */

function DateTimeModal({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: (datetime: string) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const label = title;

  return (
    <div className="modal-backdrop open" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Fecha y hora — {label}</h2>
          <button className="icon-btn" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body" style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label style={{ gridColumn: "1" }}>
            <span style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#64748b", marginBottom: 6 }}>
              Fecha
            </span>
            <input
              className="field"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              autoFocus
            />
          </label>
          <label style={{ gridColumn: "2" }}>
            <span style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#64748b", marginBottom: 6 }}>
              Hora
            </span>
            <input
              className="field"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
          <button
            className="btn btn-amber"
            disabled={!date || !time}
            onClick={() => onConfirm(`${date}T${time}`)}
          >
            Confirmar y pasar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Formatea "2025-03-15T14:30" → "15/03/2025 14:30" ─────────────── */
function formatMeetingDt(dt?: string) {
  if (!dt) return "";
  const [datePart, timePart] = dt.split("T");
  if (!datePart) return dt;
  const [y, m, d] = datePart.split("-");
  const base = `${d}/${m}/${y}`;
  return timePart ? `${base} ${timePart.slice(0, 5)}` : base;
}

/* ── Tiempo relativo desde fecha de contacto ──────────────────────── */
function relativeContactTime(dateStr: string): string {
  if (!dateStr) return "—";

  // Normalizar DD/MM/YYYY → YYYY-MM-DD
  const norm = dateStr.replace(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    (_, d, m, y) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  );

  // Separar fecha y hora (fechaContacto puede ser "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm")
  const tIdx     = norm.indexOf("T");
  const datePart = tIdx >= 0 ? norm.slice(0, tIdx) : norm;
  const timePart = tIdx >= 0 ? norm.slice(tIdx + 1, tIdx + 6) : "00:00";

  // Interpretar como hora Buenos Aires (UTC-3)
  const contactMs = new Date(`${datePart}T${timePart}:00-03:00`).getTime();
  if (isNaN(contactMs)) return "—";

  const elapsed = Date.now() - contactMs;
  if (elapsed < 0) return "—";

  const totalMins  = Math.floor(elapsed / 60_000);
  const totalHours = Math.floor(elapsed / 3_600_000);
  const totalDays  = Math.floor(elapsed / 86_400_000);

  if (totalDays >= 365) {
    const y = Math.floor(totalDays / 365);
    const m = Math.floor((totalDays - y * 365) / 30);
    return m > 0 ? `${y}A ${m}M` : `${y}A`;
  }
  if (totalDays >= 30) {
    const m = Math.floor(totalDays / 30);
    const d = totalDays - m * 30;
    return d > 0 ? `${m}M ${d}D` : `${m}M`;
  }
  if (totalDays >= 1) {
    const h = totalHours % 24;
    return h > 0 ? `${totalDays}D ${h}H` : `${totalDays}D`;
  }
  if (totalHours >= 1) {
    const mins = totalMins % 60;
    return mins > 0 ? `${totalHours}H ${mins}m` : `${totalHours}H`;
  }
  return `${totalMins}m`;
}

/* ── Helpers contacto ─────────────────────────────────────────────── */
function cleanPhone(tel: string) {
  return tel.replace(/\D/g, "");
}
function waUrl(tel: string) {
  const n = cleanPhone(tel);
  const withCC = n.startsWith("54") ? n : `54${n.startsWith("0") ? n.slice(1) : n}`;
  return `https://wa.me/${withCC}`;
}
function telUrl(tel: string) {
  const n = cleanPhone(tel);
  const withCC = n.startsWith("54") ? n : `54${n.startsWith("0") ? n.slice(1) : n}`;
  return `tel:+${withCC}`;
}

/* ── Menú contextual ─────────────────────────────────────────────── */
function RowCtxMenu({
  x, y, telefono, nombre, onClose,
}: {
  x: number; y: number; telefono: string; nombre: string; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hasPhone = cleanPhone(telefono).length >= 6;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  // Ajustar posición para no salir de pantalla
  const style: React.CSSProperties = {
    position: "fixed",
    top: Math.min(y, window.innerHeight - 130),
    left: Math.min(x, window.innerWidth - 200),
    zIndex: 9999,
    background: "#07152f",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 6,
    minWidth: 190,
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  };

  const btnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 12px", borderRadius: 8, border: "none",
    background: "transparent", cursor: "pointer", color: "#fff",
    fontSize: 13, fontWeight: 600, textAlign: "left", width: "100%",
  };

  return (
    <div ref={ref} style={style}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: ".06em", padding: "4px 12px 2px", textTransform: "uppercase" }}>
        {nombre || "Sin nombre"}
      </div>
      {hasPhone ? (
        <>
          <a
            href={telUrl(telefono)}
            style={{ ...btnStyle, textDecoration: "none" }}
            onClick={onClose}
          >
            <span style={{ fontSize: 16 }}>📞</span> Llamar
          </a>
          <a
            href={waUrl(telefono)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...btnStyle, textDecoration: "none", color: "#25d366" }}
            onClick={onClose}
          >
            <span style={{ fontSize: 16 }}>💬</span> WhatsApp
          </a>
        </>
      ) : (
        <div style={{ padding: "8px 12px", fontSize: 12, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
          Sin teléfono cargado
        </div>
      )}
    </div>
  );
}

/* ── LeadsTable ────────────────────────────────────────────────────── */

export function LeadsTable({ tab, query }: Props) {
  const rows            = useLeadsStore((s) => s.rows);
  const highlightLeadId = useLeadsStore((s) => s.highlightLeadId);
  const { updateLead, deleteLead, moveLeadTo } = useLeadsStore();
  const members = useTeamStore((s) => s.members);
  const { getWidth, setWidth, resizeModeEnabled, toggleResizeMode } = useColumnWidthsStore();
  const allWidths = useColumnWidthsStore((s) => s.widths);
  const [page, setPage] = useState(1);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; telefono: string; nombre: string } | null>(null);
  const [datePending, setDatePending] = useState<{
    leadId: string;
    to: TabKey;
    field: "meetingDatetime" | "proximoSeguimientoFecha";
    title: string;
  } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const dragRef = useRef<{
    col: string;
    startX: number;
    startWidth: number;
    tableStartWidth: number;
    th: HTMLTableCellElement;
  } | null>(null);

  const PAGE_SIZE = 33;
  const showRelativeContact = TABS_RELATIVE_CONTACT.includes(tab);

  const visibleColumns = useMemo(
    () => BASE_COLUMNS
      .filter((c) => {
        if (c.key === "meetingDatetime")         return tab === "REUNION_1" || tab === "REUNION_2";
        if (c.key === "proximoSeguimientoFecha") return tab === "SEGUIMIENTO";
        return true;
      })
      .map((c) =>
        c.key === "fechaContacto" && showRelativeContact
          ? { ...c, label: "Contactado" }
          : c
      ),
    [tab, showRelativeContact]
  );

  const colSpanCount = visibleColumns.length;

  const totalTableWidth = useMemo(
    () => visibleColumns.reduce((sum, { key }) => sum + (allWidths[`${tab}_${key as string}`] ?? 120), 0),
    [visibleColumns, tab, allWidths]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows
      .filter(
        (r) =>
          (tab === "BASE" || r.tab === tab) &&
          (!q ||
            r.nombre.toLowerCase().includes(q) ||
            r.empresa.toLowerCase().includes(q) ||
            r.observaciones.toLowerCase().includes(q) ||
            r.telefono.toLowerCase().includes(q) ||
            (r.responsable1 ?? "").toLowerCase().includes(q) ||
            (r.responsable2 ?? "").toLowerCase().includes(q) ||
            (r.fechaContacto ?? "").toLowerCase().includes(q) ||
            (r.empresaBio ?? "").toLowerCase().includes(q) ||
            (r.medio ?? "").toLowerCase().includes(q) ||
            formatMeetingDt(r.meetingDatetime).toLowerCase().includes(q) ||
            formatMeetingDt(r.proximoSeguimientoFecha).toLowerCase().includes(q))
      )
      .sort((a, b) => {
        const ta = a.fechaContacto ? (new Date(normalizeISODate(a.fechaContacto) || "").getTime() || 0) : 0;
        const tb = b.fechaContacto ? (new Date(normalizeISODate(b.fechaContacto) || "").getTime() || 0) : 0;
        return tb - ta;
      });
  }, [rows, tab, query]);

  // Saltar a la página del lead resaltado y limpiar al hacer click
  useEffect(() => {
    if (!highlightLeadId) return;
    const idx = filtered.findIndex((r) => r.id === highlightLeadId);
    if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE) + 1);
    const clear = () => useLeadsStore.getState().setHighlightLeadId(null);
    const timer = setTimeout(() => document.addEventListener("click", clear, { once: true }), 1200);
    return () => { clearTimeout(timer); document.removeEventListener("click", clear); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightLeadId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const memberNames = members.map((m) => m.nombre);
  const moveTargets = TAB_MOVE_TARGETS[tab] ?? [];

  function handleMove(leadId: string, to: TabKey) {
    const prompt = DATE_PROMPT_ON_MOVE[to];
    if (prompt) {
      setDatePending({ leadId, to, ...prompt });
    } else {
      moveLeadTo(leadId, to);
    }
  }

  function confirmDate(datetime: string) {
    if (!datePending) return;
    updateLead(datePending.leadId, { [datePending.field]: datetime });
    moveLeadTo(datePending.leadId, datePending.to);
    setDatePending(null);
  }

  function startResize(
    e: React.MouseEvent<HTMLDivElement>,
    col: string,
    th: HTMLTableCellElement
  ) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      col,
      startX: e.clientX,
      startWidth: th.offsetWidth,
      tableStartWidth: tableRef.current?.offsetWidth ?? 0,
      th,
    };

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const delta   = ev.clientX - dragRef.current.startX;
      const newColW = Math.max(40, dragRef.current.startWidth + delta);
      const actualDelta = newColW - dragRef.current.startWidth;
      dragRef.current.th.style.width = newColW + "px";
      // Ajustar el ancho total de la tabla para que las demás columnas no se muevan
      if (tableRef.current) {
        tableRef.current.style.width = (dragRef.current.tableStartWidth + actualDelta) + "px";
      }
    }

    function onUp(ev: MouseEvent) {
      if (!dragRef.current) return;
      const newW = Math.max(40, dragRef.current.startWidth + (ev.clientX - dragRef.current.startX));
      setWidth(tab, dragRef.current.col, newW);
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <>
      <div>
        {/* Resize mode banner */}
        {resizeModeEnabled && (
          <div className="col-resize-banner">
            <span>Modo edición libre activo — arrastrá el borde de las columnas para redimensionar.</span>
            <button className="btn btn-xs btn-dark" onClick={toggleResizeMode}>Desactivar</button>
          </div>
        )}

        {/* Table */}
        <div className="table-wrap">
          <table ref={tableRef} style={{ width: totalTableWidth, tableLayout: "fixed" }}>
            <thead>
              <tr>
                {visibleColumns.map(({ key, label }) => {
                  const colLabel = (tab === "BASE" && key === "actions") ? "Estado" : label;
                  return (
                    <th
                      key={key}
                      style={{
                        width: getWidth(tab, key as string),
                        position: resizeModeEnabled ? "relative" : undefined,
                      }}
                    >
                      {colLabel}
                      {resizeModeEnabled && (
                        <div
                          className="col-resize-handle"
                          onMouseDown={(e) => {
                            const th = e.currentTarget.parentElement as HTMLTableCellElement;
                            startResize(e, key as string, th);
                          }}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={colSpanCount} className="empty">Sin registros</td>
                </tr>
              )}
              {paginated.map((row) => (
                <LeadRow
                  key={row.id}
                  row={row}
                  memberNames={memberNames}
                  moveTargets={moveTargets}
                  tab={tab}
                  showRelativeContact={showRelativeContact}
                  isHighlighted={row.id === highlightLeadId}
                  onUpdate={(patch) => updateLead(row.id, patch)}
                  onDelete={() => deleteLead(row.id)}
                  onMove={(to) => handleMove(row.id, to)}
                  onCtxMenu={(x, y) => setCtxMenu({ x, y, telefono: row.telefono, nombre: row.nombre })}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--slate-200)", background: "var(--slate-50)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--slate-500)" }}>
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button className="btn btn-xs btn-outline" disabled={safePage <= 1} onClick={() => setPage(1)} title="Primera página">«</button>
              <button className="btn btn-xs btn-outline" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹ Anterior</button>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--dark)", padding: "0 8px" }}>
                {safePage} / {totalPages}
              </span>
              <button className="btn btn-xs btn-outline" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente ›</button>
              <button className="btn btn-xs btn-outline" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)} title="Última página">»</button>
            </div>
          </div>
        )}
      </div>

      {datePending && (
        <DateTimeModal
          title={datePending.title}
          onConfirm={confirmDate}
          onCancel={() => setDatePending(null)}
        />
      )}
      {ctxMenu && (
        <RowCtxMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          telefono={ctxMenu.telefono}
          nombre={ctxMenu.nombre}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  );
}

/* ── LeadRow ───────────────────────────────────────────────────────── */

interface RowProps {
  row: Lead;
  memberNames: string[];
  moveTargets: { label: string; to: TabKey }[];
  tab: TabKey;
  showRelativeContact: boolean;
  isHighlighted: boolean;
  onUpdate: (patch: Partial<Lead>) => void;
  onDelete: () => void;
  onMove: (to: TabKey) => void;
  onCtxMenu: (x: number, y: number) => void;
}

function LeadRow({ row, memberNames, moveTargets: viewTargets, tab, showRelativeContact, isHighlighted, onUpdate, onDelete, onMove, onCtxMenu }: RowProps) {
  const isBase         = tab === "BASE";
  const showMeetingCol = tab === "REUNION_1" || tab === "REUNION_2";
  const showSegCol     = tab === "SEGUIMIENTO";
  const moveTargets    = viewTargets.length > 0 ? viewTargets : (TAB_MOVE_TARGETS[row.tab] ?? []);

  const [phase, setPhase] = useState<"idle" | "blink" | "active">("idle");
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isHighlighted) { setPhase("idle"); firedRef.current = false; return; }
    firedRef.current = false;
    setPhase("blink");
  }, [isHighlighted]);

  const getMoveClass = (to: TabKey) => {
    if (to === "CLIENTES") return "btn-xs move-client";
    if (to === "SEGUIMIENTO") return "btn-xs move-secondary";
    return "btn-xs move-primary";
  };

  return (
    <tr
      className={phase === "blink" ? "row-blink" : phase === "active" ? "row-active" : ""}
      onAnimationEnd={() => { if (!firedRef.current) { firedRef.current = true; setPhase("active"); } }}
      onContextMenu={(e) => { e.preventDefault(); onCtxMenu(e.clientX, e.clientY); }}
    >
      <td><input className="cell-input" value={row.nombre} onChange={(e) => onUpdate({ nombre: e.target.value })} placeholder="Nombre" /></td>
      <td><input className="cell-input" value={row.empresa} onChange={(e) => onUpdate({ empresa: e.target.value })} placeholder="Empresa" /></td>
      <td><input className="cell-input" value={row.observaciones} onChange={(e) => onUpdate({ observaciones: e.target.value })} placeholder="Observaciones" /></td>
      <td><input className="cell-input" value={row.telefono} onChange={(e) => onUpdate({ telefono: e.target.value })} placeholder="Teléfono" /></td>
      <td>
        <select className={`cell-select${!row.responsable1 ? " empty-soft" : ""}`} value={row.responsable1} onChange={(e) => onUpdate({ responsable1: e.target.value })}>
          <option value="">—</option>
          {memberNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </td>
      <td>
        <select className={`cell-select${!row.responsable2 ? " empty-soft" : ""}`} value={row.responsable2} onChange={(e) => onUpdate({ responsable2: e.target.value })}>
          <option value="">—</option>
          {memberNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </td>
      <td>
        {showRelativeContact ? (
          <span style={{ padding: "4px 10px", display: "block", fontSize: 12, fontWeight: 800, color: "var(--dark)", letterSpacing: ".02em" }}>
            {relativeContactTime(row.fechaContacto)}
          </span>
        ) : (
          <span style={{ padding: "4px 10px", display: "block", fontSize: 12, color: "var(--slate-500)" }}>
            {formatDateDisplay(row.fechaContacto)}
          </span>
        )}
      </td>
      {showMeetingCol && (
        <td>
          <input
            className="cell-input"
            type="datetime-local"
            value={row.meetingDatetime ?? ""}
            onChange={(e) => onUpdate({ meetingDatetime: e.target.value || undefined })}
            style={{ fontSize: 12, minWidth: 160 }}
          />
        </td>
      )}
      {showSegCol && (
        <td>
          <input
            className="cell-input"
            type="datetime-local"
            value={row.proximoSeguimientoFecha ?? ""}
            onChange={(e) => onUpdate({ proximoSeguimientoFecha: e.target.value || undefined })}
            style={{ fontSize: 12, minWidth: 160 }}
          />
        </td>
      )}
      <td>
        <select className="cell-select" value={row.empresaBio} onChange={(e) => onUpdate({ empresaBio: e.target.value as Lead["empresaBio"] })}>
          {EMPRESA_BIO_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 5, paddingRight: 4 }}>
          <select className={`cell-select${!row.medio ? " empty-soft" : ""}`} value={row.medio} onChange={(e) => onUpdate({ medio: e.target.value as Lead["medio"] })} style={{ flex: 1 }}>
            <option value="">—</option>
            {MEDIO_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <Phone
            size={13}
            title={cleanPhone(row.telefono).length >= 6 ? row.telefono : "Sin teléfono"}
            style={{
              flexShrink: 0,
              color: cleanPhone(row.telefono).length >= 6 ? "#16a34a" : "#e2e8f0",
            }}
          />
        </div>
      </td>
      <td>
        {isBase ? (
          <div className="actions">
            <span className="base-tab-status">{TAB_LABELS[row.tab] ?? row.tab}</span>
            <button
              onClick={() => { if (confirm(`¿Eliminar "${row.nombre || "este registro"}"?`)) onDelete(); }}
              className="btn btn-xs btn-danger"
            >✕</button>
          </div>
        ) : (
          <div className="actions">
            {moveTargets.map((t) => (
              <button key={t.to} onClick={() => onMove(t.to)} className={`btn ${getMoveClass(t.to)}`}>
                {t.label}
              </button>
            ))}
            <button
              onClick={() => { if (confirm(`¿Eliminar "${row.nombre || "este registro"}"?`)) onDelete(); }}
              className="btn btn-xs btn-danger"
            >✕</button>
          </div>
        )}
      </td>
    </tr>
  );
}
