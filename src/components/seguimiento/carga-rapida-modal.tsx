"use client";

import { useState } from "react";
import { useLeadsStore } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { usePipelineStore } from "@/store/pipeline";

/* ── Types ───────────────────────────────────────────────────────────── */

export interface ParsedLead {
  _key: string;
  nombre: string;
  empresa: string;
  fechaContacto: string;
  direccion: string;
  observaciones: string;
  telefono: string;
  accepted: boolean;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function capFirst(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/* ── Parser: formato de bloque manual ───────────────────────────────── */

const DATE_RE = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/;
const TIME_RE = /\b(\d{1,2}):(\d{2})\b/;

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

function isDateLine(line: string)    { return DATE_RE.test(line) || TIME_RE.test(line); }
function isAddressLine(line: string) {
  return /\b(av\.|avenida|calle|pasaje|ruta|bv\.|boulevard|esquina|esq\.|piso|depto|local|\d{3,})/i.test(line);
}

function parseBlock(raw: string): ParsedLead {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  let fechaContacto = "", nombre = "", empresa = "", direccion = "";
  const obs: string[] = [];
  for (const line of lines) {
    if (isDateLine(line)) { const dt = parseDateTime(line); if (dt && !fechaContacto) { fechaContacto = dt; continue; } }
    if (isAddressLine(line) && nombre) { direccion = line; continue; }
    if (!nombre)  { nombre  = line; continue; }
    if (!empresa) { empresa = line; continue; }
    obs.push(line);
  }
  return {
    _key: Math.random().toString(36).slice(2),
    nombre, empresa,
    fechaContacto: fechaContacto || "",
    direccion, observaciones: obs.join(" · "), telefono: "", accepted: true,
  };
}

/* ── Parser: formato WhatsApp ────────────────────────────────────────── */

// [HH:MM, D/M/YYYY] Sender: content  (with optional seconds)
const WA_LINE_RE = /^\[(\d{1,2}):(\d{2})(?::\d{2})?,\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\]\s+[^:]+:\s*(.*)/;

// Phone: digit, 4-13 mixed chars (digits/spaces/dashes/dots), digit
const PHONE_RE = /\b(\d[\d\s\-\.]{4,13}\d)\b/g;

// Signals where the free-form notes begin (first match wins).
// Usamos (?=[\s,]|$) en lugar de \b final porque \b no funciona con letras acentuadas (é, í, ó…)
const OBS_RE = /\b(me dice|le coment[eé]|habl[eé]|me dij[oa]|le dej[eé]|qued[eé]|quedamos|va a encontrar|van a|es un empleado|trabaj[ao]|as[ií] que|pero por|le ofrecí|el due[nñ]o|el socio|el encargado|nos dij|qued[eé] en|la chica|cuando rec[ií]en)(?=[\s,]|$)/i;

// Lines that continue a previous contact (not a new name)
const CONTINUATION_RE = /^(de que|as[ií] que|pero |y que|que |o sea|sin embargo|por lo|en realidad|lo que|tambi[eé]n|despu[eé]s|ya que|porque|adem[aá]s|es decir|si |no |va |me |le |lo |la |las |los |un |una )/i;

function extractPhones(text: string): { phones: string[]; clean: string } {
  const phones: string[] = [];
  PHONE_RE.lastIndex = 0;
  const clean = text.replace(PHONE_RE, (m) => {
    phones.push(m.replace(/[\s\-\.]/g, ""));
    return " ";
  }).replace(/\s+/g, " ").trim();
  return { phones, clean };
}

// Separa empresa de dirección detectando intersecciones de calles argentinas:
// "Empresa NombreX y NombreY"  → empresa="Empresa", dir="NombreX y NombreY"
// "Empresa NombreX de NombreY" → empresa="Empresa", dir="NombreX de NombreY" (solo si ambos lados van en mayúscula)
// Retrocede desde la conjunción a través de palabras capitalizadas para encontrar dónde empieza la dirección.
function splitEmpresaAddress(words: string[]): { empresa: string; direccion: string } {
  let splitIdx = -1;

  for (let i = 1; i < words.length - 1; i++) {
    const w    = words[i];
    const prev = words[i - 1];
    const next = words[i + 1] ?? "";
    const prevCap = /^[A-ZÁÉÍÓÚÑÜ]/.test(prev);
    const nextCap = /^[A-ZÁÉÍÓÚÑÜ]/.test(next);

    const isY  = /^(y|e)$/i.test(w);
    const isDe = /^de$/i.test(w) && prevCap && nextCap; // "La Rioja de Garay" → sí; "ropa de moda" → no

    if (isY || isDe) {
      let addrStart = i - 1;
      if (prevCap) {
        while (addrStart > 0 && /^[A-ZÁÉÍÓÚÑÜ]/.test(words[addrStart - 1])) {
          addrStart--;
        }
      }
      splitIdx = addrStart;
      break;
    }
  }

  if (splitIdx <= 0) return { empresa: words.join(" "), direccion: "" };

  return {
    empresa:   words.slice(0, splitIdx).join(" "),
    direccion: words.slice(splitIdx).join(" "),
  };
}

function parseWAContent(content: string, fechaContacto: string): ParsedLead | null {
  const { phones, clean } = extractPhones(content);

  const obsMatch = OBS_RE.exec(clean);
  const mainPart = (obsMatch ? clean.slice(0, obsMatch.index) : clean).trim();
  const obsPart  = obsMatch ? clean.slice(obsMatch.index).trim() : "";

  const words = mainPart
    .replace(/[()]/g, "")
    .split(/\s+/)
    .map(w => w.replace(/[:!?,;.]+$/, ""))
    .filter(w => /[a-záéíóúñüA-ZÁÉÍÓÚÑÜ0-9]/.test(w));

  if (words.length === 0) return null;

  let nombre = words[0];
  let empresaStart = 1;

  // "Fabiana Fabiana Martínez" → dedup primera palabra repetida
  if (words[1]?.toLowerCase() === words[0].toLowerCase()) {
    nombre = words[0] + (words[2] ? " " + capFirst(words[2]) : "");
    empresaStart = words[2] ? 3 : 2;
  }
  // "(Santiago) y Juan pablo" → "Santiago y Juan"
  else if (/^(y|e)$/i.test(words[1] ?? "") && words[2]) {
    nombre = `${words[0]} y ${capFirst(words[2])}`;
    empresaStart = 3;
  }

  const remaining = words.slice(empresaStart);
  const { empresa: empresaRaw, direccion } = splitEmpresaAddress(remaining);
  // Los nombres de negocios suelen ser 1-3 palabras; el exceso va a observaciones
  const empresaWords = empresaRaw.trim().split(/\s+/);
  const empresa = empresaWords.slice(0, 3).join(" ");
  const empresaExtra = empresaWords.slice(3).join(" ");
  const observaciones = [empresaExtra, obsPart, ...phones.slice(1)].filter(Boolean).join(" · ");

  return {
    _key: Math.random().toString(36).slice(2),
    nombre: nombre.trim(),
    empresa: empresa.trim(),
    fechaContacto,
    direccion,
    observaciones,
    telefono: phones[0] ?? "",
    accepted: true,
  };
}

function isWhatsAppFormat(text: string) {
  return WA_LINE_RE.test(text.trim().split("\n")[0]);
}

function parseWhatsApp(text: string): ParsedLead[] {
  const results: ParsedLead[] = [];

  for (const line of text.split("\n")) {
    const m = line.match(WA_LINE_RE);

    if (!m) {
      if (results.length > 0 && line.trim()) {
        const last = results[results.length - 1];
        last.observaciones = [last.observaciones, line.trim()].filter(Boolean).join(" · ");
      }
      continue;
    }

    const [, hh, mm, day, mon, year, content] = m;
    const fechaContacto = `${year}-${mon.padStart(2, "0")}-${day.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm}`;
    if (!content.trim()) continue;

    const isContinuation = results.length > 0 && (
      CONTINUATION_RE.test(content.trim()) ||
      /^[a-záéíóúñü]/.test(content.trim()[0])
    );

    if (isContinuation) {
      const last = results[results.length - 1];
      last.observaciones = [last.observaciones, content.trim()].filter(Boolean).join(" · ");
      continue;
    }

    const lead = parseWAContent(content, fechaContacto);
    if (lead?.nombre) results.push(lead);
  }

  return results;
}

/* ── Unified entry point ─────────────────────────────────────────────── */

function parseText(text: string): ParsedLead[] {
  if (isWhatsAppFormat(text)) return parseWhatsApp(text);
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  return blocks.map(parseBlock).filter(p => p.nombre);
}

/* ── Component ───────────────────────────────────────────────────────── */

interface Props { onClose: () => void; }
type Step = "paste" | "preview";

const inputCls = "bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-md py-[7px] px-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-amber dark:focus:border-amber/[0.3] w-full";

export function CargaRapidaModal({ onClose }: Props) {
  const { addLead } = useLeadsStore();
  const stages      = usePipelineStore(s => s.stages);
  const crmStage    = stages.find(s => s.id === "CRM") ?? stages[0];
  const memberNames = useTeamStore(s => s.members.filter(m => m.activo !== false).map(m => m.nombre));

  const [step, setStep]             = useState<Step>("paste");
  const [raw, setRaw]               = useState("");
  const [leads, setLeads]           = useState<ParsedLead[]>([]);
  const [editIdx, setEditIdx]       = useState<number | null>(null);
  const [responsable, setResp]      = useState("");
  const [defaultDate, setDefDate]   = useState("");

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
    leads.filter(l => l.accepted).forEach(p => {
      addLead({
        nombre: p.nombre, nombre2: "", empresa: p.empresa,
        observaciones: p.observaciones,
        telefono: p.telefono, telefono2: "",
        responsable1: responsable,
        responsable2: "",
        direccion: p.direccion,
        empresaBio: "BIOMARKETING", medio: "PRESENCIAL",
        email: "", instagram: "", rubro: "", servicio: "",
        objetivos: "", meetingDatetime: "",
        proximoSeguimientoFecha: "", source: "",
        planAudiovisual: "", clave: "",
        activo: true, mesEntrada: "",
        cumpleanos: "", cumpleanos2: "", planId: "",
        proximoSeguimientoDias: 0,
      }, crmStage?.id ?? "CRM", p.fechaContacto || defaultDate || undefined);
    });
    onClose();
  }

  /* ── PASO 1: pegar ──────────────────────────────────────────────────── */
  if (step === "paste") {
    const detected = raw ? parseText(raw) : [];
    const isWA = raw ? isWhatsAppFormat(raw) : false;

    return (
      <div className="modal-backdrop open" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h2 className="modal-title">Carga Rápida</h2>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                Pegá mensajes de WhatsApp o bloques separados por línea vacía
              </div>
            </div>
            <button className="icon-btn" onClick={onClose}>✕</button>
          </div>

          <div style={{ padding: "14px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
            <strong>Formatos soportados:</strong><br />
            <code style={{ background: "#e2e8f0", borderRadius: 4, padding: "2px 6px", fontSize: 11 }}>
              [13:44, 3/6/2026] Ciro: Juan Pérez Café del Sur le dejé tarjeta
            </code>{" "}← WhatsApp<br />
            <code style={{ background: "#e2e8f0", borderRadius: 4, padding: "2px 6px", fontSize: 11 }}>
              15/06 14:30{"\n"}Juan Pérez{"\n"}Café del Centro
            </code>{" "}← bloque manual (separar por línea vacía)
          </div>

          <div style={{ padding: "20px 24px" }}>
            <textarea
              style={{
                width: "100%", minHeight: 220, fontFamily: "monospace", fontSize: 13,
                border: "1px solid #e2e8f0", borderRadius: 12, padding: 14,
                resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6,
              }}
              placeholder={"[13:44, 3/6/2026] Ciro: Juan Pérez Café del Sur le dejé tarjeta\n[13:49, 3/6/2026] Ciro: María González 223-456-7890 Restaurante El Molino me dijo..."}
              value={raw}
              onChange={e => setRaw(e.target.value)}
              autoFocus
            />
            {raw && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, fontWeight: 700, display: "flex", gap: 10, alignItems: "center" }}>
                <span>{detected.length} contacto(s) detectados</span>
                {isWA && <span style={{ color: "#10b981", fontWeight: 600 }}>● formato WhatsApp</span>}
              </div>
            )}

            {/* Responsable + fecha por defecto */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14, padding: "12px 14px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>¿Quién cargó estos contactos?</label>
                <select
                  className={inputCls}
                  value={responsable}
                  onChange={e => setResp(e.target.value)}
                >
                  <option value="">— sin especificar —</option>
                  {memberNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fecha y hora por defecto</label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={defaultDate}
                  onChange={e => setDefDate(e.target.value)}
                />
                <span style={{ fontSize: 10, color: "#94a3b8" }}>Se aplica solo a contactos sin fecha detectada</span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button
              className="btn btn-amber"
              disabled={!raw.trim() || detected.length === 0}
              onClick={procesar}
            >
              Procesar →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── PASO 2: preview ────────────────────────────────────────────────── */
  const accepted = leads.filter(l => l.accepted).length;

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 780 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Confirmar — {leads.length} contacto{leads.length !== 1 ? "s" : ""}</h2>
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
                borderRadius: 12, padding: "12px 14px",
                background: lead.accepted ? "#fffbeb" : "#f8fafc",
                display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "start",
              }}
            >
              <input
                type="checkbox" checked={lead.accepted} onChange={() => toggle(lead._key)}
                style={{ marginTop: 4, accentColor: "#f6bf26", width: 16, height: 16, cursor: "pointer" }}
              />

              {editIdx === idx ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Nombre</label>
                    <input className={inputCls} value={lead.nombre} onChange={e => update(lead._key, { nombre: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Empresa</label>
                    <input className={inputCls} value={lead.empresa} onChange={e => update(lead._key, { empresa: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Teléfono</label>
                    <input className={inputCls} value={lead.telefono} onChange={e => update(lead._key, { telefono: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Fecha/hora contacto</label>
                    <input type="datetime-local" className={inputCls} value={lead.fechaContacto} onChange={e => update(lead._key, { fechaContacto: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Dirección</label>
                    <input className={inputCls} value={lead.direccion} onChange={e => update(lead._key, { direccion: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Observaciones</label>
                    <input className={inputCls} value={lead.observaciones} onChange={e => update(lead._key, { observaciones: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                    <button className="btn btn-amber btn-sm" onClick={() => setEditIdx(null)}>Listo</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#07152f" }}>
                    {lead.nombre || <span style={{ color: "#94a3b8" }}>Sin nombre</span>}
                  </div>
                  {lead.empresa && <div style={{ fontSize: 12, color: "#64748b" }}>{lead.empresa}</div>}
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>📅 {lead.fechaContacto.replace("T", " ").slice(0, 16)}</span>
                    {lead.telefono && <span>📞 {lead.telefono}</span>}
                    {lead.direccion && <span>📍 {lead.direccion}</span>}
                    {lead.observaciones && (
                      <span>💬 {lead.observaciones.slice(0, 60)}{lead.observaciones.length > 60 ? "…" : ""}</span>
                    )}
                  </div>
                </div>
              )}

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
            <button className="btn btn-amber" disabled={accepted === 0} onClick={guardarTodas}>
              ✓ Aceptar {accepted > 0 ? `(${accepted})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
