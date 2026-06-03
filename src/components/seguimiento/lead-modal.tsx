"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { nowDatetimeBA } from "@/lib/dates";
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

/* ── Campo de fecha ──────────────────────────────────────────────── */
function DateField({
  label, value, onChange, withTime, inputCls,
}: {
  label: string; value: string; onChange: (v: string) => void;
  withTime?: boolean; inputCls: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[13px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">{label}</label>
      <input
        type={withTime ? "datetime-local" : "date"}
        value={value ? (withTime ? (value.includes("T") ? value.slice(0, 16) : value.slice(0, 10) + "T00:00") : value.slice(0, 10)) : ""}
        onChange={e => onChange(e.target.value)}
        className={inputCls}
        style={!value ? { color: "transparent" } : undefined}
      />
    </div>
  );
}

export function LeadModal({ lead, defaultStageId, onClose }: LeadModalProps) {
  const { addLead, updateLead, deleteLead } = useLeadsStore();
  const stages = usePipelineStore((s) => s.stages);

  const isNew = lead === null;
  const initialStage = lead?.tab ?? defaultStageId ?? stages[0]?.id ?? "CRM";

  const [stageId, setStageId] = useState(initialStage);
  const [fechaContacto, setFechaContacto] = useState(lead?.fechaContacto ?? (isNew ? nowDatetimeBA() : ""));
  const [show2ndContact, setShow2ndContact] = useState(!!(lead?.nombre2 || lead?.telefono2));
  const [form, setForm] = useState<Omit<LeadFormData, "empresaBio" | "medio"> & { empresaBio: string; medio: string }>({
    nombre:          lead?.nombre ?? "",
    nombre2:         lead?.nombre2 ?? "",
    empresa:         lead?.empresa ?? "",
    telefono:        lead?.telefono ?? "",
    telefono2:       lead?.telefono2 ?? "",
    email:           lead?.email ?? "",
    instagram:       lead?.instagram ?? "",
    direccion:       lead?.direccion ?? "",
    responsable1:    lead?.responsable1 ?? "",
    responsable2:    lead?.responsable2 ?? "",
    empresaBio:      lead?.empresaBio ?? "BIOMARKETING",
    medio:           lead?.medio ?? "PRESENCIAL",
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
      updateLead(lead!.id, { ...form, tab: stageId, fechaContacto: fechaContacto || lead!.fechaContacto } as Partial<Lead>);
    }
    onClose();
  }

  function handleDelete() {
    if (!lead) return;
    if (!confirm(`¿Eliminar a ${lead.nombre}?`)) return;
    deleteLead(lead.id);
    onClose();
  }

  /* Active stage color */
  const activeStage = stages.find(s => s.id === stageId);

  /* Shared input/select/textarea classes */
  const inputCls = "bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-md py-[7px] px-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-amber dark:focus:border-amber/[0.3] focus:bg-white dark:focus:bg-white/[0.05] w-full transition-colors";
  const lbl = "text-[13px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]";

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 dark:bg-[#020817]/[0.82] backdrop-blur-[4px] flex items-center justify-center z-[200] p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[680px] bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.07] rounded-[18px] max-h-[92vh] flex flex-col shadow-[0_24px_60px_rgba(15,23,42,0.15)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.65)] text-slate-900 dark:text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Top ─────────────────────────────────────────── */}
        <div className="pt-5 px-[22px] flex items-start gap-3 flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full mt-[6px] flex-shrink-0" style={{ background: activeStage?.color ?? "#94a3b8" }} />
          <div className="flex-1 min-w-0">
            <div className="text-[19px] font-black text-slate-900 dark:text-slate-100 mb-0.5 truncate">{form.empresa || (isNew ? "Nuevo lead" : "—")}</div>
            <div className="text-xs text-slate-400 dark:text-[#334155]">{form.empresaBio}</div>
          </div>
          <button
            className="w-[30px] h-[30px] bg-slate-100 dark:bg-white/[0.04] border-none text-slate-400 dark:text-[#475569] cursor-pointer flex items-center justify-center flex-shrink-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/[0.1] dark:hover:text-red-400 transition-colors"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </div>


        {/* ── Fields ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-[22px] py-3.5 flex flex-col gap-2.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-[#1e3a5f] [&::-webkit-scrollbar-track]:bg-transparent">

          {/* Fila 1: Nombre + Empresa */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <label className={lbl}>Nombre contacto *</label>
              <input className={inputCls} value={form.nombre} onChange={e => set("nombre", e.target.value)} />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className={lbl}>Nombre negocio / Empresa</label>
              <input className={inputCls} value={form.empresa} onChange={e => set("empresa", e.target.value)} />
            </div>
          </div>

          {/* 2do contacto */}
          {show2ndContact ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <label className={lbl}>Nombre 2do contacto</label>
                <input className={inputCls} value={form.nombre2} onChange={e => set("nombre2", e.target.value)} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className={lbl}>Teléfono 2do contacto</label>
                <input className={inputCls} value={form.telefono2} onChange={e => set("telefono2", e.target.value)} />
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="self-start text-[10px] font-black text-slate-400 dark:text-slate-600 hover:text-amber dark:hover:text-amber bg-transparent border-none cursor-pointer px-0 py-0 flex items-center gap-1 transition-colors"
              onClick={() => setShow2ndContact(true)}
            >
              + 2do contacto
            </button>
          )}

          {/* Observaciones */}
          <div className="flex flex-col gap-0.5">
            <label className={lbl}>Observaciones</label>
            <textarea className={`${inputCls} resize-none min-h-[60px]`} value={form.observaciones} onChange={e => set("observaciones", e.target.value)} />
          </div>

          {/* Dirección + Teléfono */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <label className={lbl}>Dirección</label>
              <input className={inputCls} value={form.direccion} onChange={e => set("direccion", e.target.value)} />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className={lbl}>Teléfono</label>
              <input className={inputCls} value={form.telefono} onChange={e => set("telefono", e.target.value)} />
            </div>
          </div>

          {/* Email + Instagram */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <label className={lbl}>Email</label>
              <input className={inputCls} type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className={lbl}>Instagram</label>
              <input className={inputCls} value={form.instagram ?? ""} onChange={e => set("instagram", e.target.value)} placeholder="@usuario" />
            </div>
          </div>

          {/* Fila 5: Responsable 1 + Responsable 2 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <label className={lbl}>Responsable 1</label>
              <select className={inputCls} value={form.responsable1 || ""} onChange={e => set("responsable1", e.target.value)}>
                <option value=""></option>
                {TEAM.filter(t => t !== form.responsable2).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className={lbl}>Responsable 2</label>
              <select className={inputCls} value={form.responsable2 || ""} onChange={e => set("responsable2", e.target.value)}>
                <option value=""></option>
                {TEAM.filter(t => t !== form.responsable1).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Fila 6: Medio + Empresa Bio */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <label className={lbl}>Medio de contacto</label>
              <select className={inputCls} value={form.medio} onChange={e => set("medio", e.target.value)}>
                <option value=""></option>
                {MEDIO_OPTS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className={lbl}>Empresa Bio</label>
              <select className={inputCls} value={form.empresaBio} onChange={e => set("empresaBio", e.target.value)}>
                {EMPRESA_BIO_OPTS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-2">
            <DateField label="Fecha y hora de contacto" value={fechaContacto} onChange={setFechaContacto} withTime inputCls={inputCls} />
            <DateField label="Próximo seguimiento" value={form.proximoSeguimientoFecha ?? ""} onChange={v => set("proximoSeguimientoFecha", v)} inputCls={inputCls} />
            <DateField label="Fecha reunión" value={form.meetingDatetime ?? ""} onChange={v => set("meetingDatetime", v)} withTime inputCls={inputCls} />
          </div>

        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="px-[22px] py-3 border-t border-slate-200 dark:border-white/[0.05] flex items-center gap-2 flex-shrink-0">
          <button className="btn btn-sm btn-amber" onClick={handleSave}>
            {isNew ? "Crear lead" : "Guardar cambios"}
          </button>
          <button className="btn btn-sm btn-outline" onClick={onClose}>Cancelar</button>
          {!isNew && (
            <button className="btn btn-sm btn-danger ml-auto flex items-center gap-1" onClick={handleDelete}>
              <Trash2 size={13} /> Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
