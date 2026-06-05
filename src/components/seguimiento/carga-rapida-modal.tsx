"use client";

import { useState } from "react";
import { useLeadsStore } from "@/store/leads";
import { usePipelineStore } from "@/store/pipeline";
import type { Lead } from "@/types";

/* ── Parser ──────────────────────────────────────────────────────── */

// Detecta fecha (DD/MM, DD/MM/YY, DD/MM/YYYY) y hora (HH:MM)
const DATE_RE  = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/;
const TIME_RE  = /\b(\d{1,2}):(\d{2})\b/;

function parseDateTime(text: string): string | null {
  const dateM = text.match(DATE_RE);
  const timeM = text.match(TIME_RE);
  if (!dateM) return null;

  const day  = String(dateM[1]).padStart(2, "0");
  const mon  = String(dateM[2]).padStart(2, "0");
  const year = dateM[3]
    ? (dateM[3].length === 2 ? `20${dateM[3]}` : dateM[3])
    : new Date().getFullYear().toString();

  const hour = timeM ? String(timeM[1]).padStart(2, "0") : "12";
  const min  = timeM ? String(timeM[2]).padStart(2, "0") : "00";

  return `${year}-${mon}-${day}T${hour}:${min}`;
}

function isDateLine(line: string): boolean {
  return DATE_RE.test(line) || TIME_RE.test(line);
}

function isAddressLine(line: string): boolean {
  return /\b(av\.|avenida|calle|pasaje|ruta|bv\.|boulevard|esquina|esq\.|piso|depto|local|\d{3,})/i.test(line);
}

export interface ParsedLead {
  _key: string;
  nombre: string;
  empresa: string;
  fechaContacto: string;
  direccion: string;
  observaciones: string;
  accepted: boolean;
}

function parseBlock(raw: string): ParsedLead {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);

  let fechaContacto = "";
  let nombre = "";
  let empresa = "";
  let direccion = "";
  const obs: string[] = [];

  for (const line of lines) {
    if (isDateLine(line)) {
      const dt = parseDateTime(line);
      if (dt && !fechaContacto) { fechaContacto = dt; continue; }
    }
    if (isAddressLine(line) && nombre) { direccion = line; continue; }
    if (!nombre)       { nombre  = line; continue; }
    if (!empresa)      { empresa = line; continue; }
    obs.push(line);
  }

  return {
    _key: Math.random().toString(36).slice(2),
    nombre,
    empresa,
    fechaContacto: fechaContacto || new Date().toISOString().slice(0, 16),
    direccion,
    observaciones: obs.join(" · "),
    accepted: true,
  };
}

function parseText(text: string): ParsedLead[] {
  // Separa bloques por línea vacía
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  return blocks.map(parseBlock).filter(p => p.nombre);
}

/* ── Componente ──────────────────────────────────────────────────── */

interface Props { onClose: () => void; }

type Step = "paste" | "preview";

const inputCls = "bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-md py-[7px] px-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-amber dark:focus:border-amber/[0.3] w-full";

export function CargaRapidaModal({ onClose }: Props) {
  const { addLead }  = useLeadsStore();
  const stages       = usePipelineStore(s => s.stages);
  const crmStage     = stages.find(s => s.id === "CRM") ?? stages[0];

  const [step, setStep]   = useState<Step>("paste");
  const [raw, setRaw]     = useState("");
  const [leads, setLeads] = useState<ParsedLead[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  function procesar() {
    const parsed = parseText(raw);
    if (parsed.length === 0) return;
    setLeads(parsed);
    setStep("preview");
  }

  function toggle(key: string) {
    setLeads(ls => ls.map(l => l._key === key ? { ...l, accepted: !l.accepted } : l));
  }

  function update(key: string, patch: Partial<ParsedLead>) {
    setLeads(ls => ls.map(l => l._key === key ? { ...l, ...patch } : l));
  }

  function guardarTodas() {
    const toSave = leads.filter(l => l.accepted);
    toSave.forEach(p => {
      addLead({
        nombre:        p.nombre,
        nombre2:       "",
        empresa:       p.empresa,
        observaciones: p.observaciones,
        telefono:      "",
        telefono2:     "",
        responsable1:  "",
        responsable2:  "",
        direccion:     p.direccion,
        empresaBio:    "BIOMARKETING",
        medio:         "PRESENCIAL",
        email:         "",
        instagram:     "",
        rubro:         "",
        servicio:      "",
        objetivos:     "",
        meetingDatetime: "",
        proximoSeguimientoFecha: "",
        source:        "",
        planAudiovisual: "",
        clave:         "",
        activo:        true,
        mesEntrada:    "",
        cumpleanos:    "",
        cumpleanos2:   "",
        planId:        "",
        proximoSeguimientoDias: 0,
      }, crmStage?.id ?? "CRM");
    });
    onClose();
  }

  /* ── PASO 1: pegar texto ────────────────────────────────────────── */
  if (step === "paste") {
    return (
      <div className="modal-backdrop open" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h2 className="modal-title">Carga Rápida</h2>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                Pegá uno o varios bloques separados por línea vacía
              </div>
            </div>
            <button className="icon-btn" onClick={onClose}>✕</button>
          </div>

          <div style={{ padding: "16px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
            <strong>Formato por bloque:</strong><br />
            <code style={{ background: "#e2e8f0", borderRadius: 4, padding: "2px 6px", fontSize: 11 }}>
              15/06 14:30 · Juan Pérez · Café del Centro · Av. Corrientes 1234
            </code>
            <br />Cada bloque separado por una línea vacía. Fecha/hora, nombre, empresa, dirección (en cualquier orden).
          </div>

          <div style={{ padding: "20px 24px" }}>
            <textarea
              style={{
                width: "100%", minHeight: 220, fontFamily: "monospace", fontSize: 13,
                border: "1px solid #e2e8f0", borderRadius: 12, padding: 14,
                resize: "vertical", outline: "none", boxSizing: "border-box",
                lineHeight: 1.6,
              }}
              placeholder={"15/06 14:30\nJuan Pérez\nCafé del Centro\nAv. Corrientes 1234\n\n20/06 10:00\nMaría González\nRestaurante El Molino"}
              value={raw}
              onChange={e => setRaw(e.target.value)}
              autoFocus
            />
            {raw && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, fontWeight: 700 }}>
                {parseText(raw).length} contacto(s) detectados
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button
              className="btn btn-amber"
              disabled={!raw.trim() || parseText(raw).length === 0}
              onClick={procesar}
            >
              Procesar →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── PASO 2: preview y confirmación ─────────────────────────────── */
  const accepted = leads.filter(l => l.accepted).length;

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Confirmar carga — {leads.length} contacto{leads.length !== 1 ? "s" : ""}</h2>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {accepted} seleccionado{accepted !== 1 ? "s" : ""} · Medio: PRESENCIAL · Etapa: Prospecto
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ maxHeight: "58vh", overflowY: "auto", padding: "12px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {leads.map((lead, idx) => (
            <div
              key={lead._key}
              style={{
                border: `1.5px solid ${lead.accepted ? "#f6bf26" : "#e2e8f0"}`,
                borderRadius: 12,
                padding: "12px 14px",
                background: lead.accepted ? "#fffbeb" : "#f8fafc",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 12,
                alignItems: "start",
              }}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={lead.accepted}
                onChange={() => toggle(lead._key)}
                style={{ marginTop: 4, accentColor: "#f6bf26", width: 16, height: 16, cursor: "pointer" }}
              />

              {/* Campos editables */}
              {editIdx === idx ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Nombre</label>
                    <input className={inputCls} value={lead.nombre} onChange={e => update(lead._key, { nombre: e.target.value })} /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Empresa</label>
                    <input className={inputCls} value={lead.empresa} onChange={e => update(lead._key, { empresa: e.target.value })} /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Fecha/hora contacto</label>
                    <input type="datetime-local" className={inputCls} value={lead.fechaContacto} onChange={e => update(lead._key, { fechaContacto: e.target.value })} /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Dirección</label>
                    <input className={inputCls} value={lead.direccion} onChange={e => update(lead._key, { direccion: e.target.value })} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Observaciones</label>
                    <input className={inputCls} value={lead.observaciones} onChange={e => update(lead._key, { observaciones: e.target.value })} /></div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                    <button className="btn btn-amber btn-sm" onClick={() => setEditIdx(null)}>Listo</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#07152f" }}>{lead.nombre || <span style={{ color: "#94a3b8" }}>Sin nombre</span>}</div>
                  {lead.empresa && <div style={{ fontSize: 12, color: "#64748b" }}>{lead.empresa}</div>}
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>📅 {lead.fechaContacto.replace("T", " ").slice(0, 16)}</span>
                    {lead.direccion && <span>📍 {lead.direccion}</span>}
                    {lead.observaciones && <span>💬 {lead.observaciones.slice(0, 40)}{lead.observaciones.length > 40 ? "…" : ""}</span>}
                  </div>
                </div>
              )}

              {/* Botón editar */}
              {editIdx !== idx && (
                <button
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: 11, flexShrink: 0 }}
                  onClick={() => setEditIdx(idx)}
                >
                  Editar
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <button className="btn btn-outline" onClick={() => setStep("paste")}>← Volver</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-outline"
              onClick={() => setLeads(ls => ls.map(l => ({ ...l, accepted: true })))}
            >
              Seleccionar todas
            </button>
            <button
              className="btn btn-amber"
              disabled={accepted === 0}
              onClick={guardarTodas}
            >
              ✓ Aceptar {accepted > 0 ? `(${accepted})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
