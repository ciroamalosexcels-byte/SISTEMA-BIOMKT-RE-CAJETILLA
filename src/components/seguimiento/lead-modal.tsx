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

  /* Shared input/select/textarea classes */
  const inputCls = "bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] py-[7px] px-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-amber dark:focus:border-amber/[0.3] focus:bg-white dark:focus:bg-white/[0.05] w-full transition-colors";

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 dark:bg-[#020817]/[0.82] backdrop-blur-[4px] flex items-center justify-center z-[200] p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[680px] bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.07] max-h-[92vh] flex flex-col shadow-[0_24px_60px_rgba(15,23,42,0.15)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.65)] text-slate-900 dark:text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Top ─────────────────────────────────────────── */}
        <div className="pt-5 px-[22px] flex items-start gap-3 flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full mt-[6px] flex-shrink-0" style={{ background: activeStage?.color ?? "#94a3b8" }} />
          <div className="flex-1 min-w-0">
            <div className="text-[19px] font-black text-slate-900 dark:text-slate-100 mb-0.5 truncate">{form.nombre || (isNew ? "Nuevo lead" : "—")}</div>
            <div className="text-xs text-slate-400 dark:text-[#334155]">{form.empresa || "Sin empresa"} · {form.empresaBio}</div>
          </div>
          <button
            className="w-[30px] h-[30px] bg-slate-100 dark:bg-white/[0.04] border-none text-slate-400 dark:text-[#475569] cursor-pointer flex items-center justify-center flex-shrink-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/[0.1] dark:hover:text-red-400 transition-colors"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Stage pills ─────────────────────────────────── */}
        <div className="flex gap-1 px-[22px] py-3 border-b border-slate-200 dark:border-white/[0.05] flex-shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {stages.map(s => (
            <button
              key={s.id}
              className={
                stageId === s.id
                  ? "px-3 py-1 rounded-full text-[10px] font-black cursor-pointer whitespace-nowrap border transition-all"
                  : "px-3 py-1 rounded-full text-[10px] font-black cursor-pointer whitespace-nowrap border transition-all bg-slate-50 dark:bg-white/[0.03] text-slate-400 dark:text-[#334155] border-transparent hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-500 dark:hover:text-slate-400"
              }
              style={stageId === s.id ? { background: `${s.color}18`, color: s.color, borderColor: `${s.color}40` } : {}}
              onClick={() => setStageId(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Quick actions ────────────────────────────────── */}
        <div className="flex gap-1 px-[22px] py-2 border-b border-slate-100 dark:border-white/[0.04] flex-shrink-0 flex-wrap">
          <button
            className="flex items-center gap-1 px-[11px] py-[5px] border border-slate-200 dark:border-white/[0.06] bg-transparent text-slate-500 dark:text-[#475569] text-[11px] font-bold cursor-pointer transition-all hover:bg-green-50 dark:hover:bg-green-500/[0.08] hover:text-green-600 dark:hover:text-green-400 hover:border-green-200 dark:hover:border-green-500/[0.2]"
            onClick={openWhatsApp}
          >
            <MessageCircle size={13} /> WhatsApp
          </button>
          <button
            className="flex items-center gap-1 px-[11px] py-[5px] border border-slate-200 dark:border-white/[0.06] bg-transparent text-slate-500 dark:text-[#475569] text-[11px] font-bold cursor-pointer transition-all hover:bg-blue-50 dark:hover:bg-blue-500/[0.08] hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-500/[0.2]"
            onClick={() => form.telefono && window.open(`tel:${form.telefono}`)}
          >
            <Phone size={13} /> Llamar
          </button>
          <button
            className="flex items-center gap-1 px-[11px] py-[5px] border border-slate-200 dark:border-white/[0.06] bg-transparent text-slate-500 dark:text-[#475569] text-[11px] font-bold cursor-pointer transition-all hover:bg-purple-50 dark:hover:bg-purple-500/[0.08] hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-200 dark:hover:border-purple-500/[0.2]"
            onClick={openInstagram}
          >
            <ExternalLink size={13} /> Instagram
          </button>
          <button
            className="flex items-center gap-1 px-[11px] py-[5px] border border-slate-200 dark:border-white/[0.06] bg-transparent text-slate-500 dark:text-[#475569] text-[11px] font-bold cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-white/[0.06]"
            onClick={() => set("meetingDatetime", "")}
          >
            <CalendarDays size={13} /> Reunión
          </button>
        </div>

        {/* ── Fields ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-[22px] py-3.5 flex flex-col gap-3.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-[#1e3a5f] [&::-webkit-scrollbar-track]:bg-transparent">

          <div>
            <div className="text-[9px] font-black text-slate-400 dark:text-[#1e3a5f] uppercase tracking-[0.1em] mb-1.5">Contacto</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Nombre *</label>
                <input className={inputCls} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Nombre y apellido" />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Empresa</label>
                <input className={inputCls} value={form.empresa} onChange={e => set("empresa", e.target.value)} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Teléfono</label>
                <input className={inputCls} value={form.telefono} onChange={e => set("telefono", e.target.value)} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Instagram</label>
                <input className={inputCls} value={form.instagram ?? ""} onChange={e => set("instagram", e.target.value)} placeholder="@usuario" />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Email</label>
                <input className={inputCls} type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Rubro</label>
                <input className={inputCls} value={form.rubro ?? ""} onChange={e => set("rubro", e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <div className="text-[9px] font-black text-slate-400 dark:text-[#1e3a5f] uppercase tracking-[0.1em] mb-1.5">Gestión</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Responsable</label>
                <select className={inputCls} value={form.responsable1} onChange={e => set("responsable1", e.target.value)}>
                  {TEAM.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Medio</label>
                <select className={inputCls} value={form.medio} onChange={e => set("medio", e.target.value)}>
                  <option value="">—</option>
                  {MEDIO_OPTS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Empresa Bio</label>
                <select className={inputCls} value={form.empresaBio} onChange={e => set("empresaBio", e.target.value)}>
                  {EMPRESA_BIO_OPTS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Próximo seguimiento</label>
                <input className={inputCls} type="date" value={form.proximoSeguimientoFecha ?? ""} onChange={e => set("proximoSeguimientoFecha", e.target.value)} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Fecha reunión</label>
                <input className={inputCls} type="datetime-local" value={form.meetingDatetime ?? ""} onChange={e => set("meetingDatetime", e.target.value)} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Servicio</label>
                <input className={inputCls} value={form.servicio ?? ""} onChange={e => set("servicio", e.target.value)} />
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Observaciones</label>
                <textarea className={`${inputCls} resize-y min-h-[68px]`} value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={3} />
              </div>
            </div>
          </div>

          <div>
            <div className="text-[9px] font-black text-slate-400 dark:text-[#1e3a5f] uppercase tracking-[0.1em] mb-1.5">Información adicional</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Dirección</label>
                <input className={inputCls} value={form.direccion} onChange={e => set("direccion", e.target.value)} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Objetivos</label>
                <input className={inputCls} value={form.objetivos ?? ""} onChange={e => set("objetivos", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="px-[22px] py-3 border-t border-slate-200 dark:border-white/[0.05] flex items-center gap-2 flex-shrink-0">
          <button
            className="px-[18px] py-2 bg-amber text-bio-dark border-none font-black text-xs cursor-pointer hover:opacity-90 transition-opacity"
            onClick={handleSave}
          >
            {isNew ? "Crear lead" : "Guardar cambios"}
          </button>
          <button
            className="px-[13px] py-2 bg-transparent text-slate-500 dark:text-[#334155] border border-slate-200 dark:border-white/[0.06] text-xs cursor-pointer hover:text-slate-700 dark:hover:text-slate-400 transition-colors"
            onClick={onClose}
          >
            Cancelar
          </button>
          {!isNew && (
            <button
              className="ml-auto px-[13px] py-2 bg-transparent text-red-700 dark:text-[#7f1d1d] border border-red-200 dark:border-red-500/[0.1] text-xs cursor-pointer flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-500/[0.08] hover:text-red-600 dark:hover:text-red-400 transition-colors"
              onClick={handleDelete}
            >
              <Trash2 size={13} /> Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
