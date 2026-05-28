"use client";

import { useEffect, useState } from "react";
import { todayBA } from "@/lib/dates";

interface TeamMeeting {
  id: string;
  fecha: string;
  hora: string;
  tema: string;
  notas: string;
}

const STORAGE_KEY = "biomarketing_team_meetings_v1";

function load(): TeamMeeting[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function persist(list: TeamMeeting[]) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

export function ReunionesEquipoView() {
  const [meetings, setMeetings] = useState<TeamMeeting[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TeamMeeting | null>(null);
  const [form, setForm] = useState<Omit<TeamMeeting, "id">>({ fecha: todayBA(), hora: "", tema: "", notas: "" });

  useEffect(() => { setMeetings(load()); }, []);

  function save(list: TeamMeeting[]) { setMeetings(list); persist(list); }

  function openAdd() {
    setForm({ fecha: todayBA(), hora: "", tema: "", notas: "" });
    setAdding(true);
    setEditing(null);
  }

  function openEdit(m: TeamMeeting) {
    setForm({ fecha: m.fecha, hora: m.hora, tema: m.tema, notas: m.notas });
    setEditing(m);
    setAdding(false);
  }

  function closeModal() { setAdding(false); setEditing(null); }

  function handleSave() {
    if (editing) {
      save(meetings.map((m) => (m.id === editing.id ? { ...editing, ...form } : m)));
    } else {
      save([...meetings, { id: makeId(), ...form }]);
    }
    closeModal();
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar reunión?")) return;
    save(meetings.filter((m) => m.id !== id));
  }

  function setField(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const sorted = [...meetings].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="team-panel-page mock-team-v23">
      <div className="team-panel-head">
        <div className="team-panel-title-wrap">
          <h2 className="team-panel-title">REUNIÓN DE EQUIPO</h2>
          <div className="team-panel-sub">REGISTRO DE REUNIONES INTERNAS</div>
        </div>
        <div className="team-panel-actions">
          <button className="btn btn-amber" type="button" onClick={openAdd}>
            + Nueva reunión
          </button>
        </div>
      </div>

      <div className="team-panel-body">
        <div className="team-meeting-wrap-v32">
          <table className="team-meeting-table-v32">
            <thead>
              <tr>
                <th style={{ width: 110 }}>FECHA</th>
                <th style={{ width: 80 }}>HORA</th>
                <th>TEMA</th>
                <th style={{ width: 240 }}>NOTAS</th>
                <th style={{ width: 120 }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "24px 0", color: "var(--slate-500)" }}>
                    Todavía no hay reuniones registradas.
                  </td>
                </tr>
              )}
              {sorted.map((m) => (
                <tr key={m.id}>
                  <td>{m.fecha}</td>
                  <td>{m.hora || "—"}</td>
                  <td style={{ fontWeight: 700 }}>{m.tema || "—"}</td>
                  <td style={{ color: "var(--slate-500)", fontSize: 12 }}>{m.notas || "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, padding: "0 6px" }}>
                      <button className="btn btn-outline btn-xs" type="button" onClick={() => openEdit(m)}>Editar</button>
                      <button className="btn btn-xs btn-danger" type="button" onClick={() => handleDelete(m.id)}>×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(adding || editing) && (
        <div className="modal-backdrop open" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? "Editar reunión" : "Nueva reunión"}</h2>
              <button className="icon-btn" onClick={closeModal}><XIcon /></button>
            </div>
            <div className="modal-body">
              <div className="field-group">
                <label className="field-label">Fecha</label>
                <input type="date" className="field" value={form.fecha} onChange={(e) => setField("fecha", e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Hora</label>
                <input type="time" className="field" value={form.hora} onChange={(e) => setField("hora", e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Tema</label>
                <input type="text" className="field" value={form.tema} onChange={(e) => setField("tema", e.target.value)} placeholder="Tema de la reunión…" />
              </div>
              <div className="field-group" style={{ gridColumn: "1/-1" }}>
                <label className="field-label">Notas</label>
                <textarea className="textarea" value={form.notas} onChange={(e) => setField("notas", e.target.value)} placeholder="Notas…" style={{ minHeight: 100 }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-amber" onClick={handleSave}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
