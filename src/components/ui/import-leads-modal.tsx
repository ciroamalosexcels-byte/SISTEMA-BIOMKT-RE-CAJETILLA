"use client";

import { useState, useMemo } from "react";
import { useLeadsStore } from "@/store/leads";
import { storage } from "@/lib/storage";
import { todayBA, normalizeISODate } from "@/lib/dates";
import type { Lead, TabKey } from "@/types";

/* ── Mapeo nombre de columna → campo Lead ─────────────────────────── */
const COL_MAP: Record<string, keyof Lead> = {
  // Identificación
  nombre: "nombre", name: "nombre", "nombre completo": "nombre",
  nombre2: "nombre2", "segundo contacto": "nombre2", "otro contacto": "nombre2",
  empresa: "empresa", company: "empresa", negocio: "empresa", cliente: "empresa",

  // Teléfonos
  telefono: "telefono", teléfono: "telefono", phone: "telefono",
  cel: "telefono", celular: "telefono", whatsapp: "telefono", tel: "telefono",
  telefono2: "telefono2", "telefono 2": "telefono2", "teléfono 2": "telefono2",

  // Contacto digital
  email: "email", correo: "email", mail: "email",
  instagram: "instagram", ig: "instagram",

  // Ubicación
  direccion: "direccion", dirección: "direccion", address: "direccion",

  // Negocio
  rubro: "rubro", industry: "rubro", categoria: "rubro", categoría: "rubro",
  servicio: "servicio", service: "servicio",
  observaciones: "observaciones", notas: "observaciones",
  notes: "observaciones", comentarios: "observaciones",
  objetivos: "objetivos", objetivo: "objetivos",

  // Responsables
  responsable: "responsable1", encargado: "responsable1",
  vendedor: "responsable1", responsable1: "responsable1",
  responsable2: "responsable2",

  // Etapa — clave para el tab
  etapa: "tab", tab: "tab", stage: "tab", estado_crm: "tab",

  // Fecha de primer contacto
  fechacontacto: "fechaContacto", "fecha contacto": "fechaContacto",
  "fecha de contacto": "fechaContacto", "primer contacto": "fechaContacto",
  createdat: "fechaContacto", "fecha creacion": "fechaContacto",

  // Estado activo/inactivo
  activo: "activo", active: "activo", estado: "activo",

  // Datos de cliente
  mesentrada: "mesEntrada", "mes entrada": "mesEntrada", "mes de entrada": "mesEntrada",
  clave: "clave", password: "clave", contraseña: "clave",
  cumpleanos: "cumpleanos", cumpleaños: "cumpleanos", birthday: "cumpleanos",
  "plan audiovisual": "planAudiovisual", planaudiovisual: "planAudiovisual",
  medio: "medio", source: "source", fuente: "source",
  empresabio: "empresaBio", "empresa bio": "empresaBio",
};

function normalizeHeader(h: string): keyof Lead | null {
  return COL_MAP[h.toLowerCase().trim().replace(/[áàä]/g,"a").replace(/[éèë]/g,"e").replace(/[íìï]/g,"i").replace(/[óòö]/g,"o").replace(/[úùü]/g,"u")] ?? COL_MAP[h.toLowerCase().trim()] ?? null;
}

function parseTSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 1) return { headers: [], rows: [] };
  const firstLine = lines[0];
  const sep = firstLine.includes("\t") ? "\t" : ",";
  const headers = firstLine.split(sep).map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1)
    .filter(l => l.trim())
    .map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, "")));
  return { headers, rows };
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ── Conversores de tipos especiales ──────────────────────────────── */
function mapTab(val: string): TabKey {
  const e = val.trim().toUpperCase().replace(/\s+/g, "_");
  const valid: TabKey[] = ["CRM", "REUNION_1", "REUNION_2", "SEGUIMIENTO", "BASE", "CLIENTES"];
  return (valid as string[]).includes(e) ? (e as TabKey) : "CRM";
}

function parseContactDate(val: string): string {
  if (!val) return todayBA();
  return normalizeISODate(val) || todayBA();
}

function parseActivo(val: string): boolean {
  const v = val.trim().toUpperCase();
  return !(v === "INACTIVO" || v === "NO" || v === "FALSE" || v === "0" || v === "INACTIVA");
}

/* ── Labels para la UI de mapeo ───────────────────────────────────── */
const LEAD_FIELD_LABELS: Partial<Record<keyof Lead, string>> = {
  nombre:           "Nombre",
  nombre2:          "Nombre 2 (otro contacto)",
  empresa:          "Empresa",
  telefono:         "Teléfono",
  telefono2:        "Teléfono 2",
  email:            "Email",
  instagram:        "Instagram",
  direccion:        "Dirección",
  rubro:            "Rubro",
  servicio:         "Servicio",
  observaciones:    "Observaciones",
  responsable1:     "Responsable 1",
  responsable2:     "Responsable 2",
  objetivos:        "Objetivos",
  tab:              "Etapa (CRM / CLIENTES / etc.)",
  fechaContacto:    "Fecha de primer contacto",
  activo:           "Estado (ACTIVO / INACTIVO)",
  mesEntrada:       "Mes de entrada",
  clave:            "Clave / contraseña",
  cumpleanos:       "Cumpleaños contacto principal",
  cumpleanos2:      "Cumpleaños segundo contacto",
  planAudiovisual:  "Plan audiovisual",
  medio:            "Medio de contacto",
  source:           "Fuente",
  empresaBio:       "Empresa Biomarketing",
};

const MAPPABLE_FIELDS = Object.keys(LEAD_FIELD_LABELS) as (keyof Lead)[];

/* ── Etiqueta de etapa para el preview ────────────────────────────── */
const TAB_LABELS: Record<TabKey, string> = {
  CRM: "CRM", REUNION_1: "Reunión 1", REUNION_2: "Reunión 2",
  SEGUIMIENTO: "Seguimiento", BASE: "Base de datos", CLIENTES: "Clientes",
};

interface Props { onClose: () => void; }
type Step = "paste" | "map" | "preview";

export function ImportLeadsModal({ onClose }: Props) {
  const [step, setStep]           = useState<Step>("paste");
  const [raw, setRaw]             = useState("");
  const [mapping, setMapping]     = useState<Record<number, keyof Lead>>({});
  const [importing, setImporting] = useState(false);
  const [done, setDone]           = useState(0);

  const parsed = useMemo(() => {
    if (!raw.trim()) return { headers: [], rows: [] };
    return parseTSV(raw);
  }, [raw]);

  /* Auto-detect mapping al pegar */
  function handlePaste(text: string) {
    setRaw(text);
    const { headers } = parseTSV(text);
    const autoMap: Record<number, keyof Lead> = {};
    headers.forEach((h, i) => {
      const field = normalizeHeader(h);
      if (field) autoMap[i] = field;
    });
    setMapping(autoMap);
  }

  function goToMap()     { if (!parsed.rows.length) return; setStep("map"); }
  function goToPreview() { setStep("preview"); }
  function goBack()      { setStep(step === "preview" ? "map" : "paste"); }

  /* Preview — las primeras 5 filas convertidas */
  const previewLeads = useMemo(() => {
    return parsed.rows.slice(0, 5).map(row => {
      const lead: Partial<Lead> = {};
      Object.entries(mapping).forEach(([colIdx, field]) => {
        const val = row[Number(colIdx)] ?? "";
        if (val) (lead as Record<string, unknown>)[field as string] = val;
      });
      return lead;
    });
  }, [parsed.rows, mapping]);

  /* Etapas detectadas en los datos (para mostrar en preview) */
  const tabsSummary = useMemo(() => {
    const tabColIdx = Object.entries(mapping).find(([, f]) => f === "tab")?.[0];
    if (tabColIdx === undefined) return null;
    const counts: Partial<Record<TabKey, number>> = {};
    for (const row of parsed.rows) {
      const t = mapTab(row[Number(tabColIdx)] ?? "");
      counts[t] = (counts[t] ?? 0) + 1;
    }
    return counts;
  }, [parsed.rows, mapping]);

  function doImport() {
    setImporting(true);
    const newLeads: Lead[] = [];

    for (const row of parsed.rows) {
      const lead: Lead = {
        id: makeId(),
        tab: "CRM",
        nombre: "", empresa: "", observaciones: "",
        telefono: "", responsable1: "", responsable2: "",
        direccion: "", empresaBio: "BIOMARKETING", medio: "",
        fechaContacto: todayBA(),
      };

      // Mapear todas las columnas como strings primero
      const raw2 = lead as unknown as Record<string, unknown>;
      Object.entries(mapping).forEach(([colIdx, field]) => {
        const val = row[Number(colIdx)]?.trim() ?? "";
        if (val) raw2[field as string] = val;
      });

      // Post-procesado de campos especiales
      // tab: convertir etapa texto → TabKey válido
      const rawTab = raw2["tab"] as string | undefined;
      lead.tab = rawTab ? mapTab(rawTab) : "CRM";

      // fechaContacto: parsear "DD/MM/YYYY HH:MM:SS" → ISO
      const rawDate = raw2["fechaContacto"] as string | undefined;
      lead.fechaContacto = rawDate ? parseContactDate(rawDate) : todayBA();

      // activo: convertir "INACTIVO"/"NO" → false
      const rawActivo = raw2["activo"] as string | undefined;
      if (rawActivo !== undefined) {
        lead.activo = parseActivo(rawActivo);
      }

      if (!lead.nombre && !lead.empresa) continue;
      newLeads.push(lead);
    }

    const existing = useLeadsStore.getState().rows;
    const merged = [...existing, ...newLeads];
    useLeadsStore.setState({ rows: merged, dirty: true });
    storage.setLeads(merged);

    setDone(newLeads.length);
    setImporting(false);
    setStep("paste");
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 820 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Importar prospectos</h2>
            {step !== "paste" && (
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 2 }}>
                {step === "map" ? "Paso 2 — Mapear columnas" : "Paso 3 — Preview y confirmar"}
              </div>
            )}
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        {/* ── PASO 1: Pegar datos ───────────────────────────────────── */}
        {step === "paste" && (
          <>
            {done > 0 && (
              <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 12, margin: "16px 24px 0", padding: "10px 16px", fontSize: 13, fontWeight: 700, color: "#166534" }}>
                ✓ Se importaron {done} prospectos correctamente.
              </div>
            )}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#f8fafc", border: "1px solid var(--slate-200)", borderRadius: 14, padding: "14px 16px", fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--dark)" }}>Cómo importar desde Google Sheets:</strong><br />
                1. Abrí tu Sheet con los prospectos<br />
                2. Seleccioná todas las celdas (incluyendo la fila de encabezado)<br />
                3. Copiá con <kbd style={{ background: "#e2e8f0", borderRadius: 4, padding: "1px 5px", fontSize: 12 }}>Ctrl+C</kbd><br />
                4. Pegá abajo con <kbd style={{ background: "#e2e8f0", borderRadius: 4, padding: "1px 5px", fontSize: 12 }}>Ctrl+V</kbd><br />
                <span style={{ color: "#16a34a", fontWeight: 700 }}>
                  La etapa de cada lead se toma automáticamente de la columna <em>etapa</em> o <em>tab</em> de tus datos.
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#64748b", marginBottom: 6 }}>
                  Pegá los datos aquí
                </label>
                <textarea
                  style={{ width: "100%", minHeight: 160, fontFamily: "monospace", fontSize: 12, border: "1px solid var(--slate-200)", borderRadius: 12, padding: "12px", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                  placeholder={"nombre\tempresa\ttelefono\tetapa\nJuan Pérez\tCafé del Centro\t11-1234-5678\tCLIENTES"}
                  value={raw}
                  onChange={e => handlePaste(e.target.value)}
                  onPaste={e => {
                    const txt = e.clipboardData.getData("text");
                    e.preventDefault();
                    handlePaste(txt);
                  }}
                />
                {parsed.rows.length > 0 && (
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 6 }}>
                    ✓ {parsed.rows.length} filas detectadas · {parsed.headers.length} columnas
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
              <button className="btn btn-amber" disabled={!parsed.rows.length} onClick={goToMap}>
                Siguiente → Mapear columnas
              </button>
            </div>
          </>
        )}

        {/* ── PASO 2: Mapear columnas ───────────────────────────────── */}
        {step === "map" && (
          <>
            <div style={{ padding: "20px 24px", overflowY: "auto", maxHeight: "60vh" }}>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#475569", fontWeight: 600 }}>
                Revisá el mapeo de columnas. El sistema detectó automáticamente los campos que pudo.
                Asegurate de que la columna <strong>Etapa</strong> y <strong>Fecha de primer contacto</strong> estén mapeadas para preservar esos datos.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {parsed.headers.map((header, i) => (
                  <div key={i} style={{ border: "1px solid var(--slate-200)", borderRadius: 12, padding: "10px 14px", background: mapping[i] ? "#f0fdf4" : "#fff", borderColor: mapping[i] ? "#86efac" : "var(--slate-200)" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
                      Columna: <span style={{ color: "var(--dark)" }}>{header}</span>
                    </div>
                    <select
                      className="field"
                      style={{ minHeight: 36, fontSize: 12 }}
                      value={mapping[i] ?? ""}
                      onChange={e => {
                        const val = e.target.value as keyof Lead | "";
                        setMapping(m => {
                          const next = { ...m };
                          if (val) next[i] = val; else delete next[i];
                          return next;
                        });
                      }}
                    >
                      <option value="">— Ignorar esta columna —</option>
                      {MAPPABLE_FIELDS.map(f => (
                        <option key={f} value={f}>{LEAD_FIELD_LABELS[f]}</option>
                      ))}
                    </select>
                    {parsed.rows[0]?.[i] && (
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 5, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Ej: {parsed.rows[0][i]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
                {Object.keys(mapping).length} de {parsed.headers.length} columnas mapeadas · {parsed.rows.length} prospectos a importar
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={goBack}>← Atrás</button>
              <button className="btn btn-amber" onClick={goToPreview}>
                Siguiente → Ver preview
              </button>
            </div>
          </>
        )}

        {/* ── PASO 3: Preview + confirmar ───────────────────────────── */}
        {step === "preview" && (
          <>
            <div style={{ padding: "16px 24px", overflowY: "auto", maxHeight: "60vh" }}>

              {/* Resumen de etapas detectadas */}
              {tabsSummary ? (
                <div style={{ marginBottom: 14, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "#166534", fontWeight: 700 }}>
                  Etapas detectadas en los datos:{" "}
                  {Object.entries(tabsSummary).map(([tab, count]) => (
                    <span key={tab} style={{ marginRight: 12 }}>
                      {TAB_LABELS[tab as TabKey] ?? tab}: <strong>{count}</strong>
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ marginBottom: 14, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "#92400e", fontWeight: 600 }}>
                  ⚠ No mapeaste la columna <strong>Etapa</strong>. Todos los prospectos se importarán como <strong>CRM</strong>.
                </div>
              )}

              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#475569", fontWeight: 600 }}>
                Primeras 5 filas de {parsed.rows.length} a importar:
              </p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 480, fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#020817" }}>
                      {Object.entries(mapping).map(([colIdx, field]) => (
                        <th key={colIdx} style={{ padding: "8px 10px", color: "#fff", fontWeight: 900, textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" }}>
                          {LEAD_FIELD_LABELS[field] ?? field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewLeads.map((lead, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--slate-200)", background: i % 2 ? "#f8fafc" : "#fff" }}>
                        {Object.entries(mapping).map(([colIdx, field]) => (
                          <td key={colIdx} style={{ padding: "7px 10px", color: "#475569", whiteSpace: "nowrap" }}>
                            {(lead as Record<string, unknown>)[field as string] as string ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 5 && (
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, marginTop: 8 }}>
                  … y {parsed.rows.length - 5} filas más.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={goBack}>← Atrás</button>
              <button
                className="btn btn-amber"
                disabled={importing}
                onClick={doImport}
              >
                {importing ? "Importando…" : `✓ Importar ${parsed.rows.length} prospectos`}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
