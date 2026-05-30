"use client";

import { useState } from "react";
import { X, MessageCircle, Phone, ExternalLink, Trash2, User, ClipboardList } from "lucide-react";
import { useLeadsStore } from "@/store/leads";
import { usePipelineStore } from "@/store/pipeline";
import { MEDIO_OPTS, EMPRESA_BIO_OPTS } from "@/lib/constants";
import type { Lead, LeadFormData } from "@/types";

interface LeadModalProps {
  lead: Lead | null;
  defaultStageId?: string;
  onClose: () => void;
}

const TEAM = ["TINCHO", "MATE", "LOREN", "CIRO"];

type TabKey = "info" | "gestion";

export function LeadModal({ lead, defaultStageId, onClose }: LeadModalProps) {
  const { addLead, updateLead, deleteLead } = useLeadsStore();
  const stages = usePipelineStore((s) => s.stages);

  const isNew = lead === null;
  const initialStage = lead?.tab ?? defaultStageId ?? stages[0]?.id ?? "CRM";

  const [stageId, setStageId]           = useState(initialStage);
  const [fechaContacto, setFechaContacto] = useState(lead?.fechaContacto ?? "");
  const [activeTab, setActiveTab]       = useState<TabKey>("info");

  const [form, setForm] = useState<Omit<LeadFormData, "empresaBio" | "medio"> & { empresaBio: string; medio: string }>({
    nombre:                  lead?.nombre ?? "",
    nombre2:                 lead?.nombre2 ?? "",
    empresa:                 lead?.empresa ?? "",
    telefono:                lead?.telefono ?? "",
    telefono2:               lead?.telefono2 ?? "",
    email:                   lead?.email ?? "",
    instagram:               lead?.instagram ?? "",
    direccion:               lead?.direccion ?? "",
    responsable1:            lead?.responsable1 ?? TEAM[0],
    responsable2:            lead?.responsable2 ?? "",
    empresaBio:              lead?.empresaBio ?? "BIOMARKETING",
    medio:                   lead?.medio ?? "",
    observaciones:           lead?.observaciones ?? "",
    rubro:                   lead?.rubro ?? "",
    servicio:                lead?.servicio ?? "",
    objetivos:               lead?.objetivos ?? "",
    meetingDatetime:         lead?.meetingDatetime ?? "",
    proximoSeguimientoFecha: lead?.proximoSeguimientoFecha ?? "",
    source:                  lead?.source ?? "",
    planAudiovisual:         lead?.planAudiovisual ?? "",
    clave:                   lead?.clave ?? "",
    activo:                  lead?.activo ?? true,
    mesEntrada:              lead?.mesEntrada ?? "",
    cumpleanos:              lead?.cumpleanos ?? "",
    cumpleanos2:             lead?.cumpleanos2 ?? "",
    planId:                  lead?.planId ?? "",
    proximoSeguimientoDias:  lead?.proximoSeguimientoDias ?? 0,
  });

  const set = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  function handleSave() {
    if (!form.nombre.trim()) return;
    if (isNew) {
      addLead(form as LeadFormData, stageId);
    } else {
      updateLead(lead!.id, {
        ...form,
        tab: stageId,
        fechaContacto: fechaContacto || lead!.fechaContacto,
      } as Partial<Lead>);
    }
    onClose();
  }

  function handleDelete() {
    if (!lead) return;
    if (!confirm(`¿Eliminar a ${lead.nombre}?`)) return;
    deleteLead(lead.id);
    onClose();
  }

  const openWhatsApp  = () => { const p = form.telefono.replace(/\D/g,""); if (p) window.open(`https://wa.me/${p}`,"_blank"); };
  const openInstagram = () => { const ig = form.instagram?.replace("@",""); if (ig) window.open(`https://instagram.com/${ig}`,"_blank"); };
  const openCall      = () => { if (form.telefono) window.open(`tel:${form.telefono}`); };

  const activeStage = stages.find(s => s.id === stageId);

  /* Shared field classes */
  const lbl = "block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5";
  const inp = "w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl px-4 py-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-white/20 outline-none focus:border-amber dark:focus:border-amber/50 focus:ring-2 focus:ring-amber/10 transition-all";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(25,28,32,0.45)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[680px] max-h-[90vh] bg-white dark:bg-[#0d1b2e] rounded-[20px] shadow-[0_32px_80px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="relative bg-slate-50 dark:bg-[#111f35] px-8 pt-8 pb-0 flex-shrink-0">

          {/* Close */}
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white dark:bg-white/[0.07] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/[0.1] transition-colors cursor-pointer"
            onClick={onClose}
          >
            <X size={16} />
          </button>

          {/* Lead identity + quick actions */}
          <div className="flex items-end justify-between mb-6">
            <div>
              {/* Stage badge */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                  style={{ background: `${activeStage?.color ?? "#94a3b8"}18`, color: activeStage?.color ?? "#94a3b8", border: `1px solid ${activeStage?.color ?? "#94a3b8"}30` }}
                >
                  {activeStage?.label ?? "Sin etapa"}
                </span>
              </div>
              <h2 className="text-[22px] font-black text-slate-900 dark:text-white leading-tight">
                {form.nombre || (isNew ? "Nuevo lead" : "—")}
              </h2>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {form.empresa || "Sin empresa"}{form.rubro ? ` · ${form.rubro}` : ""}
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex gap-2">
              <button
                onClick={openWhatsApp}
                className="w-11 h-11 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white flex items-center justify-center transition-all cursor-pointer border-none"
                title="WhatsApp"
              >
                <MessageCircle size={20} />
              </button>
              <button
                onClick={openCall}
                className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all cursor-pointer border-none"
                title="Llamar"
              >
                <Phone size={20} />
              </button>
              <button
                onClick={openInstagram}
                className="w-11 h-11 rounded-xl bg-[#E4405F]/10 text-[#E4405F] hover:bg-[#E4405F] hover:text-white flex items-center justify-center transition-all cursor-pointer border-none"
                title="Instagram"
              >
                <ExternalLink size={20} />
              </button>
            </div>
          </div>

          {/* Stage selector pills */}
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {stages.map(s => (
              <button
                key={s.id}
                onClick={() => setStageId(s.id)}
                className="px-3 py-1 rounded-full text-[10px] font-black cursor-pointer whitespace-nowrap border transition-all"
                style={stageId === s.id
                  ? { background: `${s.color}18`, color: s.color, borderColor: `${s.color}40` }
                  : { background: "transparent", color: "#94a3b8", borderColor: "transparent" }
                }
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Tab bar */}
          <div className="flex gap-8 border-b border-slate-200 dark:border-white/[0.08]">
            {([
              { key: "info",    label: "Info de Contacto", Icon: User },
              { key: "gestion", label: "Gestión de Venta",  Icon: ClipboardList },
            ] as { key: TabKey; label: string; Icon: React.ComponentType<{size?:number}> }[]).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-[13px] font-bold transition-all cursor-pointer bg-transparent border-x-0 border-t-0 ${
                  activeTab === key
                    ? "border-amber text-amber-3 dark:text-amber"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-8 py-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/[0.1]">

          {/* TAB: Info de Contacto */}
          {activeTab === "info" && (
            <div className="space-y-6">
              {/* Section header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber/[0.12] flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-amber-3 dark:text-amber" />
                </div>
                <h3 className="text-[14px] font-black text-slate-900 dark:text-white">Datos del Lead</h3>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label className={lbl}>Nombre *</label>
                  <input className={inp} value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Nombre y apellido" />
                </div>
                <div>
                  <label className={lbl}>Empresa</label>
                  <input className={inp} value={form.empresa} onChange={e => set("empresa", e.target.value)} placeholder="Nombre de la empresa" />
                </div>
                <div>
                  <label className={lbl}>Teléfono</label>
                  <input className={inp} value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="+54 9 11..." />
                </div>
                <div>
                  <label className={lbl}>Email</label>
                  <input className={inp} type="email" value={form.email ?? ""} onChange={e => set("email", e.target.value)} placeholder="email@empresa.com" />
                </div>
                <div>
                  <label className={lbl}>Instagram</label>
                  <input className={inp} value={form.instagram ?? ""} onChange={e => set("instagram", e.target.value)} placeholder="@usuario" />
                </div>
                <div>
                  <label className={lbl}>Rubro</label>
                  <input className={inp} value={form.rubro ?? ""} onChange={e => set("rubro", e.target.value)} placeholder="Sector o industria" />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Observaciones</label>
                  <textarea
                    className={`${inp} resize-y min-h-[100px]`}
                    value={form.observaciones}
                    onChange={e => set("observaciones", e.target.value)}
                    placeholder="Notas, comentarios, contexto del lead..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: Gestión de Venta */}
          {activeTab === "gestion" && (
            <div className="space-y-6">
              {/* Section */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardList size={16} className="text-blue-500" />
                </div>
                <h3 className="text-[14px] font-black text-slate-900 dark:text-white">Detalle de Gestión</h3>
              </div>

              <div className="p-5 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/[0.06]">
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <label className={lbl}>Responsable</label>
                    <select className={inp} value={form.responsable1} onChange={e => set("responsable1", e.target.value)}>
                      {TEAM.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Medio de contacto</label>
                    <select className={inp} value={form.medio} onChange={e => set("medio", e.target.value)}>
                      <option value="">— seleccionar —</option>
                      {MEDIO_OPTS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Empresa Bio</label>
                    <select className={inp} value={form.empresaBio} onChange={e => set("empresaBio", e.target.value)}>
                      {EMPRESA_BIO_OPTS.map(e => <option key={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Servicio de interés</label>
                    <input className={inp} value={form.servicio ?? ""} onChange={e => set("servicio", e.target.value)} placeholder="Ej: Contenido Audiovisual" />
                  </div>
                  <div>
                    <label className={lbl}>Próximo seguimiento</label>
                    <input className={inp} type="date" value={form.proximoSeguimientoFecha ?? ""} onChange={e => set("proximoSeguimientoFecha", e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Fecha de reunión</label>
                    <input className={inp} type="datetime-local" value={form.meetingDatetime ?? ""} onChange={e => set("meetingDatetime", e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Fecha y hora de contacto</label>
                    <input
                      className={inp}
                      type="datetime-local"
                      value={fechaContacto ? fechaContacto.slice(0, 16) : ""}
                      onChange={e => setFechaContacto(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={lbl}>Dirección</label>
                    <input className={inp} value={form.direccion} onChange={e => set("direccion", e.target.value)} placeholder="Ciudad, dirección..." />
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>Objetivos</label>
                    <input className={inp} value={form.objetivos ?? ""} onChange={e => set("objetivos", e.target.value)} placeholder="¿Qué busca lograr?" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="px-8 py-5 bg-white dark:bg-[#0d1b2e] border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between flex-shrink-0">
          {!isNew ? (
            <button
              className="flex items-center gap-2 text-red-500 dark:text-red-400 font-bold text-[13px] hover:bg-red-50 dark:hover:bg-red-500/10 px-4 py-2 rounded-xl transition-colors cursor-pointer border-none bg-transparent"
              onClick={handleDelete}
            >
              <Trash2 size={16} /> ELIMINAR LEAD
            </button>
          ) : <div />}

          <div className="flex items-center gap-3">
            <button
              className="px-5 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 font-bold text-[13px] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer border-none bg-transparent"
              onClick={onClose}
            >
              CANCELAR
            </button>
            <button
              className="px-7 py-2.5 rounded-xl bg-amber text-bio-dark font-extrabold text-[13px] hover:opacity-90 active:scale-95 transition-all cursor-pointer border-none shadow-lg"
              onClick={handleSave}
            >
              {isNew ? "CREAR LEAD" : "GUARDAR CAMBIOS"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
