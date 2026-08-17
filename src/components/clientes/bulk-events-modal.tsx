"use client";

import { useState } from "react";
import { dateForMonth } from "@/lib/bulk-events";
import { CONTENT_TYPES, MANAGEMENT_TYPES } from "@/lib/constants";
import { currentMonthBA, todayBA } from "@/lib/dates";
import type {
  BulkEventKind,
  BulkEventSeries,
  BulkEventSeriesInput,
  BulkRecurrence,
  ContentType,
  Lead,
  ManagementType,
} from "@/types";

interface BulkEventsModalProps {
  clients: Lead[];
  series: BulkEventSeries[];
  onCreate: (input: BulkEventSeriesInput) => Promise<void>;
  onUpdate: (id: string, input: BulkEventSeriesInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function clientName(client: Lead): string {
  return client.empresa || client.nombre || "Sin nombre";
}

function recurrenceLabel(item: BulkEventSeries): string {
  if (item.recurrence === "monthly") return "Todos los meses";
  if (item.recurrence === "count") {
    return `${item.repeatCount} repetición${item.repeatCount !== 1 ? "es" : ""} · ${item.repeatCount + 1} meses`;
  }
  return "Una vez";
}

export function BulkEventsModal({ clients, series, onCreate, onUpdate, onDelete, onClose }: BulkEventsModalProps) {
  const [kind, setKind] = useState<BulkEventKind>("content");
  const [type, setType] = useState<ContentType | ManagementType | "">("");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [startMonth, setStartMonth] = useState(currentMonthBA());
  const [dayOfMonth, setDayOfMonth] = useState(String(Number(todayBA().slice(8))));
  const [recurrence, setRecurrence] = useState<BulkRecurrence>("once");
  const [repeatCount, setRepeatCount] = useState("1");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const options = kind === "content" ? CONTENT_TYPES : MANAGEMENT_TYPES;
  const allSelected = clients.length > 0 && selectedClientIds.length === clients.length;

  function resetForm() {
    setKind("content");
    setType("");
    setTitle("");
    setTime("");
    setStartMonth(currentMonthBA());
    setDayOfMonth(String(Number(todayBA().slice(8))));
    setRecurrence("once");
    setRepeatCount("1");
    setSelectedClientIds([]);
    setEditingId(null);
    setError("");
  }

  function changeKind(nextKind: BulkEventKind) {
    setKind(nextKind);
    setType("");
  }

  function toggleClient(id: string) {
    setSelectedClientIds((current) => current.includes(id)
      ? current.filter((clientId) => clientId !== id)
      : [...current, id]);
  }

  function editSeries(item: BulkEventSeries) {
    setKind(item.kind);
    setType(item.type);
    setTitle(item.title);
    setTime(item.time);
    setStartMonth(item.startMonth);
    setDayOfMonth(String(item.dayOfMonth));
    setRecurrence(item.recurrence);
    setRepeatCount(String(item.recurrence === "count" ? item.repeatCount : 1));
    setSelectedClientIds(item.clientIds);
    setEditingId(item.id);
    setExpandedId(item.id);
    setError("");
  }

  async function deleteSeries(item: BulkEventSeries) {
    if (!confirm(`¿Eliminar el evento masivo "${item.title}"? Los eventos pasados se conservarán.`)) return;
    setDeletingId(item.id);
    setError("");
    try {
      await onDelete(item.id);
      if (editingId === item.id) resetForm();
      if (expandedId === item.id) setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el evento masivo");
    } finally {
      setDeletingId(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const day = Number(dayOfMonth);
    const repetitions = recurrence === "count" ? Number(repeatCount) : 0;
    if (!type || !title.trim() || selectedClientIds.length === 0 || !Number.isInteger(day) || day < 1 || day > 31) {
      setError("Completá el tipo, el evento, el día y al menos un cliente.");
      return;
    }
    if (recurrence === "count" && (!Number.isInteger(repetitions) || repetitions < 1)) {
      setError("La cantidad de repeticiones debe ser al menos 1.");
      return;
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)) {
      setError("Elegí un mes de inicio válido.");
      return;
    }
    if (!editingId && dateForMonth(startMonth, day) < todayBA()) {
      setError("La primera fecha ya pasó. Elegí un día o mes de inicio futuro.");
      return;
    }

    const input: BulkEventSeriesInput = {
      kind,
      title: title.trim(),
      type,
      clientIds: selectedClientIds,
      dayOfMonth: day,
      time,
      startMonth,
      recurrence,
      repeatCount: repetitions,
    };

    setSaving(true);
    setError("");
    try {
      if (editingId) await onUpdate(editingId, input);
      else await onCreate(input);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el evento masivo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop open" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal bulk-events-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Eventos masivos</h2>
            <p className="bulk-modal-subtitle">Calendario de contenido y gestión</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-body bulk-events-body">
          <section>
            <p className="bulk-section-label">Cargado previamente</p>
            {series.length === 0 ? (
              <div className="bulk-empty">No hay eventos masivos cargados.</div>
            ) : (
              <div className="bulk-series-list">
                {[...series].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((item) => {
                  const expanded = expandedId === item.id;
                  const selectedNames = clients
                    .filter((client) => item.clientIds.includes(client.id))
                    .map(clientName);
                  return (
                    <div className="bulk-series-card" key={item.id}>
                      <button
                        type="button"
                        className="bulk-series-summary"
                        onClick={() => setExpandedId(expanded ? null : item.id)}
                      >
                        <span className={`bulk-kind-dot ${item.kind}`} />
                        <span className="bulk-series-main">
                          <span className="bulk-series-meta">
                            {item.kind === "content" ? "CONTENIDO" : "GESTIÓN"} · {item.type} · DÍA {item.dayOfMonth}
                          </span>
                          <strong>{item.title}</strong>
                          <span>{recurrenceLabel(item)} · {item.clientIds.length} cliente{item.clientIds.length !== 1 ? "s" : ""}</span>
                        </span>
                        <span className="bulk-chevron">{expanded ? "⌃" : "⌄"}</span>
                      </button>
                      {expanded && (
                        <div className="bulk-series-details">
                          <div><b>Inicio:</b> {item.startMonth.slice(5)}/{item.startMonth.slice(0, 4)}{item.time ? ` · ${item.time}` : " · Sin hora"}</div>
                          <div><b>Clientes:</b> {selectedNames.join(", ") || "Clientes no disponibles"}</div>
                          <div className="bulk-series-actions">
                            <button type="button" className="btn btn-outline btn-xs" onClick={() => editSeries(item)}>Editar</button>
                            <button
                              type="button"
                              className="btn btn-danger btn-xs"
                              disabled={deletingId === item.id}
                              onClick={() => deleteSeries(item)}
                            >
                              {deletingId === item.id ? "Eliminando…" : "Eliminar"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="bulk-divider" />

          <form id="bulk-events-form" onSubmit={submit}>
            <div className="bulk-form-heading">
              <p className="bulk-section-label">{editingId ? "Modificar evento masivo" : "Agregar eventos masivamente"}</p>
              {editingId && <button type="button" className="bulk-cancel-edit" onClick={resetForm}>Cancelar edición</button>}
            </div>

            <div className="bulk-kind-selector" role="group" aria-label="Calendario destino">
              <button type="button" className={kind === "content" ? "active" : ""} onClick={() => changeKind("content")}>Contenido</button>
              <button type="button" className={kind === "management" ? "active" : ""} onClick={() => changeKind("management")}>Gestión</button>
            </div>

            <div className="bulk-form-grid">
              <div className="field-group">
                <label className="field-label">Hora</label>
                <input type="time" className="field" value={time} onChange={(event) => setTime(event.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Tipo</label>
                <select className="field" value={type} onChange={(event) => setType(event.target.value as ContentType | ManagementType | "")} required>
                  <option value="">Seleccionar…</option>
                  {options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div className="field-group bulk-full-row">
                <label className="field-label">{kind === "content" ? "Título" : "Motivo / detalle"}</label>
                <textarea
                  className="textarea bulk-event-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={kind === "content" ? "Título del contenido…" : "Escribí el motivo o detalle…"}
                  required
                />
              </div>
              <div className="field-group">
                <label className="field-label">Mes de inicio</label>
                <input type="month" className="field" value={startMonth} onChange={(event) => setStartMonth(event.target.value)} required />
              </div>
              <div className="field-group">
                <label className="field-label">Día del mes</label>
                <input type="number" min="1" max="31" className="field" value={dayOfMonth} onChange={(event) => setDayOfMonth(event.target.value)} required />
                <span className="bulk-field-help">Si el mes es más corto, se usa su último día.</span>
              </div>
            </div>

            <label className="bulk-repeat-toggle">
              <input
                type="checkbox"
                checked={recurrence !== "once"}
                onChange={(event) => setRecurrence(event.target.checked ? "count" : "once")}
              />
              <span>Repetir este evento</span>
            </label>

            {recurrence !== "once" && (
              <div className="bulk-repeat-options">
                <label>
                  <input type="radio" name="bulk-recurrence" checked={recurrence === "count"} onChange={() => setRecurrence("count")} />
                  Cantidad de repeticiones
                </label>
                <label>
                  <input type="radio" name="bulk-recurrence" checked={recurrence === "monthly"} onChange={() => setRecurrence("monthly")} />
                  Todos los meses hasta borrar la serie
                </label>
                {recurrence === "count" && (
                  <div className="field-group bulk-repeat-count">
                    <label className="field-label">Veces que se repite después del primer mes</label>
                    <input type="number" min="1" max="120" className="field" value={repeatCount} onChange={(event) => setRepeatCount(event.target.value)} />
                  </div>
                )}
              </div>
            )}

            <div className="bulk-clients-heading">
              <div>
                <p className="bulk-section-label">Clientes</p>
                <span>{selectedClientIds.length} de {clients.length} seleccionados</span>
              </div>
              <label className="bulk-select-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => setSelectedClientIds(event.target.checked ? clients.map((client) => client.id) : [])}
                />
                Seleccionar todos
              </label>
            </div>
            <div className="bulk-client-list">
              {clients.map((client, index) => (
                <label className="bulk-client-option" key={client.id}>
                  <input type="checkbox" checked={selectedClientIds.includes(client.id)} onChange={() => toggleClient(client.id)} />
                  <span className="bulk-client-position">{index + 1}</span>
                  <span className="bulk-client-name">
                    <strong>{clientName(client)}</strong>
                    {client.empresa && client.nombre && <small>{client.nombre}</small>}
                  </span>
                  {client.activo === false && <span className="bulk-inactive">Inactivo</span>}
                </label>
              ))}
            </div>

            {error && <div className="bulk-error">{error}</div>}
            <p className="bulk-future-note">Al editar o eliminar una serie solo se modifican sus eventos de hoy en adelante.</p>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" form="bulk-events-form" className="btn btn-amber" disabled={saving}>
            {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}
