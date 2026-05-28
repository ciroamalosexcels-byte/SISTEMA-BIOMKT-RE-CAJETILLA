"use client";

import { useState } from "react";
import { useLeadsStore } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { EMPRESA_BIO_OPTS, MEDIO_OPTS } from "@/lib/constants";
import type { Lead, TabKey } from "@/types";

interface Props {
  tab: TabKey;
  open: boolean;
  onClose: () => void;
}

const empty = (): Omit<Lead, "id" | "fechaContacto" | "tab"> => ({
  nombre: "",
  empresa: "",
  observaciones: "",
  telefono: "",
  responsable1: "",
  responsable2: "",
  direccion: "",
  empresaBio: "BIOMARKETING",
  medio: "",
});

export function NewLeadModal({ tab, open, onClose }: Props) {
  const [form, setForm] = useState(empty);
  const addLead = useLeadsStore((s) => s.addLead);
  const members = useTeamStore((s) => s.members);

  if (!open) return null;

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    addLead(form, tab);
    setForm(empty());
    onClose();
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Nuevo Lead</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        <form id="new-lead-form" onSubmit={handleSubmit} className="modal-body">
          <input className="field" placeholder="Nombre *" value={form.nombre} onChange={(e) => setField("nombre", e.target.value)} required />
          <input className="field" placeholder="Empresa / Negocio" value={form.empresa} onChange={(e) => setField("empresa", e.target.value)} />
          <input className="field" placeholder="Teléfono" value={form.telefono} onChange={(e) => setField("telefono", e.target.value)} />
          <input className="field" placeholder="Dirección" value={form.direccion} onChange={(e) => setField("direccion", e.target.value)} />
          <select className="field" value={form.responsable1} onChange={(e) => setField("responsable1", e.target.value)}>
            <option value="">Responsable 1</option>
            {members.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
          </select>
          <select className="field" value={form.responsable2} onChange={(e) => setField("responsable2", e.target.value)}>
            <option value="">Responsable 2</option>
            {members.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
          </select>
          <select className="field" value={form.empresaBio} onChange={(e) => setField("empresaBio", e.target.value)}>
            {EMPRESA_BIO_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="field" value={form.medio} onChange={(e) => setField("medio", e.target.value)}>
            <option value="">Medio —</option>
            {MEDIO_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <textarea
            className="textarea"
            placeholder="Observaciones"
            value={form.observaciones}
            onChange={(e) => setField("observaciones", e.target.value)}
          />
        </form>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" form="new-lead-form" className="btn btn-amber">Registrar Lead</button>
        </div>
      </div>
    </div>
  );
}
