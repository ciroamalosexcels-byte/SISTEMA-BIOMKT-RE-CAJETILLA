"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { LayoutGrid, List, Search, Phone, MessageCircle, Trash2, Zap } from "lucide-react";
import { useLeadsStore } from "@/store/leads";
import { usePipelineStore } from "@/store/pipeline";
import { KanbanColumn } from "./kanban-column";
import { LeadModal } from "./lead-modal";
import { CargaRapidaModal } from "./carga-rapida-modal";
import type { Lead } from "@/types";

type ViewMode = "kanban" | "table";

export function SeguimientoView() {
  const rows        = useLeadsStore((s) => s.rows);
  const moveLeadTo  = useLeadsStore((s) => s.moveLeadTo);
  const stages      = usePipelineStore((s) => s.stages);

  const [viewMode, setViewMode]       = useState<ViewMode>("kanban");
  const [cargaRapida, setCargaRapida] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null | undefined>(undefined);
  const [defaultStageId, setDefaultStageId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [meetingPrompt, setMeetingPrompt]     = useState<{ leadId: string; targetStage: string } | null>(null);
  const [meetingDate, setMeetingDate]         = useState("");
  const [followUpPrompt, setFollowUpPrompt]   = useState<{ leadId: string; targetStage: string } | null>(null);
  const [followUpDate, setFollowUpDate]       = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (!normalizedQuery) return rows;
    return rows.filter((lead) => {
      const haystack = [
        lead.nombre,
        lead.nombre2,
        lead.empresa,
        lead.telefono,
        lead.telefono2,
        lead.observaciones,
        lead.direccion,
        lead.responsable1,
        lead.responsable2,
        lead.medio,
        lead.rubro,
        lead.servicio,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [rows, normalizedQuery]);

  const sortedStages = useMemo(() => [...stages].filter(s => s.id !== "CLIENTES").sort((a, b) => a.order - b.order), [stages]);

  const leadsPerStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const r of filteredRows) {
      if (r.activo === false) continue;
      if (!map[r.tab]) map[r.tab] = [];
      map[r.tab].push(r);
    }
    return map;
  }, [filteredRows]);

  const totalActive = useMemo(() => filteredRows.filter((r) => r.activo !== false).length, [filteredRows]);

  const sortByFollowUpDate = useCallback((a: Lead, b: Lead) => {
    const aDate = (a.proximoSeguimientoFecha ?? "").slice(0, 10);
    const bDate = (b.proximoSeguimientoFecha ?? "").slice(0, 10);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return bDate.localeCompare(aDate);
  }, []);

  const isReunionStage = (id: string) => id === "REUNION_1" || id === "REUNION_2";

  const moveTo = useCallback((leadId: string, targetStage: string) => {
    if (isReunionStage(targetStage)) {
      setMeetingDate("");
      setMeetingPrompt({ leadId, targetStage });
    } else if (targetStage === "SEGUIMIENTO") {
      setFollowUpDate("");
      setFollowUpPrompt({ leadId, targetStage });
    } else {
      moveLeadTo(leadId, targetStage);
    }
  }, [moveLeadTo]);

  const confirmMeeting = useCallback(() => {
    if (!meetingPrompt) return;
    moveLeadTo(meetingPrompt.leadId, meetingPrompt.targetStage);
    if (meetingDate) {
      useLeadsStore.getState().updateLead(meetingPrompt.leadId, { meetingDatetime: meetingDate });
    }
    setMeetingPrompt(null);
  }, [meetingPrompt, meetingDate, moveLeadTo]);

  const confirmFollowUp = useCallback(() => {
    if (!followUpPrompt) return;
    moveLeadTo(followUpPrompt.leadId, followUpPrompt.targetStage);
    if (followUpDate) {
      useLeadsStore.getState().updateLead(followUpPrompt.leadId, { proximoSeguimientoFecha: followUpDate });
    }
    setFollowUpPrompt(null);
  }, [followUpPrompt, followUpDate, moveLeadTo]);

  const [tableCtx, setTableCtx]   = useState<{ x: number; y: number; lead: Lead } | null>(null);
  const [obsModal, setObsModal]   = useState<{ id: string; nombre: string; obs: string } | null>(null);
  const [obsText,  setObsText]    = useState("");

  useEffect(() => {
    if (!tableCtx) return;
    const close = () => setTableCtx(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => { window.removeEventListener("click", close); window.removeEventListener("contextmenu", close); };
  }, [tableCtx]);

  const openNewLead  = useCallback((stageId: string) => { setDefaultStageId(stageId); setSelectedLead(null); }, []);
  const openEditLead = useCallback((lead: Lead) => setSelectedLead(lead), []);
  const closeModal   = useCallback(() => { setSelectedLead(undefined); setDefaultStageId(""); }, []);

  return (
    <div className="flex flex-col h-full min-h-screen bg-bio-bg dark:bg-[#080f1e] text-slate-900 dark:text-slate-200">
      <div className="bio-page-head">
        <div className="bio-page-title-row">
          <h2 className="bio-page-title">PROSPECCIÓN</h2>
          <div className="bio-page-subtitle">{totalActive} ACTIVOS</div>
        </div>
        <div className="bio-page-actions">
          <div className="search-wrap">
            <Search size={18} />
            <input
              className="search-input"
              placeholder="Buscar por nombre, empresa..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className={`btn btn-sm ${viewMode === "kanban" ? "btn-dark" : "btn-outline"}`} onClick={() => setViewMode("kanban")}>
            <LayoutGrid size={13} className="inline mr-1 align-middle" />Kanban
          </button>
          <button className={`btn btn-sm ${viewMode === "table" ? "btn-dark" : "btn-outline"}`} onClick={() => setViewMode("table")}>
            <List size={13} className="inline mr-1 align-middle" />Tabla
          </button>
          <button className="btn btn-sm btn-outline" onClick={() => setCargaRapida(true)}>
            <Zap size={13} className="inline mr-1 align-middle" />Carga rápida
          </button>
          <button className="btn btn-sm btn-amber" onClick={() => openNewLead(sortedStages[0]?.id ?? "CRM")}>
            + Nuevo lead
          </button>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <div className="flex-1 overflow-hidden px-5 py-4 flex gap-3 items-start h-full">
          {sortedStages.map((stage, idx) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={leadsPerStage[stage.id] ?? []}
              onCardClick={openEditLead}
              onAddLead={openNewLead}
              onMoveLead={moveTo}
              prevStage={sortedStages[idx - 1] ? { id: sortedStages[idx - 1].id, label: sortedStages[idx - 1].label } : null}
              nextStage={sortedStages[idx + 1] ? { id: sortedStages[idx + 1].id, label: sortedStages[idx + 1].label } : null}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-5 py-4">
          <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/[0.05]">
                {[["Nombre","17%"],["Empresa","14%"],["Observaciones","15%"],["Teléfono","9%"],["Seguimiento","9%"],["Dirección","14%"],["Responsable","10%"],["Medio","12%"]].map(([h, w]) => (
                  <th key={h} style={{ width: w, paddingLeft: 12 }} className="text-left py-2 pr-3 text-[13px] font-black uppercase tracking-[0.06em] text-slate-400 dark:text-slate-600 whitespace-nowrap overflow-hidden">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...filteredRows]
                .sort(sortByFollowUpDate)
                .map((lead) => {
                  const fc = lead.proximoSeguimientoFecha
                    ? (() => {
                        const [y, m, d] = String(lead.proximoSeguimientoFecha).slice(0, 10).split("-");
                        return `${d}/${m}/${y}`;
                      })()
                    : "—";
                  const respC: Record<string, string> = { CIRO: "#6366f1", LOREN: "#ec4899", FEDE: "#f97316", MATE: "#22c55e", TINCHO: "#ef4444", ARI: "#a855f7", LU: "#14b8a6" };
                  const medioC: Record<string, string> = { WHATSAPP: "#22c55e", LLAMADA: "#f97316", INSTAGRAM: "#ef4444", MAIL: "#3b82f6", PRESENCIAL: "#eab308" };
                  const rc = lead.responsable1 ? (respC[lead.responsable1.toUpperCase()] ?? "#94a3b8") : null;
                  const mc = lead.medio ? (medioC[lead.medio.trim().toUpperCase()] ?? "#94a3b8") : null;

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => openEditLead(lead)}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setTableCtx({ x: e.clientX, y: e.clientY, lead }); }}
                      className="cursor-pointer border-b border-slate-100 dark:border-white/[0.03] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-1 pr-3 text-[14px] font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap overflow-hidden" style={{ paddingLeft: 12 }}>{lead.nombre}</td>
                      <td className="py-1 pr-3 text-[14px] text-slate-500 dark:text-slate-400 whitespace-nowrap overflow-hidden" style={{ paddingLeft: 12 }}>{lead.empresa}</td>
                      <td
                        className="py-1 pr-3 text-[14px] text-slate-500 dark:text-slate-400 whitespace-nowrap overflow-hidden"
                        style={{ paddingLeft: 12 }}
                        onClick={(e) => { e.stopPropagation(); setObsText(lead.observaciones || ""); setObsModal({ id: lead.id, nombre: lead.nombre || lead.empresa || "Lead", obs: lead.observaciones || "" }); }}
                      >
                        {lead.observaciones
                          ? <span className={lead.observaciones.length > 15 ? "cursor-pointer hover:text-slate-700 dark:hover:text-slate-300" : ""}>
                              {lead.observaciones.slice(0, 15)}{lead.observaciones.length > 15 ? "…" : ""}
                            </span>
                          : "—"}
                      </td>
                      <td className="py-1 pr-3 text-[14px] text-slate-500 dark:text-slate-400 whitespace-nowrap overflow-hidden" style={{ paddingLeft: 12 }}>{lead.telefono || "—"}</td>
                      <td className="py-1 pr-3 text-[14px] text-slate-500 dark:text-slate-400 whitespace-nowrap" style={{ paddingLeft: 12 }}>{fc}</td>
                      <td className="py-1 pr-3 text-[14px] text-slate-500 dark:text-slate-400 whitespace-nowrap overflow-hidden" style={{ paddingLeft: 12 }}>{lead.direccion || "—"}</td>
                      <td className="py-1 pr-3" style={{ paddingLeft: 12 }}>
                        {lead.responsable1 && rc && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[13px] font-black whitespace-nowrap" style={{ background: `${rc}20`, color: rc }}>{lead.responsable1}</span>
                        )}
                      </td>
                      <td className="py-1 pr-3" style={{ paddingLeft: 12 }}>
                        {lead.medio && mc && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[13px] font-bold whitespace-nowrap" style={{ background: `${mc}18`, color: mc }}>{lead.medio}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {selectedLead !== undefined && (
        <LeadModal lead={selectedLead} defaultStageId={defaultStageId} onClose={closeModal} />
      )}

      {cargaRapida && <CargaRapidaModal onClose={() => setCargaRapida(false)} />}

      {followUpPrompt && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setFollowUpPrompt(null)}>
          <div className="bg-white dark:bg-[#0b1628] rounded-[18px] border border-slate-200 dark:border-white/[0.07] p-8 w-[480px] shadow-[0_24px_60px_rgba(0,0,0,0.25)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: stages.find(s => s.id === followUpPrompt.targetStage)?.color ?? "#3b82f6" }} />
              <span className="text-[12px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.08em]">
                {stages.find(s => s.id === followUpPrompt.targetStage)?.label}
              </span>
            </div>
            <h3 className="text-[22px] font-black text-slate-900 dark:text-white mb-1">¿Cuándo hacés el seguimiento?</h3>
            <p className="text-[13px] text-slate-400 dark:text-slate-500 mb-5">Podés dejarlo vacío si todavía no tenés fecha.</p>
            <div className="mb-6">
              <input
                type="date" value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
                style={!followUpDate ? { color: "transparent" } : undefined}
                className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-md py-[7px] px-2.5 text-sm text-slate-900 dark:text-slate-200 outline-none focus:border-amber cursor-pointer"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn btn-sm btn-outline" onClick={() => setFollowUpPrompt(null)}>Cancelar</button>
              <button className="btn btn-sm btn-light"   onClick={confirmFollowUp}>Sin fecha</button>
              <button className="btn btn-sm btn-amber"   onClick={confirmFollowUp}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {obsModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center" style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setObsModal(null)}>
          <div
            className="w-full max-w-[560px] bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.07] rounded-[18px] flex flex-col shadow-[0_24px_60px_rgba(15,23,42,0.15)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.65)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="pt-5 px-[22px] pb-4 border-b border-slate-200 dark:border-white/[0.05] flex items-start gap-3 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <div className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em] mb-0.5">Observaciones</div>
                <div className="text-[19px] font-black text-slate-900 dark:text-slate-100 truncate">{obsModal.nombre}</div>
              </div>
              <button className="w-[30px] h-[30px] bg-slate-100 dark:bg-white/[0.04] border-none text-slate-400 cursor-pointer flex items-center justify-center hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors flex-shrink-0" onClick={() => setObsModal(null)}>✕</button>
            </div>
            {/* Body */}
            <div className="px-[22px] py-4">
              <textarea
                autoFocus
                value={obsText}
                onChange={e => setObsText(e.target.value)}
                rows={8}
                className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-md py-[7px] px-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-amber dark:focus:border-amber/[0.3] resize-none leading-relaxed"
              />
            </div>
            {/* Footer */}
            <div className="px-[22px] py-3 border-t border-slate-200 dark:border-white/[0.05] flex items-center gap-2">
              <button
                className="px-[18px] py-2 bg-amber text-bio-dark border-none font-black text-xs cursor-pointer hover:opacity-90 transition-opacity rounded-lg"
                onClick={() => { useLeadsStore.getState().updateLead(obsModal.id, { observaciones: obsText }); setObsModal(null); }}
              >Guardar</button>
              <button className="px-[13px] py-2 bg-transparent text-slate-500 dark:text-[#334155] border border-slate-200 dark:border-white/[0.06] text-xs cursor-pointer rounded-lg" onClick={() => setObsModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {tableCtx && (
        <div
          className="fixed z-[500] bg-white dark:bg-[#0d1f3c] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] py-1 min-w-[160px] overflow-hidden"
          style={{ top: tableCtx.y, left: tableCtx.x }}
          onClick={e => e.stopPropagation()}
        >
          {tableCtx.lead.telefono && (
            <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] border-none bg-transparent cursor-pointer"
              onClick={() => { window.open(`tel:${tableCtx.lead.telefono}`); setTableCtx(null); }}>
              <Phone size={13} /> Llamar
            </button>
          )}
          {tableCtx.lead.telefono && (
            <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/[0.08] border-none bg-transparent cursor-pointer"
              onClick={() => { window.open(`https://wa.me/${tableCtx.lead.telefono?.replace(/\D/g, "")}`); setTableCtx(null); }}>
              <MessageCircle size={13} /> WhatsApp
            </button>
          )}
          {tableCtx.lead.telefono && <div className="mx-3 my-1 h-px bg-slate-100 dark:bg-white/[0.06]" />}
          <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.1] border-none bg-transparent cursor-pointer"
            onClick={() => { useLeadsStore.getState().deleteLead(tableCtx.lead.id); setTableCtx(null); }}>
            <Trash2 size={13} /> Eliminar lead
          </button>
        </div>
      )}

      {meetingPrompt && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setMeetingPrompt(null)}>
          <div className="bg-white dark:bg-[#0b1628] rounded-[18px] border border-slate-200 dark:border-white/[0.07] p-8 w-[480px] shadow-[0_24px_60px_rgba(0,0,0,0.25)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: stages.find(s => s.id === meetingPrompt.targetStage)?.color ?? "#f97316" }} />
              <span className="text-[12px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.08em]">
                {stages.find(s => s.id === meetingPrompt.targetStage)?.label}
              </span>
            </div>
            <h3 className="text-[22px] font-black text-slate-900 dark:text-white mb-1">
              {meetingPrompt.targetStage === "REUNION_2" ? "¿Cuándo es la reunión 2?" : "¿Cuándo es la reunión?"}
            </h3>
            <p className="text-[13px] text-slate-400 dark:text-slate-500 mb-5">Podés dejarlo vacío si todavía no tenés fecha.</p>
            <div className="mb-6">
              <input
                type="datetime-local" value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
                style={!meetingDate ? { color: "transparent" } : undefined}
                className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-md py-[7px] px-2.5 text-sm text-slate-900 dark:text-slate-200 outline-none focus:border-amber cursor-pointer"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn btn-sm btn-outline" onClick={() => setMeetingPrompt(null)}>Cancelar</button>
              <button className="btn btn-sm btn-light"   onClick={confirmMeeting}>Sin fecha</button>
              <button className="btn btn-sm btn-amber"   onClick={confirmMeeting}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
