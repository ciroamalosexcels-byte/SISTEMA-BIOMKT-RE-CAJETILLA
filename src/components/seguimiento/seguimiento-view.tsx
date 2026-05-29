"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Plus, LayoutGrid, List } from "lucide-react";
import { useLeadsStore } from "@/store/leads";
import { usePipelineStore } from "@/store/pipeline";
import { KanbanColumn } from "./kanban-column";
import { LeadModal } from "./lead-modal";
import type { Lead } from "@/types";

type ViewMode = "kanban" | "table";

export function SeguimientoView() {
  const rows = useLeadsStore((s) => s.rows);
  const moveLeadTo = useLeadsStore((s) => s.moveLeadTo);
  const stages = usePipelineStore((s) => s.stages);
  const addStage = usePipelineStore((s) => s.addStage);

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedLead, setSelectedLead] = useState<Lead | null | undefined>(undefined);
  const [defaultStageId, setDefaultStageId] = useState<string>("");
  const [draggingLead, setDraggingLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  /* Leads filtrados por etapa (excluye BASE que no existe como etapa) */
  const leadsForStage = (stageId: string) =>
    rows.filter((r) => r.tab === stageId && r.activo !== false);

  const totalActive = rows.filter((r) => r.activo !== false).length;

  /* ── DnD handlers ─────────────────────────────────────────────── */
  function handleDragStart(event: DragStartEvent) {
    const lead = rows.find((r) => r.id === event.active.id);
    if (lead) setDraggingLead(lead);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingLead(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const targetId = String(over.id);

    /* Over could be a column or a card */
    const isColumn = stages.some((s) => s.id === targetId);
    if (isColumn) {
      moveLeadTo(String(active.id), targetId);
      return;
    }
    /* If over a card, find its stage */
    const overLead = rows.find((r) => r.id === targetId);
    if (overLead && overLead.tab !== active.data.current?.stageId) {
      moveLeadTo(String(active.id), overLead.tab);
    }
  }

  /* ── Add new stage ────────────────────────────────────────────── */
  function handleAddStage() {
    const name = window.prompt("Nombre de la nueva etapa:");
    if (name?.trim()) addStage(name.trim());
  }

  /* ── Modal helpers ────────────────────────────────────────────── */
  function openNewLead(stageId: string) {
    setDefaultStageId(stageId);
    setSelectedLead(null);
  }

  function openEditLead(lead: Lead) {
    setSelectedLead(lead);
  }

  function closeModal() {
    setSelectedLead(undefined);
    setDefaultStageId("");
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-bio-bg dark:bg-[#080f1e] text-slate-900 dark:text-slate-200">
      {/* Topbar */}
      <div className="h-[54px] flex items-center px-5 gap-3 border-b border-black/[0.05] dark:border-white/[0.05] bg-white dark:bg-[#080f1e] flex-shrink-0">
        <div>
          <span className="text-[15px] font-black text-slate-900 dark:text-slate-200">Seguimiento</span>
          <span className="text-[11px] text-slate-400 dark:text-slate-600 ml-2.5">{totalActive} leads activos</span>
        </div>
        <div className="flex-1" />
        <div className="flex gap-0.5 bg-black/[0.05] dark:bg-white/[0.05] p-0.5 rounded-lg">
          <button
            className={`px-[11px] py-1 rounded-md text-[11px] font-bold cursor-pointer border-none transition-colors ${viewMode === "kanban" ? "bg-white dark:bg-white/[0.1] text-slate-900 dark:text-slate-200 shadow-sm" : "bg-transparent text-slate-400 dark:text-slate-600 hover:text-slate-500"}`}
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid size={13} className="inline mr-1 align-middle" />Kanban
          </button>
          <button
            className={`px-[11px] py-1 rounded-md text-[11px] font-bold cursor-pointer border-none transition-colors ${viewMode === "table" ? "bg-white dark:bg-white/[0.1] text-slate-900 dark:text-slate-200 shadow-sm" : "bg-transparent text-slate-400 dark:text-slate-600 hover:text-slate-500"}`}
            onClick={() => setViewMode("table")}
          >
            <List size={13} className="inline mr-1 align-middle" />Tabla
          </button>
        </div>
        <button
          className="px-3.5 py-1.5 bg-amber text-bio-dark rounded-none text-xs font-black border-none cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => openNewLead(sortedStages[0]?.id ?? "CRM")}
        >
          + Nuevo lead
        </button>
      </div>

      {viewMode === "kanban" ? (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden px-5 py-4 flex gap-3 items-start">
            {sortedStages.map((stage) => (
              <KanbanColumn key={stage.id} stage={stage} leads={leadsForStage(stage.id)} onCardClick={openEditLead} onAddLead={openNewLead} />
            ))}
            <button className="flex-shrink-0 w-12 flex flex-col items-center pt-3 gap-1 cursor-pointer opacity-30 hover:opacity-70 bg-transparent border-none transition-opacity" onClick={handleAddStage}>
              <div className="w-9 h-9 border-2 border-dashed border-slate-300 dark:border-[#1e293b] flex items-center justify-center text-slate-400 dark:text-[#334155]">
                <Plus size={16} />
              </div>
              <div className="text-[9px] text-slate-400 dark:text-[#334155] text-center leading-tight">Nueva<br />etapa</div>
            </button>
          </div>
          <DragOverlay>
            {draggingLead && (
              <div className="bg-white dark:bg-white/[0.08] border-2 border-amber p-[10px_11px] shadow-[0_16px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] pointer-events-none rotate-2 w-[220px]">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-200">{draggingLead.nombre}</div>
                {draggingLead.empresa && <div className="text-[10px] text-slate-400 dark:text-slate-600">{draggingLead.empresa}</div>}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="flex-1 overflow-auto px-5 py-4">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/[0.05]">
                <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-[0.06em] text-slate-400 dark:text-slate-600">Nombre</th>
                <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-[0.06em] text-slate-400 dark:text-slate-600">Empresa</th>
                <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-[0.06em] text-slate-400 dark:text-slate-600">Etapa</th>
                <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-[0.06em] text-slate-400 dark:text-slate-600">Responsable</th>
                <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-[0.06em] text-slate-400 dark:text-slate-600">Medio</th>
                <th className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-[0.06em] text-slate-400 dark:text-slate-600">Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              {sortedStages.flatMap((stage) =>
                leadsForStage(stage.id).map((lead) => (
                  <tr key={lead.id} onClick={() => openEditLead(lead)} className="cursor-pointer border-b border-slate-100 dark:border-white/[0.03] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-200">{lead.nombre}</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{lead.empresa}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${stage.color}18`, color: stage.color }}>{stage.label}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{lead.responsable1}</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{lead.medio}</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{lead.proximoSeguimientoFecha ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedLead !== undefined && (
        <LeadModal lead={selectedLead} defaultStageId={defaultStageId} onClose={closeModal} />
      )}
    </div>
  );
}
