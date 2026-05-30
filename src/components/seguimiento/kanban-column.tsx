"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Pencil, Check, X, Plus } from "lucide-react";
import { usePipelineStore } from "@/store/pipeline";
import { useLeadsStore } from "@/store/leads";
import { todayBA } from "@/lib/dates";
import { LeadCard } from "./lead-card";
import type { PipelineStage } from "@/types";
import type { Lead } from "@/types";

/* ── Divisor de fecha ────────────────────────────────────────────── */
function DateDivider({ dateStr }: { dateStr: string }) {
  const today = todayBA();

  if (!dateStr || dateStr.length < 10) {
    return (
      <div className="flex items-center gap-2 py-1 px-1">
        <div className="flex-1 h-px bg-slate-200 dark:bg-white/[0.06]" />
        <span className="text-[9px] font-black text-slate-400 dark:text-white/25 tracking-wide uppercase">Sin fecha</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-white/[0.06]" />
      </div>
    );
  }

  const [y, m, d] = dateStr.split("-");
  const yesterday = (() => {
    try {
      const dt = new Date(`${dateStr}T12:00:00`);
      if (isNaN(dt.getTime())) return "";
      dt.setDate(dt.getDate() - 1);
      return dt.toISOString().slice(0, 10);
    } catch { return ""; }
  })();

  let label = `${d}/${m}/${y}`;
  if (dateStr === today) label = "Hoy";
  else if (dateStr === yesterday) label = "Ayer";

  return (
    <div className="flex items-center gap-2 py-1 px-1">
      <div className="flex-1 h-px bg-slate-200 dark:bg-white/[0.06]" />
      <span className="text-[9px] font-black text-slate-400 dark:text-white/25 tracking-wide uppercase whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-white/[0.06]" />
    </div>
  );
}

/* ── Agrupar leads por fecha ─────────────────────────────────────── */
function groupByDate(leads: Lead[]): { date: string; leads: Lead[] }[] {
  const sorted = [...leads].sort((a, b) => {
    const da = a.fechaContacto ?? "";
    const db = b.fechaContacto ?? "";
    return db.localeCompare(da); // más reciente primero
  });

  const groups: { date: string; leads: Lead[] }[] = [];
  for (const lead of sorted) {
    const date = (lead.fechaContacto ?? "").slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.leads.push(lead);
    } else {
      groups.push({ date, leads: [lead] });
    }
  }
  return groups;
}

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  onAddLead: (stageId: string) => void;
}

export function KanbanColumn({ stage, leads, onCardClick, onAddLead }: KanbanColumnProps) {
  const { updateStage } = usePipelineStore();

  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(stage.label);
  const [editColor, setEditColor] = useState(stage.color);

  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "column" },
  });

  function saveEdit() {
    if (editLabel.trim()) updateStage(stage.id, { label: editLabel.trim(), color: editColor });
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-0 border rounded-[14px] overflow-hidden flex flex-col max-h-[calc(100vh-110px)] transition-colors ${
        isOver
          ? "bg-amber/[0.04] border-amber/[0.2]"
          : "bg-black/[0.03] dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.05]"
      }`}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="px-3 py-2.5 flex items-center gap-[7px] flex-shrink-0 group bg-[#07152f]">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
        {editing ? (
          <>
            <input
              autoFocus
              value={editLabel}
              onChange={e => setEditLabel(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveEdit()}
              className="flex-1 bg-white/[0.1] border border-white/[0.2] rounded px-[7px] py-0.5 text-[11px] font-bold text-white outline-none"
            />
            <div className="flex gap-1 flex-wrap" style={{ maxWidth: 80 }}>
              {["#38bdf8","#a78bfa","#f472b6","#fb923c","#4ade80","#facc15","#e879f9","#f87171","#94a3b8","#67e8f9"].map(c => (
                <div key={c} onClick={() => setEditColor(c)} className="w-3 h-3 rounded-full cursor-pointer flex-shrink-0" style={{ background: c, outline: editColor === c ? `2px solid ${c}` : "none", outlineOffset: 1 }} />
              ))}
            </div>
            <button onClick={saveEdit} className="bg-transparent border-none cursor-pointer text-green-400 flex-shrink-0"><Check size={13} /></button>
            <button onClick={() => setEditing(false)} className="bg-transparent border-none cursor-pointer text-red-400 flex-shrink-0"><X size={13} /></button>
          </>
        ) : (
          <>
            <span className="text-[11px] font-black tracking-[0.04em] uppercase flex-1 truncate text-white">{stage.label}</span>
            <span className="text-[10px] text-white/50 bg-white/[0.1] px-[7px] py-px rounded-full font-bold">{leads.length}</span>
            <button className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-white/50 cursor-pointer bg-transparent border-none hover:text-amber transition-all" onClick={() => setEditing(true)}>
              <Pencil size={11} />
            </button>
            {/* + Agregar lead en el header */}
            <button
              className="w-6 h-6 rounded-md bg-amber flex items-center justify-center cursor-pointer border-none flex-shrink-0 hover:opacity-85 transition-opacity"
              onClick={() => onAddLead(stage.id)}
              title="Agregar lead"
            >
              <Plus size={13} className="text-bio-dark" style={{ color: "#07152f" }} />
            </button>
          </>
        )}
      </div>

      {/* ── Cards con divisores de fecha ───────────────── */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-[#1e293b]">
        {groupByDate(leads).map(({ date, leads: group }) => (
          <div key={date} className="flex flex-col gap-3">
            <DateDivider dateStr={date} />
            {group.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                stageColor={stage.color}
                onClick={() => onCardClick(lead)}
              />
            ))}
          </div>
        ))}
      </div>

    </div>
  );
}
