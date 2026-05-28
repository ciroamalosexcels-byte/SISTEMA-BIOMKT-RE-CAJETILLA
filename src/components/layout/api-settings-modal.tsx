"use client";

import { useState } from "react";
import { useAppSettings } from "@/store/app-settings";
import { testSheetsConnection } from "@/lib/sheets";

/* ─── Google Apps Script code ──────────────────────────────────────────────── */

const CODIGO_GS = `// ═══════════════════════════════════════════════════════════════
//  CÓDIGO.GS — SISTEMA BIOMARKETING
//  Pegá este código en Apps Script y hacé una nueva implementación.
//  Implementar como: Aplicación web / Acceso: Cualquier persona
// ═══════════════════════════════════════════════════════════════

// ──────────────────── DEFINICIÓN DE HOJAS ───────────────────────

var SHEETS = {
  LEADS: {
    name: "LEADS",
    headers: [
      "id","nombre","empresa","observaciones","telefono","email","instagram",
      "responsable1","responsable2","responsables","direccion","fechaContacto",
      "empresaBio","medio","tab","seguimiento","proximoSeguimientoFecha",
      "mesEntrada","objetivos","rubro","estado","servicio","planAudiovisual",
      "clientOrder","ordenCliente","source","mapLat","mapLng",
      "proximoSeguimientoDias","meetingDatetime","createdAt","updatedAt"
    ]
  },
  EQUIPO: {
    name: "EQUIPO",
    headers: [
      "id","nombre","fechaNacimiento","edad","equipo","telefono","mail",
      "roles","horarios","direccion","notas","signo","signoChino",
      "status91","monthlyPoints","badges","createdAt","updatedAt"
    ]
  },
  PLANIFICACION_CONTENIDOS: {
    name: "PLANIFICACION_CONTENIDOS",
    headers: [
      "id","clientId","encargado","fecha","hora","tipo","estado",
      "objetivo","frase","copy","archivo","comentarios",
      "timerTotalMs","timerRunning","timerStartedAt","done",
      "contentOrder","planName","planSourceId","createdAt","updatedAt"
    ]
  },
  PLANES: {
    name: "PLANES",
    headers: ["key","chunkIndex","chunk","updatedAt"]
  },
  COLABORADORES: {
    name: "COLABORADORES",
    headers: ["id","nombre","edad","telefono","herramientas","observaciones","estado","createdAt","updatedAt"]
  },
  PROCEDIMIENTOS: {
    name: "PROCEDIMIENTOS",
    headers: [
      "id","title","category","createdAt","updatedAt",
      "paso 1","paso 2","paso 3","paso 4","paso 5",
      "paso 6","paso 7","paso 8","paso 9","paso 10",
      "paso 11","paso 12","paso 13","paso 14","paso 15",
      "paso 16","paso 17","paso 18","paso 19","paso 20",
      "paso 21","paso 22","paso 23","paso 24","paso 25",
      "paso 26","paso 27","paso 28","paso 29","paso 30",
      "paso 31","paso 32","paso 33"
    ]
  },
  GESTION_EVENTOS: {
    name: "GESTION_EVENTOS",
    headers: ["id","clientId","fecha","hora","tipo","motivo","done","createdAt","updatedAt"]
  },
  NOTIFICACIONES: {
    name: "NOTIFICACIONES",
    headers: ["id","date","time","message","source","createdAt","updatedAt"]
  },
  REUNIONES_EQUIPO: {
    name: "REUNIONES_EQUIPO",
    headers: ["date","content","updatedAt"]
  },
  ANCHO_COLUMNAS: {
    name: "ANCHO_COLUMNAS",
    headers: ["key","json","updatedAt"]
  },
  CONFIG: {
    name: "CONFIG",
    headers: ["key","value","updatedAt"]
  }
};

// ──────────────────── ENTRADA HTTP ──────────────────────────────

function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : null;
    if (action === "init") {
      initializeSheets_();
      return jsonOk_({ message: "Hojas inicializadas." });
    }
    return jsonOk_(readAllData_());
  } catch (err) {
    return jsonError_(err.message);
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.action === "init") {
      initializeSheets_();
      return jsonOk_({ message: "Hojas inicializadas." });
    }

    var ss   = SpreadsheetApp.getActiveSpreadsheet();
    var done = [];

    if (body.rows)             { writeSheet_(ss, SHEETS.LEADS,                   body.rows);             done.push("LEADS"); }
    if (body.team)             { writeSheet_(ss, SHEETS.EQUIPO,                  body.team);             done.push("EQUIPO"); }
    if (body.contentEvents)    { writeSheet_(ss, SHEETS.PLANIFICACION_CONTENIDOS, body.contentEvents);   done.push("PLANIFICACION_CONTENIDOS"); }
    if (body.managementEvents) { writeSheet_(ss, SHEETS.GESTION_EVENTOS,          body.managementEvents); done.push("GESTION_EVENTOS"); }
    if (body.colaboradores)    { writeSheet_(ss, SHEETS.COLABORADORES,            body.colaboradores);   done.push("COLABORADORES"); }
    if (body.procedimientos)   { writeSheet_(ss, SHEETS.PROCEDIMIENTOS,           body.procedimientos);  done.push("PROCEDIMIENTOS"); }
    if (body.reunionesEquipo)  { writeSheet_(ss, SHEETS.REUNIONES_EQUIPO,         body.reunionesEquipo); done.push("REUNIONES_EQUIPO"); }
    if (body.config)           { writeSheet_(ss, SHEETS.CONFIG,                   body.config);          done.push("CONFIG"); }
    if (body.columnWidths) {
      var now = new Date().toISOString();
      writeSheet_(ss, SHEETS.ANCHO_COLUMNAS, [{ key: "widths", json: JSON.stringify(body.columnWidths), updatedAt: now }]);
      done.push("ANCHO_COLUMNAS");
    }

    return jsonOk_({ updated: done });
  } catch (err) {
    return jsonError_(err.message);
  }
}

// ──────────────────── LECTURA ───────────────────────────────────

function readAllData_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var anchoRows = readSheet_(ss, "ANCHO_COLUMNAS");
  var columnWidths = {};
  for (var i = 0; i < anchoRows.length; i++) {
    if (anchoRows[i].key === "widths" && anchoRows[i].json) {
      try { columnWidths = JSON.parse(String(anchoRows[i].json)); } catch(e) {}
      break;
    }
  }

  return {
    rows:             readSheet_(ss, "LEADS"),
    team:             readSheet_(ss, "EQUIPO"),
    contentEvents:    readSheet_(ss, "PLANIFICACION_CONTENIDOS"),
    managementEvents: readSheet_(ss, "GESTION_EVENTOS"),
    colaboradores:    readSheet_(ss, "COLABORADORES"),
    procedimientos:   readSheet_(ss, "PROCEDIMIENTOS"),
    reunionesEquipo:  readSheet_(ss, "REUNIONES_EQUIPO"),
    config:           readSheet_(ss, "CONFIG"),
    columnWidths:     columnWidths
  };
}

function readSheet_(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row.every(function(c) { return c === "" || c === null || c === undefined; })) continue;
    var obj = {};
    headers.forEach(function(h, j) {
      var v = row[j];
      obj[h] = (v === "" || v === null || v === undefined) ? null : v;
    });
    rows.push(obj);
  }
  return rows;
}

// ──────────────────── ESCRITURA ─────────────────────────────────

function writeSheet_(ss, sheetDef, rows) {
  var sheet = getOrCreateSheet_(ss, sheetDef.name, sheetDef.headers);
  if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
  if (!Array.isArray(rows) || rows.length === 0) return;

  var values = rows.map(function(row) {
    return sheetDef.headers.map(function(h) {
      var v = row[h];
      if (v === null || v === undefined) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return String(v);
    });
  });
  sheet.getRange(2, 1, values.length, sheetDef.headers.length).setValues(values);
}

// ──────────────────── INICIALIZACIÓN ────────────────────────────

// Función pública — aparece en el menú "Ejecutar" de Apps Script
function inicializar() {
  initializeSheets_();
}

function initializeSheets_() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var keys = Object.keys(SHEETS);
  for (var i = 0; i < keys.length; i++) {
    var def = SHEETS[keys[i]];
    getOrCreateSheet_(ss, def.name, def.headers);
  }
}

function getOrCreateSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  // Expand columns if the sheet has fewer than needed
  var maxCols = sheet.getMaxColumns();
  if (maxCols < headers.length) {
    sheet.insertColumnsAfter(maxCols, headers.length - maxCols);
  }

  // Only set headers if they don't already match
  var range   = sheet.getRange(1, 1, 1, headers.length);
  var current = range.getValues()[0].map(String);
  var match   = headers.every(function(h, i) { return current[i] === h; });
  if (!match) {
    range.setValues([headers]);
    range.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ──────────────────── RESPUESTAS JSON ───────────────────────────

function jsonOk_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(Object.assign({ ok: true }, data)))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: String(msg) }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

const APPSSCRIPT_JSON = `{
  "timeZone": "America/Argentina/Buenos_Aires",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}`;

/* ─── Icons ────────────────────────────────────────────────────────────────── */

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

/* ─── Component ────────────────────────────────────────────────────────────── */

export function ApiSettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, update } = useAppSettings();
  const [url, setUrl] = useState(settings.apiUrl ?? "");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "error" | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [initMsg, setInitMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<"gs" | "json" | null>(null);

  async function handleTest() {
    if (!url.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await testSheetsConnection(url.trim());
      setTestResult(ok ? "ok" : "error");
    } catch {
      setTestResult("error");
    } finally {
      setTesting(false);
    }
  }

  async function handleInit() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    setInitializing(true);
    setInitMsg(null);
    try {
      const res = await fetch(trimmedUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "init" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { ok: boolean; message?: string; error?: string };
      setInitMsg(data.ok ? (data.message ?? "Hojas inicializadas correctamente.") : `Error: ${data.error ?? "desconocido"}`);
    } catch {
      setInitMsg("Error de conexión. Verificá la URL y que la implementación sea pública.");
    } finally {
      setInitializing(false);
    }
  }

  function handleSave() {
    update({ apiUrl: url.trim() });
    onClose();
  }

  function copy(text: string, which: "gs" | "json") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Cargar / cambiar link API</h2>
          <button className="icon-btn" onClick={onClose}><XIcon /></button>
        </div>

        <div className="api-modal-body">
          {/* 1. Instrucciones */}
          <section>
            <div className="api-modal-section-title">Instrucciones de instalación</div>
            <ol className="api-modal-instructions">
              <li>Abrí <b>Google Sheets</b> y creá una nueva planilla.</li>
              <li>Ir a <b>Extensiones → Apps Script</b>.</li>
              <li>Borrá el contenido de <code>Código.gs</code> y pegá el código de abajo.</li>
              <li>Guardá con <b>Ctrl+S</b>.</li>
              <li>Clic en <b>Implementar → Nueva implementación</b>.</li>
              <li>Tipo: <b>Aplicación web</b>. Acceso: <b>Cualquier persona</b>. Clic en Implementar.</li>
              <li>Copiá la URL generada (termina en <code>/exec</code>) y pegala abajo.</li>
              <li>Clic en <b>Inicializar hoja</b> para generar los encabezados automáticamente.</li>
            </ol>
            <div className="api-modal-warning">
              Cada vez que modifiques el código de Apps Script es necesario hacer una <b>nueva implementación</b> para que los cambios tomen efecto. La URL puede cambiar.
            </div>
          </section>

          {/* 2. URL */}
          <section>
            <div className="api-modal-section-title">URL del Web App</div>
            <input
              className="field"
              type="url"
              placeholder="https://script.google.com/macros/s/…/exec"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setTestResult(null); setInitMsg(null); }}
              style={{ width: "100%" }}
            />
          </section>

          {/* 3. Botones de acción */}
          <div className="api-modal-buttons">
            <button
              className="btn btn-outline btn-sm"
              disabled={!url.trim() || initializing}
              onClick={handleInit}
            >
              {initializing ? "Inicializando…" : "Inicializar hoja"}
            </button>
            <button
              className="btn btn-outline btn-sm"
              disabled={!url.trim() || testing}
              onClick={handleTest}
            >
              {testing ? "Probando…" : "Probar conexión"}
            </button>
            <button className="btn btn-dark btn-sm" onClick={handleSave}>
              Guardar cambios
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => copy(CODIGO_GS, "gs")}
            >
              {copied === "gs" ? "Copiado!" : "Copiar Código.gs"}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => copy(APPSSCRIPT_JSON, "json")}
            >
              {copied === "json" ? "Copiado!" : "Copiar appsscript.json"}
            </button>
          </div>

          {/* Resultados */}
          {testResult && (
            <div className={`api-modal-result ${testResult}`}>
              {testResult === "ok"
                ? "Conexión exitosa. El servidor responde correctamente."
                : "Error de conexión. Verificá la URL y que la implementación sea pública."}
            </div>
          )}
          {initMsg && <div className="api-modal-result">{initMsg}</div>}

          {/* 4. Qué se guarda */}
          <section>
            <div className="api-modal-section-title">Qué se guarda en Google Sheets</div>
            <div className="api-modal-sheet-list">
              {[
                ["LEADS", "Prospectos y clientes con todo su historial comercial. Coordenadas en mapLat/mapLng."],
                ["EQUIPO", "Integrantes, estado 9.1, puntos mensuales e insignias."],
                ["PLANIFICACION_CONTENIDOS", "Eventos de contenido por cliente (carruseles, reels, placas, historias)."],
                ["GESTION_EVENTOS", "Gestión, acompañamiento y cobros de clientes."],
                ["COLABORADORES", "Contactos externos, herramientas y observaciones."],
                ["PROCEDIMIENTOS", "Protocolos y guías operativas del equipo."],
                ["REUNIONES_EQUIPO", "Registro de reuniones internas."],
                ["NOTIFICACIONES", "Historial de notificaciones del sistema."],
                ["ANCHO_COLUMNAS / CONFIG", "Configuración del sistema y anchos de columnas."],
              ].map(([name, desc]) => (
                <div key={name} className="api-modal-sheet-row">
                  <b>{name}</b> — {desc}
                </div>
              ))}
            </div>
          </section>

          {/* 5. Código.gs */}
          <section>
            <div className="api-modal-section-title">Código.gs</div>
            <pre className="api-modal-code">{CODIGO_GS}</pre>
          </section>

          {/* 6. appsscript.json */}
          <section>
            <div className="api-modal-section-title">appsscript.json</div>
            <pre className="api-modal-code">{APPSSCRIPT_JSON}</pre>
          </section>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
          <button className="btn btn-dark" onClick={handleSave}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
