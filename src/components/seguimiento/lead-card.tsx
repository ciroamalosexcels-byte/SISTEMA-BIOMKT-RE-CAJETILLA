"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { Calendar, RefreshCw, Trash2, ChevronLeft, ChevronRight, Phone, MessageCircle } from "lucide-react";
import { todayBA } from "@/lib/dates";
import { useLeadsStore } from "@/store/leads";
import type { Lead } from "@/types";


const MEDIO_COLOR: Record<string, string> = {
  WHATSAPP:   "#22c55e",
  LLAMADA:    "#f97316",
  INSTAGRAM:  "#ef4444",
  MAIL:       "#3b82f6",
  PRESENCIAL: "#eab308",
};


interface MoveTarget { fn: () => void; label: string; }

interface LeadCardProps {
  lead: Lead;
  stageColor: string;
  onClick: () => void;
  onMoveLeft:        MoveTarget | null;
  onMoveRight:       MoveTarget | null;
  onMoveSeguimiento: (() => void) | null;
}

function MoveBtn({ label, icon, onClick, title }: { label: string; icon?: "left" | "right"; onClick: (e: React.MouseEvent) => void; title: string }) {
  return (
    <span
      onClick={onClick} title={title} role="button"
      className="flex items-center gap-[2px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/60 text-[13px] font-black cursor-pointer whitespace-nowrap"
    >
      {icon === "left"  && <ChevronLeft  size={10} strokeWidth={3} />}
      {label}
      {icon === "right" && <ChevronRight size={10} strokeWidth={3} />}
    </span>
  );
}

function abbr(label: string): string {
  const match = label.match(/^(.+?)\s*(\d+)$/);
  if (match) return match[1].slice(0, 3) + " " + match[2];
  return label.slice(0, 3) + ".";
}

export const LeadCard = memo(function LeadCard({ lead, stageColor: _stageColor, onClick, onMoveLeft, onMoveRight, onMoveSeguimiento }: LeadCardProps) {
  const deleteLead = useLeadsStore((s) => s.deleteLead);
  const [ctxMenu, setCtxMenu]   = useState<{ x: number; y: number } | null>(null);
  const [exiting, setExiting]   = useState<"left" | "right" | null>(null);

  const today = todayBA();
  const isFollowUpToday = lead.proximoSeguimientoFecha?.startsWith(today);
  const isFollowUpLate  = lead.proximoSeguimientoFecha && lead.proximoSeguimientoFecha < today;
  const meetingBadge = (() => {
    if (!lead.meetingDatetime) return null;
    const dt = new Date(lead.meetingDatetime);
    if (isNaN(dt.getTime())) return null;
    const date = dt.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
    const todayDate = new Date(`${today}T00:00:00`);
    const diffMs   = dt.setHours(0,0,0,0) - todayDate.getTime();
    const diffDays = Math.round(diffMs / 86400000);
    let rel = "";
    if (diffDays === 0)       rel = "Hoy";
    else if (diffDays === 1)  rel = "Mañana";
    else if (diffDays === -1) rel = "Ayer";
    else if (diffDays > 1)    rel = `En ${diffDays} días`;
    else                      rel = `Hace ${Math.abs(diffDays)} días`;
    return `${date} · ${rel}`;
  })();

  const closeCtx = useCallback(() => setCtxMenu(null), []);
  useEffect(() => {
    if (!ctxMenu) return;
    window.addEventListener("click", closeCtx);
    window.addEventListener("contextmenu", closeCtx);
    return () => { window.removeEventListener("click", closeCtx); window.removeEventListener("contextmenu", closeCtx); };
  }, [ctxMenu, closeCtx]);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation(); deleteLead(lead.id); setCtxMenu(null);
  }

  function handleMove(dir: "left" | "right", cb: (() => void) | null) {
    if (!cb || exiting) return;
    setExiting(dir);
    setTimeout(() => { cb(); setExiting(null); }, 200);
  }

  const exitStyle: React.CSSProperties = exiting
    ? { opacity: 0, transform: exiting === "left" ? "translateX(-32px)" : "translateX(32px)", transition: "opacity 0.18s ease, transform 0.18s ease" }
    : { transition: "opacity 0.18s ease, transform 0.18s ease, border-color 0.1s, box-shadow 0.1s" };

  return (
    <>
      <div
        style={exitStyle}
        className="relative group bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden h-[130px] flex flex-col cursor-pointer hover:border-amber hover:shadow-md"
        onClick={onClick}
        onContextMenu={handleContextMenu}
      >
        <div className="px-[11px] pt-[10px] pb-[10px] flex flex-col h-full select-none">
          <div className="text-[17px] font-bold text-slate-900 dark:text-slate-200 mb-0.5 leading-tight truncate">{lead.empresa || lead.nombre}</div>
          {lead.empresa && <div className="text-[14px] text-slate-400 dark:text-slate-600 mb-1.5 truncate">{lead.nombre}</div>}

          <div className="flex gap-1 items-center mt-auto mb-1.5 flex-shrink-0 flex-wrap">
            {lead.medio && (() => {
              const key = lead.medio.trim().toUpperCase();
              const c = MEDIO_COLOR[key] ?? "#94a3b8";
              return (
                <span className="text-[13px] font-bold px-2 py-0.5 rounded-full flex items-center gap-[3px]" style={{ background: `${c}18`, color: c }}>
                  {lead.medio}
                </span>
              );
            })()}
            {lead.telefono && lead.telefono.replace(/\D/g, "").length >= 6 && (
              <span title={lead.telefono} className="px-1.5 py-0.5 rounded-full flex items-center" style={{ background: "#94a3b820", color: "#94a3b8" }}>
                <Phone size={10} strokeWidth={2.5} />
              </span>
            )}
            {meetingBadge && (
              <span className="text-[13px] font-bold px-2 py-0.5 rounded-full flex items-center gap-[3px] bg-indigo-100 dark:bg-indigo-500/[0.1] text-indigo-600 dark:text-indigo-400">
                <Calendar size={9} /> {meetingBadge}
              </span>
            )}
            {(isFollowUpToday || isFollowUpLate) && (
              <span className="text-[13px] font-bold px-2 py-0.5 rounded-full flex items-center gap-[3px] bg-red-100 dark:bg-red-500/[0.1] text-red-600 dark:text-red-400">
                <RefreshCw size={9} /> {isFollowUpToday ? "Hoy" : "Atrasado"}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[5px]">
              {lead.responsable1 && (
                <span className="text-[13px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/60">
                  {lead.responsable1}
                </span>
              )}
            </div>
            <div className="flex gap-[3px] opacity-0 group-hover:opacity-100" style={{ transition: "opacity 0.12s" }}>
              {onMoveLeft
                ? <MoveBtn icon="left" label={abbr(onMoveLeft.label)} onClick={e => { e.stopPropagation(); handleMove("left", onMoveLeft.fn); }} title={onMoveLeft.label} />
                : <div style={{ width: 18 }} />
              }
              {onMoveSeguimiento && (
                <MoveBtn label="Seg." onClick={e => { e.stopPropagation(); handleMove("right", onMoveSeguimiento); }} title="Mover a Seguimiento" />
              )}
              {onMoveRight
                ? <MoveBtn icon="right" label={abbr(onMoveRight.label)} onClick={e => { e.stopPropagation(); handleMove("right", onMoveRight.fn); }} title={onMoveRight.label} />
                : <div style={{ width: 18 }} />
              }
            </div>
          </div>
        </div>
      </div>

      {ctxMenu && (
        <div
          className="fixed z-[500] bg-white dark:bg-[#0d1f3c] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] py-1 min-w-[160px] overflow-hidden"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          {lead.telefono && (
            <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] border-none bg-transparent cursor-pointer"
              onClick={() => { window.open(`tel:${lead.telefono}`); setCtxMenu(null); }}>
              <Phone size={13} /> Llamar
            </button>
          )}
          {lead.telefono && (
            <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/[0.08] border-none bg-transparent cursor-pointer"
              onClick={() => { window.open(`https://wa.me/${lead.telefono?.replace(/\D/g, "")}`); setCtxMenu(null); }}>
              <MessageCircle size={13} /> WhatsApp
            </button>
          )}
          {lead.telefono && <div className="mx-3 my-1 h-px bg-slate-100 dark:bg-white/[0.06]" />}
          <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.1] border-none bg-transparent cursor-pointer" onClick={handleDelete}>
            <Trash2 size={13} /> Eliminar lead
          </button>
        </div>
      )}
    </>
  );
});
