"use client";

import { useState } from "react";
import { X, MessageCircle, Phone, ExternalLink, CalendarDays, Trash2 } from "lucide-react";
import { useLeadsStore } from "@/store/leads";
import { usePipelineStore } from "@/store/pipeline";
import { MEDIO_OPTS, EMPRESA_BIO_OPTS } from "@/lib/constants";
import type { Lead, LeadFormData } from "@/types";

interface LeadModalProps {
  lead: Lead | null;       // null = nuevo lead
  defaultStageId?: string;
  onClose: () => void;
}

const TEAM = ["TINCHO", "MATE", "LOREN", "CIRO"];

export function LeadModal({ lead, defaultStageId, onClose }: LeadModalProps) {
  const { addLead, updateLead, deleteLead } = useLeadsStore();
  const stages = usePipelineStore((s) => s.stages);

  const isNew = lead === null;
  const initialStage = lead?.tab ?? defaultStageId ?? stages[0]?.id ?? "CRM";

  const [stageId, setStageId] = useState(initialStage);
  const [form, setForm] = useState<Omit<LeadFormData, "empresaBio" | "medio"> & { empresaBio: string; medio: string }>({
    nombre:          lead?.nombre ?? "",
    nombre2:         lead?.nombre2 ?? "",
    empresa:         lead?.empresa ?? "",
    telefono:        lead?.telefono ?? "",
    telefono2:       lead?.telefono2 ?? "",
    email:           lead?.email ?? "",
    instagram:       lead?.instagram ?? "",
    direccion:       lead?.direccion ?? "",
    responsable1:    lead?.responsable1 ?? TEAM[0],
    responsable2:    lead?.responsable2 ?? "",
    empresaBio:      lead?.empresaBio ?? "BIOMARKETING",
    medio:           lead?.medio ?? "",
    observaciones:   lead?.observaciones ?? "",
    rubro:           lead?.rubro ?? "",
    servicio:        lead?.servicio ?? "",
    objetivos:       lead?.objetivos ?? "",
    meetingDatetime: lead?.meetingDatetime ?? "",
    proximoSeguimientoFecha: lead?.proximoSeguimientoFecha ?? "",
    source:          lead?.source ?? "",
    planAudiovisual: lead?.planAudiovisual ?? "",
    clave:           lead?.clave ?? "",
    activo:          lead?.activo ?? true,
    mesEntrada:      lead?.mesEntrada ?? "",
    cumpleanos:      lead?.cumpleanos ?? "",
    cumpleanos2:     lead?.cumpleanos2 ?? "",
    planId:          lead?.planId ?? "",
    proximoSeguimientoDias: lead?.proximoSeguimientoDias ?? 0,
  });

  const set = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  function handleSave() {
    if (!form.nombre.trim()) return;
    if (isNew) {
      addLead(form as LeadFormData, stageId);
    } else {
      updateLead(lead!.id, { ...form, tab: stageId } as Partial<Lead>);
    }
    onClose();
  }

  function handleDelete() {
    if (!lead) return;
    if (!confirm(`¿Eliminar a ${lead.nombre}?`)) return;
    deleteLead(lead.id);
    onClose();
  }

  function openWhatsApp() {
    const phone = form.telefono.replace(/\D/g, "");
    if (phone) window.open(`https://wa.me/${phone}`, "_blank");
  }

  function openInstagram() {
    const ig = form.instagram?.replace("@", "");
    if (ig) window.open(`https://instagram.com/${ig}`, "_blank");
  }

  /* Active stage color */
  const activeStage = stages.find(s => s.id === stageId);

  return (
    <div className="lm-backdrop" onClick={onClose}>
      <div className="lm-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Top ─────────────────────────────────────────── */}
        <div className="lm-top">
          <div className="lm-stage-dot" style={{ background: activeStage?.color ?? "#94a3b8" }} />
          <div className="lm-title-area">
            <div className="lm-name">{form.nombre || (isNew ? "Nuevo lead" : "—")}</div>
            <div className="lm-sub">{form.empresa || "Sin empresa"} · {form.empresaBio}</div>
          </div>
          <button className="lm-close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* ── Stage pills ─────────────────────────────────── */}
        <div className="lm-stages">
          {stages.map(s => (
            <button
              key={s.id}
              className={`lm-stage-pill${stageId === s.id ? " active" : ""}`}
              style={stageId === s.id ? { background: `${s.color}18`, color: s.color, borderColor: `${s.color}40` } : {}}
              onClick={() => setStageId(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Quick actions ────────────────────────────────── */}
        <div className="lm-quick">
          <button className="lm-quick-btn ws" onClick={openWhatsApp}>
            <MessageCircle size={13} /> WhatsApp
          </button>
          <button className="lm-quick-btn call" onClick={() => form.telefono && window.open(`tel:${form.telefono}`)}>
            <Phone size={13} /> Llamar
          </button>
          <button className="lm-quick-btn ig" onClick={openInstagram}>
            <ExternalLink size={13} /> Instagram
          </button>
          <button className="lm-quick-btn" onClick={() => set("meetingDatetime", "")}>
            <CalendarDays size={13} /> Reunión
          </button>
        </div>

        {/* ── Fields ──────────────────────────────────────── */}
        <div className="lm-body">

          <div>
            <div className="lm-section-title">Contacto</div>
            <div className="lm-grid">
              <div className="lm-field">
                <label className="lm-label">Nombre *</label>
                <input className="lm-input" value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Nombre y apellido" />
              </div>
              <div className="lm-field">
                <label className="lm-label">Empresa</label>
                <input className="lm-input" value={form.empresa} onChange={e => set("empresa", e.target.value)} />
              </div>
              <div className="lm-field">
                <label className="lm-label">Teléfono</label>
                <input className="lm-input" value={form.telefono} onChange={e => set("telefono", e.target.value)} />
              </div>
              <div className="lm-field">
                <label className="lm-label">Instagram</label>
                <input className="lm-input" value={form.instagram ?? ""} onChange={e => set("instagram", e.target.value)} placeholder="@usuario" />
              </div>
              <div className="lm-field">
                <label className="lm-label">Email</label>
                <input className="lm-input" type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)} />
              </div>
              <div className="lm-field">
                <label className="lm-label">Rubro</label>
                <input className="lm-input" value={form.rubro ?? ""} onChange={e => set("rubro", e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <div className="lm-section-title">Gestión</div>
            <div className="lm-grid">
              <div className="lm-field">
                <label className="lm-label">Responsable</label>
                <select className="lm-select" value={form.responsable1} onChange={e => set("responsable1", e.target.value)}>
                  {TEAM.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="lm-field">
                <label className="lm-label">Medio</label>
                <select className="lm-select" value={form.medio} onChange={e => set("medio", e.target.value)}>
                  <option value="">—</option>
                  {MEDIO_OPTS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="lm-field">
                <label className="lm-label">Empresa Bio</label>
                <select className="lm-select" value={form.empresaBio} onChange={e => set("empresaBio", e.target.value)}>
                  {EMPRESA_BIO_OPTS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div className="lm-field">
                <label className="lm-label">Próximo seguimiento</label>
                <input className="lm-input" type="date" value={form.proximoSeguimientoFecha ?? ""} onChange={e => set("proximoSeguimientoFecha", e.target.value)} />
              </div>
              <div className="lm-field">
                <label className="lm-label">Fecha reunión</label>
                <input className="lm-input" type="datetime-local" value={form.meetingDatetime ?? ""} onChange={e => set("meetingDatetime", e.target.value)} />
              </div>
              <div className="lm-field">
                <label className="lm-label">Servicio</label>
                <input className="lm-input" value={form.servicio ?? ""} onChange={e => set("servicio", e.target.value)} />
              </div>
              <div className="lm-field full">
                <label className="lm-label">Observaciones</label>
                <textarea className="lm-textarea" value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={3} />
              </div>
            </div>
          </div>

          <div>
            <div className="lm-section-title">Información adicional</div>
            <div className="lm-grid">
              <div className="lm-field">
                <label className="lm-label">Dirección</label>
                <input className="lm-input" value={form.direccion} onChange={e => set("direccion", e.target.value)} />
              </div>
              <div className="lm-field">
                <label className="lm-label">Objetivos</label>
                <input className="lm-input" value={form.objetivos ?? ""} onChange={e => set("objetivos", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="lm-footer">
          <button className="lm-btn-save" onClick={handleSave}>
            {isNew ? "Crear lead" : "Guardar cambios"}
          </button>
          <button className="lm-btn-cancel" onClick={onClose}>Cancelar</button>
          {!isNew && (
            <button className="lm-btn-delete" onClick={handleDelete}>
              <Trash2 size={13} /> Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
