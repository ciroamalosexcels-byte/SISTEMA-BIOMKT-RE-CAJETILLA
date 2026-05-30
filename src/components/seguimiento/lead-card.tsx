"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { MessageCircle, Phone, ExternalLink, Calendar, RefreshCw } from "lucide-react";
import { todayBA } from "@/lib/dates";
import type { Lead } from "@/types";

const MEDIO_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  WHATSAPP:   MessageCircle,
  LLAMADA:    Phone,
  INSTAGRAM:  ExternalLink,
  MAIL:       ExternalLink,
  PRESENCIAL: ExternalLink,
};

/* Colores por medio — misma paleta que las etapas del pipeline */
const MEDIO_COLOR: Record<string, string> = {
  WHATSAPP:   "#22c55e", // verde
  LLAMADA:    "#f97316", // naranja
  INSTAGRAM:  "#ef4444", // rojo
  MAIL:       "#3b82f6", // azul
  PRESENCIAL: "#eab308", // amarillo
};

interface LeadCardProps {
  lead: Lead;
  stageColor: string;
  onClick: () => void;
}

export function LeadCard({ lead, stageColor: _stageColor, onClick }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { type: "lead", stageId: lead.tab },
  });

  const today = todayBA();
  const isFollowUpToday =
    lead.proximoSeguimientoFecha &&
    lead.proximoSeguimientoFecha.startsWith(today);

  const isFollowUpLate =
    lead.proximoSeguimientoFecha &&
    lead.proximoSeguimientoFecha < today;

  const hasDate = lead.meetingDatetime;
  const displayDate = hasDate
    ? new Date(lead.meetingDatetime!).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
    : null;

  const MedioIcon = lead.medio ? MEDIO_ICONS[lead.medio] : null;

  const initials = lead.responsable1
    ? lead.responsable1.slice(0, 2).toUpperCase()
    : "—";

  function openWhatsApp(e: React.MouseEvent) {
    e.stopPropagation();
    const phone = lead.telefono?.replace(/\D/g, "");
    if (phone) window.open(`https://wa.me/${phone}`, "_blank");
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-xl p-[10px_11px] cursor-pointer transition-all select-none shadow-sm group overflow-hidden h-[118px] flex flex-col ${
        isDragging ? "opacity-40 rotate-1" : "hover:border-amber hover:-translate-y-px hover:shadow-md"
      }`}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-0.5 leading-tight">{lead.empresa || lead.nombre}</div>
      {lead.empresa && <div className="text-[10px] text-slate-400 dark:text-slate-600 mb-[7px]">{lead.nombre}</div>}

      <div className="flex gap-1 flex-wrap flex-1 content-start mb-[7px] overflow-hidden">
        {MedioIcon && (() => {
          const c = MEDIO_COLOR[lead.medio ?? ""] ?? "#94a3b8";
          return (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-[3px]"
              style={{ background: `${c}18`, color: c }}
            >
              <MedioIcon size={9} /> {lead.medio}
            </span>
          );
        })()}
        {displayDate && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-[3px] bg-indigo-100 dark:bg-indigo-500/[0.1] text-indigo-600 dark:text-indigo-400">
            <Calendar size={9} /> {displayDate}
          </span>
        )}
        {isFollowUpToday && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-[3px] bg-red-100 dark:bg-red-500/[0.1] text-red-600 dark:text-red-400">
            <RefreshCw size={9} /> seguir hoy
          </span>
        )}
        {isFollowUpLate && !isFollowUpToday && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-[3px] bg-red-100 dark:bg-red-500/[0.1] text-red-600 dark:text-red-400">
            <RefreshCw size={9} /> atrasado
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[5px]">
          {lead.responsable1 && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/60">
              {lead.responsable1}
            </span>
          )}
        </div>
        <div className="flex gap-[3px] opacity-0 group-hover:opacity-100 transition-opacity">
          {lead.telefono && (
            <button className="w-[22px] h-[22px] rounded bg-slate-100 dark:bg-white/[0.05] border-none flex items-center justify-center text-slate-400 dark:text-[#334155] cursor-pointer hover:bg-amber/[0.15] hover:text-amber-3 dark:hover:text-amber transition-colors" onClick={openWhatsApp}>
              <MessageCircle size={12} />
            </button>
          )}
          <button className="w-[22px] h-[22px] rounded bg-slate-100 dark:bg-white/[0.05] border-none flex items-center justify-center text-slate-400 dark:text-[#334155] cursor-pointer hover:bg-amber/[0.15] hover:text-amber-3 dark:hover:text-amber transition-colors" onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
