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

  function set(key: string, value: string) {
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
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[100]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[700px] max-h-[92vh] bg-white rounded-[28px] overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,.25)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-[26px] font-black m-0">Nuevo Lead</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 p-6 overflow-auto">
          <input
            className="border border-slate-200 rounded-xl px-4 py-3.5 outline-none text-[15px]"
            placeholder="Nombre *"
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            required
          />
          <input
            className="border border-slate-200 rounded-xl px-4 py-3.5 outline-none text-[15px]"
            placeholder="Empresa / Negocio"
            value={form.empresa}
            onChange={(e) => set("empresa", e.target.value)}
          />
          <input
            className="border border-slate-200 rounded-xl px-4 py-3.5 outline-none text-[15px]"
            placeholder="Teléfono"
            value={form.telefono}
            onChange={(e) => set("telefono", e.target.value)}
          />
          <input
            className="border border-slate-200 rounded-xl px-4 py-3.5 outline-none text-[15px]"
            placeholder="Dirección"
            value={form.direccion}
            onChange={(e) => set("direccion", e.target.value)}
          />
          <select
            className="border border-slate-200 rounded-xl px-4 py-3.5 outline-none text-[15px]"
            value={form.responsable1}
            onChange={(e) => set("responsable1", e.target.value)}
          >
            <option value="">Responsable 1</option>
            {members.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
          </select>
          <select
            className="border border-slate-200 rounded-xl px-4 py-3.5 outline-none text-[15px]"
            value={form.responsable2}
            onChange={(e) => set("responsable2", e.target.value)}
          >
            <option value="">Responsable 2</option>
            {members.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
          </select>
          <select
            className="border border-slate-200 rounded-xl px-4 py-3.5 outline-none text-[15px]"
            value={form.empresaBio}
            onChange={(e) => set("empresaBio", e.target.value)}
          >
            {EMPRESA_BIO_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select
            className="border border-slate-200 rounded-xl px-4 py-3.5 outline-none text-[15px]"
            value={form.medio}
            onChange={(e) => set("medio", e.target.value)}
          >
            <option value="">Medio —</option>
            {MEDIO_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <textarea
            className="col-span-2 border border-slate-200 rounded-xl px-4 py-3.5 outline-none text-[15px] min-h-[100px] resize-y"
            placeholder="Observaciones"
            value={form.observaciones}
            onChange={(e) => set("observaciones", e.target.value)}
          />

          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-[18px] border border-slate-200 font-bold text-[14px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-3 rounded-[18px] bg-[var(--amber)] font-bold text-[14px] text-[#111827] hover:-translate-y-px transition-all"
            >
              Registrar Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
