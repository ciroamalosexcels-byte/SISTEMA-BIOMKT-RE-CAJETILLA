"use client";

import { useEffect, useState } from "react";
import { saveToSheets } from "@/lib/sheets";

interface Collaborator {
  id: string;
  nombre: string;
  edad: string;
  telefono: string;
  herramientas: string;
  observaciones: string;
}

const STORAGE_KEY = "biomarketing_collaborators_v1";

function load(): Collaborator[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function persist(list: Collaborator[]) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  saveToSheets({ action: "saveCollaborators", collaborators: list }).catch(() => {});
}
function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

const EMPTY: Omit<Collaborator, "id"> = { nombre: "", edad: "", telefono: "", herramientas: "", observaciones: "" };

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

export function ColaboradoresView() {
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  const [editing, setEditing] = useState<Collaborator | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => { setCollabs(load()); }, []);

  function save(list: Collaborator[]) { setCollabs(list); persist(list); }

  function openNew() { setEditing({ id: makeId(), ...EMPTY }); setIsNew(true); }
  function openEdit(c: Collaborator) { setEditing({ ...c }); setIsNew(false); }
  function closeModal() { setEditing(null); setIsNew(false); }

  function handleSave() {
    if (!editing) return;
    if (isNew) {
      save([...collabs, editing]);
    } else {
      save(collabs.map((c) => (c.id === editing.id ? editing : c)));
    }
    closeModal();
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar colaborador?")) return;
    save(collabs.filter((c) => c.id !== id));
  }

  function set(k: keyof typeof EMPTY, v: string) {
    setEditing((e) => e ? { ...e, [k]: v } : e);
  }

  return (
    <div className="team-panel-page mock-team-v23">
      <div className="team-panel-head">
        <div className="team-panel-title-wrap">
          <h2 className="team-panel-title">COLABORADORES</h2>
          <div className="team-panel-sub">CONTACTOS, HERRAMIENTAS Y DATOS EXTERNOS</div>
        </div>
        <div className="team-panel-actions">
          <button className="btn btn-amber" type="button" onClick={openNew}>
            + Agregar colaborador
          </button>
        </div>
      </div>

      <div className="team-panel-body">
        <div className="collab-grid-v32">
          {collabs.length === 0 && (
            <div className="empty" style={{ gridColumn: "1/-1" }}>Todavía no hay colaboradores cargados.</div>
          )}
          {collabs.map((c) => (
            <article key={c.id} className="team-member collab-card-v32">
              <div className="team-member-head">
                <div className="team-member-name">{c.nombre || "Sin nombre"}</div>
                <div className="team-member-meta">
                  {c.edad ? `${c.edad} años` : "Edad sin cargar"} · {c.telefono || "Sin teléfono"}
                </div>
              </div>
              <div className="collab-tools-v32"><b>Herramientas:</b> {c.herramientas || "—"}</div>
              <div className="collab-note-v32">{c.observaciones || ""}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                <button className="btn btn-outline btn-sm" type="button" onClick={() => openEdit(c)}>Editar</button>
                <button className="btn btn-sm btn-danger" type="button" onClick={() => handleDelete(c.id)}>Borrar</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {editing && (
        <div className="modal-backdrop open" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{isNew ? "Nuevo colaborador" : "Editar colaborador"}</h2>
              <button className="icon-btn" onClick={closeModal}><XIcon /></button>
            </div>
            <div className="modal-body">
              {([
                { label: "Nombre", key: "nombre" as const, type: "text" },
                { label: "Edad", key: "edad" as const, type: "text" },
                { label: "Teléfono", key: "telefono" as const, type: "text" },
                { label: "Herramientas", key: "herramientas" as const, type: "text" },
              ]).map(({ label, key, type }) => (
                <div key={key} className="field-group">
                  <label className="field-label">{label}</label>
                  <input type={type} className="field" value={editing[key]} onChange={(e) => set(key, e.target.value)} placeholder={label} />
                </div>
              ))}
              <div className="field-group" style={{ gridColumn: "1/-1" }}>
                <label className="field-label">Observaciones</label>
                <textarea className="textarea" value={editing.observaciones} onChange={(e) => set("observaciones", e.target.value)} placeholder="Observaciones…" style={{ minHeight: 80 }} />
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
