const SHEET_NAMES = {
  leads: "Leads",
  clients: "CLIENTES_BIOMARKETING",
  content: "PLANIFICACION_CONTENIDOS",
  gestion: "EVENTOS_GESTION",
  team: "Team",
  dashboard: "DashboardSettings",
  columns: "ColumnWidths",
  appSettings: "AppSettings",
  awarded: "AwardedBadges",
  collaborators: "COLABORADORES",
  procedures: "PROCEDIMIENTOS",
  puntos: "Puntos_Mensuales",
  teamMeetings: "REUNIONES_EQUIPO",
  servicePlans: "PLANES",
  mapPins: "MAPA_PINES",
  mapCache: "MAPA_GEOCODE_CACHE",
  notifications: "NOTIFICACIONES",
  history: "HISTORIAL"
};

const MAX_CELL_CHARS = 4500;
const MAX_SPLIT_PARTS = 60;
const MAX_PASOS = 30; // maximo de pasos por procedimiento en Sheets

// Status 9.1 keys (mismo orden que STATUS91_ITEMS en constants.ts)
const STATUS91_KEYS = [
  "COMPROMISO","HONESTIDAD","CONFIANZA","APRENDER","BIENESTAR",
  "GANAR DINERO","SUMAR","MULTIPLICAR","COLABORATIVO","TU SUENO"
];

const LEAD_HEADERS = ["id","nombre","empresa","observaciones","telefono","responsable1","responsable2","responsables","direccion","fechaContacto","empresaBio","medio","etapa","seguimiento","proximaFecha","rowOrder","email","instagram","mesEntrada","objetivos","rubro","estado","servicio","planAudiovisual","planServicio","clientOrder","ordenCliente","source","lat","lng","latitude","longitude","latitud","longitud","coordenadas","mapLat","mapLng","createdAt","updatedAt"];
const CLIENT_HEADERS = ["id","nombre","empresa","responsable","servicio","telefono","email","instagram","direccion","mesEntrada","objetivos","rubro","estado","orden","source","responsable1","responsable2","responsables","observaciones","fechaContacto","empresaBio","medio","etapa","seguimiento","proximaFecha","planAudiovisual","planServicio","clientOrder","ordenCliente","rowOrder","lat","lng","latitude","longitude","latitud","longitud","coordenadas","mapLat","mapLng","createdAt","updatedAt"];
const CONTENT_HEADERS = ["id","clientId","encargado","fecha","hora","tipo","estado","objetivo","frase","copy","archivo","comentarios","timerTotalMs","timerRunning","timerStartedAt","done","contentOrder","planGenerated","planService","planName","planSourceId","createdAt","updatedAt"];
const GESTION_HEADERS = ["id","clientId","fecha","hora","tipo","motivo","done","calendar","createdAt","updatedAt"];

// Team: status91 en columnas individuales, badges como string separado por coma
const TEAM_HEADERS = [
  "id","nombre","fechaNacimiento","edad","equipo","telefono","mail","roles","horarios","sueno","direccion","notas","signo","signoChino",
  "s91_COMPROMISO","s91_HONESTIDAD","s91_CONFIANZA","s91_APRENDER","s91_BIENESTAR",
  "s91_GANAR_DINERO","s91_SUMAR","s91_MULTIPLICAR","s91_COLABORATIVO","s91_TU_SUENO",
  "badges","createdAt","updatedAt"
];
const COLLAB_HEADERS = ["id","nombre","edad","telefono","herramientas","observaciones","estado","createdAt","updatedAt"];

// PROCEDIMIENTOS: col A=id, B=titulo, C=categoria, D=totalPasos, E=creadoEn, F=actualizadoEn
// Col G en adelante = paso_1, paso_1_desc, paso_1_done, paso_2, paso_2_desc, paso_2_done, ...
const PROCEDURE_HEADERS = (function() {
  var h = ["id","titulo","categoria","totalPasos","creadoEn","actualizadoEn"];
  for (var i = 1; i <= MAX_PASOS; i++) {
    h.push("paso_" + i);
    h.push("paso_" + i + "_desc");
    h.push("paso_" + i + "_done");
  }
  return h;
})();

// Puntos mensuales: una fila por entry mensual de cada miembro
const PUNTOS_HEADERS = ["miembro_id","miembro_nombre","puntos","detalles","fecha","estado"];
const MEETING_HEADERS = ["date","content","updatedAt"];
const NOTIFICATION_HEADERS = ["id","date","time","message","type","createdAt"];
const MAP_PIN_HEADERS = ["id","clientId","title","etapa","direccion","lat","lng","query","status","updatedAt"];
const HISTORY_HEADERS = ["id","timestamp","action","summary"];

// Convierte clave STATUS91 a nombre de columna (sin espacios ni tildes)
function s91Col_(key) {
  return "s91_" + String(key).toUpperCase()
    .replace(/ /g, "_")
    .replace(/[ÁÀÂÄ]/g, "A").replace(/[ÉÈÊË]/g, "E")
    .replace(/[ÍÌÎÏ]/g, "I").replace(/[ÓÒÔÖ]/g, "O")
    .replace(/[ÚÙÛÜ]/g, "U").replace(/Ñ/g, "N")
    .replace(/[^A-Z0-9_]/g, "");
}

function doGet(e) {
  try {
    initializeSheets_();
    const sheetName = e && e.parameter ? String(e.parameter.sheet || "") : "";
    if (sheetName) return jsonResponse(getSheetPayload_(sheetName));
    const appSettings = getJsonSheet(SHEET_NAMES.appSettings, {});
    appSettings.collaborators = getTableSheet(SHEET_NAMES.collaborators, COLLAB_HEADERS);
    appSettings.teamMeetings = meetingsRowsToObject_(getTableSheet(SHEET_NAMES.teamMeetings, MEETING_HEADERS));
    appSettings.servicePlans = getJsonSheet(SHEET_NAMES.servicePlans, appSettings.servicePlans || {});
    appSettings.notificationsLog = getTableSheet(SHEET_NAMES.notifications, NOTIFICATION_HEADERS);
    const mapCache = getJsonSheet(SHEET_NAMES.mapCache, appSettings.mapGeocodeCacheV43 || {});
    appSettings.mapGeocodeCacheV43 = mapCache;

    // Procedimientos: reconstruir steps desde columnas G en adelante
    const procedures = procedureRowsToObjects_(getTableSheet(SHEET_NAMES.procedures, PROCEDURE_HEADERS));

    // Equipo: mergear con puntos mensuales
    const teamRows = getTableSheet(SHEET_NAMES.team, TEAM_HEADERS);
    const puntosRows = getTableSheet(SHEET_NAMES.puntos, PUNTOS_HEADERS);
    const team = teamRowsToMembers_(teamRows, puntosRows);

    return jsonResponse({
      ok: true,
      version: "6.1-pasos-en-columnas",
      data: {
        rows: getTableSheet(SHEET_NAMES.leads, LEAD_HEADERS),
        clients: getTableSheet(SHEET_NAMES.clients, CLIENT_HEADERS),
        contentEvents: getTableSheet(SHEET_NAMES.content, CONTENT_HEADERS),
        managementEvents: getTableSheet(SHEET_NAMES.gestion, GESTION_HEADERS),
        team: team,
        dashboardSettings: getJsonSheet(SHEET_NAMES.dashboard, {todayGoals:{},clientsGoal:21,chartScale:1}),
        columnWidths: getJsonSheet(SHEET_NAMES.columns, {}),
        appSettings: appSettings,
        awarded: getJsonSheet(SHEET_NAMES.awarded, {}),
        collaborators: appSettings.collaborators,
        procedures: procedures,
        teamMeetings: appSettings.teamMeetings,
        servicePlans: appSettings.servicePlans,
        mapPins: getTableSheet(SHEET_NAMES.mapPins, MAP_PIN_HEADERS),
        mapGeocodeCache: mapCache,
        notificationsLog: appSettings.notificationsLog
      }
    });
  } catch (error) {
    return jsonResponse({ok: false, error: getErrorMessage_(error)});
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  var locked = false;
  try {
    lock.waitLock(15000);
    locked = true;
    const body = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : "{}");
    const action = String(body.action || "");

    if (action === "initializeSheets" || action === "init") {
      initializeSheets_();
      return jsonResponse({ok: true, message: "Hojas inicializadas correctamente"});
    }
    if (action === "saveSheet") return saveSheetAction_(body);
    if (action === "updateCoordinates") return updateCoordinatesAction_(body);
    if (action === "connectCalendar") return connectCalendarAction_(body);
    if (action === "upsertCalendarEvent") return upsertCalendarAction_(body);

    if (action === "saveColumnWidths") {
      saveJsonSheet(SHEET_NAMES.columns, body.columnWidths || {});
      return jsonResponse({ok: true, message: "ColumnWidths guardado"});
    }
    if (action === "saveTeam") {
      saveTableSheet(SHEET_NAMES.team, TEAM_HEADERS, normalizeTeamRows_(body.team || []));
      saveTableSheet(SHEET_NAMES.puntos, PUNTOS_HEADERS, extractPuntosFromTeam_(body.team || []));
      return jsonResponse({ok: true, message: "Team guardado"});
    }
    if (action === "saveProcedures") {
      saveTableSheet(SHEET_NAMES.procedures, PROCEDURE_HEADERS, normalizeProcedures_(body.procedimientos || []));
      return jsonResponse({ok: true, message: "Procedimientos guardados"});
    }
    if (action === "saveCollaborators") {
      saveTableSheet(SHEET_NAMES.collaborators, COLLAB_HEADERS, normalizeCollaborators_(body.collaborators || []));
      return jsonResponse({ok: true, message: "Colaboradores guardados"});
    }

    if (action === "saveAll" || action === "sync") {
      initializeSheets_();
      const rows = dedupeRowsById_(normalizeLeadRows_(body.rows || []));
      const clients = Array.isArray(body.clients) ? dedupeRowsById_(normalizeClientRows_(body.clients)) : getTableSheet(SHEET_NAMES.clients, CLIENT_HEADERS);
      const appSettings = sanitizeAppSettings_(body.appSettings || {});
      const collaborators = normalizeCollaborators_(body.collaborators || []);
      const teamMeetings = body.teamMeetings || {};
      const servicePlans = body.servicePlans || {};
      const notifications = normalizeNotifications_(body.notificationsLog || []);
      const mapCache = body.mapGeocodeCache || {};
      const mapPins = normalizeMapPins_(body.mapPins || deriveMapPins_(rows, clients));
      appSettings.collaborators = collaborators;
      appSettings.teamMeetings = teamMeetings;
      appSettings.servicePlans = servicePlans;
      appSettings.notificationsLog = notifications;
      appSettings.mapGeocodeCacheV43 = mapCache;
      saveTableSheet(SHEET_NAMES.leads, LEAD_HEADERS, rows);
      saveTableSheet(SHEET_NAMES.clients, CLIENT_HEADERS, clients);
      saveTableSheet(SHEET_NAMES.content, CONTENT_HEADERS, normalizeContentRows_(body.contentEvents || []));
      saveTableSheet(SHEET_NAMES.gestion, GESTION_HEADERS, normalizeGestionRows_(body.managementEvents || []));
      saveTableSheet(SHEET_NAMES.team, TEAM_HEADERS, normalizeTeamRows_(body.team || []));
      saveTableSheet(SHEET_NAMES.puntos, PUNTOS_HEADERS, extractPuntosFromTeam_(body.team || []));
      saveJsonSheet(SHEET_NAMES.dashboard, body.dashboardSettings || {todayGoals:{},clientsGoal:21,chartScale:1});
      saveJsonSheet(SHEET_NAMES.columns, body.columnWidths || {});
      saveJsonSheet(SHEET_NAMES.appSettings, appSettings);
      saveJsonSheet(SHEET_NAMES.awarded, body.awarded || {});
      saveTableSheet(SHEET_NAMES.collaborators, COLLAB_HEADERS, collaborators);
      saveTableSheet(SHEET_NAMES.procedures, PROCEDURE_HEADERS, normalizeProcedures_(body.procedimientos || []));
      saveTableSheet(SHEET_NAMES.teamMeetings, MEETING_HEADERS, meetingsObjectToRows_(teamMeetings));
      saveJsonSheet(SHEET_NAMES.servicePlans, servicePlans);
      saveTableSheet(SHEET_NAMES.mapPins, MAP_PIN_HEADERS, mapPins);
      saveJsonSheet(SHEET_NAMES.mapCache, mapCache);
      saveTableSheet(SHEET_NAMES.notifications, NOTIFICATION_HEADERS, notifications);
      appendHistory_(action, "Guardado completo - pasos en columnas G+");
      return jsonResponse({
        ok: true,
        message: "Guardado completo en Google Sheets",
        saved: {
          leads: rows.length,
          clients: clients.length,
          content: (body.contentEvents || []).length,
          gestion: (body.managementEvents || []).length,
          collaborators: collaborators.length
        }
      });
    }

    return jsonResponse({ok: false, error: "Accion no soportada: " + action});
  } catch (error) {
    const message = getErrorMessage_(error);
    return jsonResponse({
      ok: false,
      error: message.indexOf("Lock") >= 0 || message.indexOf("lock") >= 0
        ? "El servidor esta ocupado. Reintentar en unos segundos."
        : message
    });
  } finally {
    if (locked) { try { lock.releaseLock(); } catch (err) {} }
  }
}

function inicializar() { initializeSheets_(); }

function initializeSheets_() {
  saveTableHeadersOnly_(SHEET_NAMES.leads, LEAD_HEADERS);
  saveTableHeadersOnly_(SHEET_NAMES.clients, CLIENT_HEADERS);
  saveTableHeadersOnly_(SHEET_NAMES.content, CONTENT_HEADERS);
  saveTableHeadersOnly_(SHEET_NAMES.gestion, GESTION_HEADERS);
  saveTableHeadersOnly_(SHEET_NAMES.collaborators, COLLAB_HEADERS);
  saveTableHeadersOnly_(SHEET_NAMES.procedures, PROCEDURE_HEADERS);
  saveTableHeadersOnly_(SHEET_NAMES.puntos, PUNTOS_HEADERS);
  saveTableHeadersOnly_(SHEET_NAMES.teamMeetings, MEETING_HEADERS);
  saveTableHeadersOnly_(SHEET_NAMES.mapPins, MAP_PIN_HEADERS);
  saveTableHeadersOnly_(SHEET_NAMES.notifications, NOTIFICATION_HEADERS);
  saveTableHeadersOnly_(SHEET_NAMES.history, HISTORY_HEADERS);
  saveTableHeadersOnly_(SHEET_NAMES.team, TEAM_HEADERS);
  ensureJsonSheet_(SHEET_NAMES.dashboard, {todayGoals:{},clientsGoal:21,chartScale:1});
  ensureJsonSheet_(SHEET_NAMES.columns, {});
  ensureJsonSheet_(SHEET_NAMES.appSettings, {});
  ensureJsonSheet_(SHEET_NAMES.awarded, {});
  ensureJsonSheet_(SHEET_NAMES.servicePlans, {});
  ensureJsonSheet_(SHEET_NAMES.mapCache, {});
}

function getSheetPayload_(sheetName) {
  var map = {};
  map[SHEET_NAMES.leads] = function() { return getTableSheet(SHEET_NAMES.leads, LEAD_HEADERS); };
  map[SHEET_NAMES.clients] = function() { return getTableSheet(SHEET_NAMES.clients, CLIENT_HEADERS); };
  map[SHEET_NAMES.content] = function() { return getTableSheet(SHEET_NAMES.content, CONTENT_HEADERS); };
  map[SHEET_NAMES.gestion] = function() { return getTableSheet(SHEET_NAMES.gestion, GESTION_HEADERS); };
  map[SHEET_NAMES.collaborators] = function() { return getTableSheet(SHEET_NAMES.collaborators, COLLAB_HEADERS); };
  map[SHEET_NAMES.procedures] = function() { return procedureRowsToObjects_(getTableSheet(SHEET_NAMES.procedures, PROCEDURE_HEADERS)); };
  map[SHEET_NAMES.teamMeetings] = function() { return getTableSheet(SHEET_NAMES.teamMeetings, MEETING_HEADERS); };
  map[SHEET_NAMES.mapPins] = function() { return getTableSheet(SHEET_NAMES.mapPins, MAP_PIN_HEADERS); };
  map[SHEET_NAMES.notifications] = function() { return getTableSheet(SHEET_NAMES.notifications, NOTIFICATION_HEADERS); };
  var data = map[sheetName] ? map[sheetName]() : getJsonSheet(sheetName, {});
  return {ok: true, sheet: sheetName, data: data};
}

function saveSheetAction_(body) {
  const sheet = String(body.sheet || "");
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (sheet === SHEET_NAMES.content) saveTableSheet(sheet, CONTENT_HEADERS, normalizeContentRows_(rows));
  else if (sheet === SHEET_NAMES.gestion) saveTableSheet(sheet, GESTION_HEADERS, normalizeGestionRows_(rows));
  else if (sheet === SHEET_NAMES.clients) saveTableSheet(sheet, CLIENT_HEADERS, normalizeClientRows_(rows));
  else if (sheet === SHEET_NAMES.leads) saveTableSheet(sheet, LEAD_HEADERS, normalizeLeadRows_(rows));
  else return jsonResponse({ok: false, error: "saveSheet no soporta: " + sheet});
  return jsonResponse({ok: true, sheet: sheet, saved: rows.length});
}

function updateCoordinatesAction_(body) {
  const rows = normalizeLeadRows_(body.rows || []);
  const clients = Array.isArray(body.clients) && body.clients.length ? normalizeClientRows_(body.clients) : clientsFromRows_(rows);
  const mapPins = normalizeMapPins_(body.mapPins || deriveMapPins_(rows, clients));
  const mapCache = body.mapGeocodeCache || {};
  saveTableSheet(SHEET_NAMES.leads, LEAD_HEADERS, rows);
  saveTableSheet(SHEET_NAMES.clients, CLIENT_HEADERS, clients);
  saveTableSheet(SHEET_NAMES.mapPins, MAP_PIN_HEADERS, mapPins);
  saveJsonSheet(SHEET_NAMES.mapCache, mapCache);
  return jsonResponse({ok: true, message: "Coordenadas actualizadas", mapPins: mapPins.length});
}

function sanitizeAppSettings_(settings) {
  const src = settings || {};
  const keep = ["darkMode","apiUrl","calendarId","calendarConnected","specialConfigUnlocked","dashboardLabelWidth","dashboardMemberWidth","dashboardTotalWidth","dashboardFontSize","notificationMinutesBefore","notificationTone","notificationRepeat","badgeRequirements","clientOrderMode","clientOrder","calendarViewMonth","systemScale","chartScale","allRowsHeight","workspaceMode","mapZoom","mapCenter"];
  const out = {};
  keep.forEach(function(k) { if (src[k] !== undefined) out[k] = src[k]; });
  return out;
}

function splitText_(value) {
  const text = value === null || value === undefined ? "" : String(value);
  const parts = [];
  for (var i = 0; i < text.length; i += MAX_CELL_CHARS) parts.push(text.slice(i, i + MAX_CELL_CHARS));
  return parts.length ? parts : [""];
}

function buildSplitHeaders_(headers, rows) {
  const maxParts = {};
  headers.forEach(function(h) { maxParts[h] = 1; });
  (rows || []).forEach(function(row) {
    headers.forEach(function(h) {
      const parts = splitText_(row && row[h] !== undefined ? row[h] : "");
      if (parts.length > maxParts[h]) maxParts[h] = Math.min(parts.length, MAX_SPLIT_PARTS);
    });
  });
  const out = [];
  headers.forEach(function(h) {
    out.push(h);
    for (var i = 2; i <= maxParts[h]; i++) out.push(h + "__" + i);
  });
  return out;
}

function saveTableHeadersOnly_(sheetName, headers) {
  const sheet = getOrCreateSheet(sheetName);
  if (sheet.getLastRow() < 1 || !sheet.getRange(1, 1).getValue()) ensureHeaders(sheet, headers);
}

function saveTableSheet(sheetName, headers, rows) {
  const sheet = getOrCreateSheet(sheetName);
  rows = Array.isArray(rows) ? rows : [];
  const splitHeaders = buildSplitHeaders_(headers, rows);
  ensureHeaders(sheet, splitHeaders);
  const oldRows = Math.max(sheet.getLastRow() - 1, 0);
  const oldCols = Math.max(sheet.getLastColumn(), splitHeaders.length);
  if (oldRows > 0) sheet.getRange(2, 1, oldRows, oldCols).clearContent();
  if (!rows.length) return;
  const values = rows.map(function(row) {
    const line = [];
    headers.forEach(function(h) {
      const parts = splitText_(row && row[h] !== undefined && row[h] !== null ? row[h] : "");
      const count = splitHeaders.filter(function(x) { return x === h || x.indexOf(h + "__") === 0; }).length;
      for (var i = 0; i < count; i++) line.push(parts[i] || "");
    });
    return line;
  });
  sheet.getRange(2, 1, values.length, splitHeaders.length).setValues(values);
}

function getTableSheet(sheetName, headers) {
  const sheet = getOrCreateSheet(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), headers.length);
  if (lastRow < 1) { ensureHeaders(sheet, headers); return []; }
  const sheetHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return values
    .filter(function(row) { return row.some(function(c) { return c !== "" && c !== null; }); })
    .map(function(row) {
      const item = {};
      headers.forEach(function(h) {
        var text = "";
        sheetHeaders.forEach(function(sh, idx) {
          if (sh === h || sh.indexOf(h + "__") === 0) text += formatCellValue_(row[idx]);
        });
        item[h] = text;
      });
      return item;
    });
}

function saveJsonSheet(sheetName, data) {
  const sheet = getOrCreateSheet(sheetName);
  sheet.clearContents();
  ensureHeaders(sheet, ["key","chunkIndex","chunk","updatedAt"]);
  const text = JSON.stringify(data || null);
  const parts = splitText_(text);
  const nowStr = now_();
  const values = parts.map(function(p, i) { return ["json", i + 1, p, nowStr]; });
  if (values.length) sheet.getRange(2, 1, values.length, 4).setValues(values);
}

function getJsonSheet(sheetName, fallback) {
  const sheet = getOrCreateSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    const old = sheet.getRange(1, 1).getValue();
    if (old && String(old).trim().charAt(0) === "{") return parseJsonCell_(old, fallback);
    return fallback;
  }
  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues()
    .filter(function(r) { return String(r[0]) === "json"; })
    .sort(function(a, b) { return Number(a[1]) - Number(b[1]); });
  const text = values.map(function(r) { return String(r[2] || ""); }).join("");
  return parseJsonCell_(text, fallback);
}

function ensureJsonSheet_(sheetName, fallback) {
  const sheet = getOrCreateSheet(sheetName);
  if (sheet.getLastRow() < 1 || !sheet.getRange(1, 1).getValue()) saveJsonSheet(sheetName, fallback);
}

function getSpreadsheet() { return SpreadsheetApp.getActiveSpreadsheet(); }
function getOrCreateSheet(name) { var ss = getSpreadsheet(); var sheet = ss.getSheetByName(name); if (!sheet) sheet = ss.insertSheet(name); return sheet; }
function ensureHeaders(sheet, headers) { sheet.getRange(1, 1, 1, headers.length).setValues([headers]); }
function parseJsonCell_(value, fallback) { if (!value) return fallback || {}; if (typeof value === "object") return value; try { return JSON.parse(String(value)); } catch(e) { return fallback || {}; } }
function formatCellValue_(value) { if (value === null || value === undefined) return ""; if (Object.prototype.toString.call(value) === "[object Date]") return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"); return value; }
function now_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"); }
function getErrorMessage_(error) { return String(error && error.message ? error.message : error); }
function jsonResponse(payload) { return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON); }

// ─── Lead / Client normalization ────────────────────────────────────────────

/* Convierte fechaContacto de cualquier formato a ISO string */
function normalizeSheetDate_(raw) {
  if (!raw && raw !== 0) return "";
  // Ya es string ISO (YYYY-MM-DD...)
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
  // Objeto Date de Apps Script
  if (Object.prototype.toString.call(raw) === "[object Date]") {
    return Utilities.formatDate(raw, "America/Argentina/Buenos_Aires", "yyyy-MM-dd'T'HH:mm:ss");
  }
  // Número serial de Excel/Sheets (días desde 1/1/1900)
  if (typeof raw === "number" && raw > 40000 && raw < 70000) {
    var unixMs = (raw - 25569) * 86400 * 1000;
    var d = new Date(unixMs);
    if (!isNaN(d.getTime())) {
      var y = d.getUTCFullYear();
      var m = String(d.getUTCMonth() + 1).padStart(2, "0");
      var dd = String(d.getUTCDate()).padStart(2, "0");
      return y + "-" + m + "-" + dd;
    }
  }
  // Formato DD/MM/YYYY
  if (typeof raw === "string") {
    var ddmm = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (ddmm) {
      var d2 = ddmm[1].padStart(2,"0"), m2 = ddmm[2].padStart(2,"0"), y2 = ddmm[3];
      return y2 + "-" + m2 + "-" + d2;
    }
    var d3 = new Date(raw);
    if (!isNaN(d3.getTime())) return d3.toISOString().slice(0, 10);
  }
  return String(raw);
}

function normalizeLeadRows_(rows) {
  return (rows || []).map(function(row, index) {
    row = row || {};
    const r1 = row.responsable1 || "";
    const r2 = row.responsable2 || "";
    const created = row.createdAt || row.fechaContacto || now_();
    const updated = row.updatedAt || created;
    return {
      id: row.id || Utilities.getUuid(), nombre: row.nombre || "", empresa: row.empresa || "",
      observaciones: row.observaciones || "", telefono: row.telefono || "",
      responsable1: r1, responsable2: r2,
      responsables: row.responsables || (r1 && r2 ? r1 + " Y " + r2 : r1 || r2 || ""),
      direccion: row.direccion || "", fechaContacto: normalizeSheetDate_(row.fechaContacto),
      empresaBio: row.empresaBio || "", medio: row.medio || "", etapa: row.etapa || row.tab || "CRM",
      seguimiento: row.seguimiento || "", proximaFecha: row.proximaFecha || "",
      rowOrder: row.rowOrder || index + 1, email: row.email || "", instagram: row.instagram || "",
      mesEntrada: row.mesEntrada || "", objetivos: row.objetivos || "", rubro: row.rubro || "",
      estado: row.estado || "", servicio: row.servicio || "",
      planAudiovisual: row.planAudiovisual || "", planServicio: row.planServicio || "",
      clientOrder: row.clientOrder || "", ordenCliente: row.ordenCliente || "",
      source: row.source || "", lat: row.lat || "", lng: row.lng || "",
      latitude: row.latitude || "", longitude: row.longitude || "",
      latitud: row.latitud || "", longitud: row.longitud || "",
      coordenadas: row.coordenadas || "", mapLat: row.mapLat || "", mapLng: row.mapLng || "",
      createdAt: created, updatedAt: updated
    };
  });
}

function dedupeRowsById_(rows) {
  const seen = {}; const out = [];
  (rows || []).forEach(function(row) {
    row = row || {};
    const id = String(row.id || "").trim() || Utilities.getUuid();
    row.id = id;
    if (seen[id] === undefined) { seen[id] = out.length; out.push(row); }
    else {
      const current = out[seen[id]];
      const a = String(current.updatedAt || ""); const b = String(row.updatedAt || "");
      if (b >= a) out[seen[id]] = row;
    }
  });
  return out;
}

function clientsFromRows_(rows) {
  return (rows || []).filter(function(r) { return String(r.etapa || "") === "CLIENTES"; })
    .map(function(r, i) {
      return {
        id: r.id, nombre: r.nombre || "", empresa: r.empresa || "",
        responsable: r.responsables || r.responsable1 || "",
        servicio: r.servicio || r.planServicio || "", telefono: r.telefono || "",
        email: r.email || "", instagram: r.instagram || "", direccion: r.direccion || "",
        mesEntrada: r.mesEntrada || "", objetivos: r.objetivos || "", rubro: r.rubro || "",
        estado: r.estado || "ACTIVO", orden: r.clientOrder || r.ordenCliente || i + 1,
        source: r.source || "lead", responsable1: r.responsable1 || "",
        responsable2: r.responsable2 || "", responsables: r.responsables || "",
        observaciones: r.observaciones || "", fechaContacto: r.fechaContacto || "",
        empresaBio: r.empresaBio || "", medio: r.medio || "", etapa: r.etapa || "CLIENTES",
        seguimiento: r.seguimiento || "", proximaFecha: r.proximaFecha || "",
        planAudiovisual: r.planAudiovisual || "", planServicio: r.planServicio || "",
        clientOrder: r.clientOrder || "", ordenCliente: r.ordenCliente || "",
        rowOrder: r.rowOrder || "", lat: r.lat || "", lng: r.lng || "",
        latitude: r.latitude || "", longitude: r.longitude || "",
        latitud: r.latitud || "", longitud: r.longitud || "",
        coordenadas: r.coordenadas || "", mapLat: r.mapLat || "", mapLng: r.mapLng || "",
        createdAt: r.createdAt || r.fechaContacto || now_(),
        updatedAt: r.updatedAt || r.createdAt || r.fechaContacto || now_()
      };
    });
}

function normalizeClientRows_(rows) {
  return (rows || []).map(function(row, index) {
    row = row || {};
    return {
      id: row.id || Utilities.getUuid(), nombre: row.nombre || "", empresa: row.empresa || "",
      responsable: row.responsable || row.responsables || "", servicio: row.servicio || "",
      telefono: row.telefono || "", email: row.email || "", instagram: row.instagram || "",
      direccion: row.direccion || "", mesEntrada: row.mesEntrada || "",
      objetivos: row.objetivos || "", rubro: row.rubro || "", estado: row.estado || "ACTIVO",
      orden: row.orden || row.clientOrder || index + 1, source: row.source || "manual",
      responsable1: row.responsable1 || "", responsable2: row.responsable2 || "",
      responsables: row.responsables || row.responsable || "",
      observaciones: row.observaciones || "", fechaContacto: row.fechaContacto || "",
      empresaBio: row.empresaBio || "", medio: row.medio || "", etapa: row.etapa || "CLIENTES",
      seguimiento: row.seguimiento || "", proximaFecha: row.proximaFecha || "",
      planAudiovisual: row.planAudiovisual || "", planServicio: row.planServicio || "",
      clientOrder: row.clientOrder || row.orden || "", ordenCliente: row.ordenCliente || "",
      rowOrder: row.rowOrder || "", lat: row.lat || "", lng: row.lng || "",
      latitude: row.latitude || "", longitude: row.longitude || "",
      latitud: row.latitud || "", longitud: row.longitud || "",
      coordenadas: row.coordenadas || "", mapLat: row.mapLat || "", mapLng: row.mapLng || "",
      createdAt: row.createdAt || row.fechaContacto || now_(),
      updatedAt: row.updatedAt || row.createdAt || row.fechaContacto || now_()
    };
  });
}

function normalizeContentRows_(rows) {
  return (rows || []).map(function(row, index) {
    row = row || {};
    return {
      id: row.id || Utilities.getUuid(), clientId: row.clientId || "",
      encargado: row.encargado || row.assignee || "", fecha: row.fecha || row.date || "",
      hora: row.hora || row.time || "", tipo: row.tipo || row.type || "",
      estado: row.estado || row.status || "", objetivo: row.objetivo || row.objective || "",
      frase: row.frase || row.phrase || "", copy: row.copy || "",
      archivo: row.archivo || row.file || "", comentarios: row.comentarios || row.comments || "",
      timerTotalMs: row.timerTotalMs || 0, timerRunning: row.timerRunning || false,
      timerStartedAt: row.timerStartedAt || 0, done: row.done || false,
      contentOrder: row.contentOrder || row.orden || index + 1,
      planGenerated: row.planGenerated || "", planService: row.planService || "",
      planName: row.planName || "", planSourceId: row.planSourceId || "",
      createdAt: row.createdAt || now_(), updatedAt: row.updatedAt || now_()
    };
  });
}

function normalizeGestionRows_(rows) {
  return (rows || []).map(function(row) {
    row = row || {};
    return {
      id: row.id || Utilities.getUuid(), clientId: row.clientId || "",
      fecha: row.fecha || row.date || "", hora: row.hora || row.time || "",
      tipo: row.tipo || row.type || "", motivo: row.motivo || row.reason || "",
      done: row.done || false, calendar: row.calendar || "",
      createdAt: row.createdAt || "", updatedAt: row.updatedAt || ""
    };
  });
}

function normalizeCollaborators_(rows) {
  return (rows || []).map(function(row) {
    row = row || {};
    return {
      id: row.id || Utilities.getUuid(), nombre: row.nombre || row.name || "",
      edad: row.edad || row.age || "", telefono: row.telefono || row.phone || "",
      herramientas: row.herramientas || row.tools || "",
      observaciones: row.observaciones || row.notes || "",
      estado: row.estado || row.status || "Activo",
      createdAt: row.createdAt || "", updatedAt: row.updatedAt || now_()
    };
  });
}

function normalizeNotifications_(rows) {
  return (rows || []).map(function(row) {
    row = row || {};
    return {
      id: row.id || Utilities.getUuid(), date: row.date || row.fecha || "",
      time: row.time || row.hora || "", message: row.message || row.mensaje || "",
      type: row.type || row.tipo || "", createdAt: row.createdAt || now_()
    };
  });
}

function normalizeMapPins_(rows) {
  return (rows || []).map(function(row) {
    row = row || {};
    return {
      id: row.id || Utilities.getUuid(), clientId: row.clientId || "",
      title: row.title || row.empresa || row.nombre || "", etapa: row.etapa || "",
      direccion: row.direccion || "",
      lat: row.lat || row.latitude || row.latitud || row.mapLat || "",
      lng: row.lng || row.longitude || row.longitud || row.mapLng || "",
      query: row.query || "", status: row.status || row.estado || "",
      updatedAt: row.updatedAt || now_()
    };
  });
}

function deriveMapPins_(rows, clients) {
  return (clients && clients.length ? clients : rows || [])
    .filter(function(row) { return row.direccion; })
    .map(function(row) {
      return {
        id: "PIN-" + (row.id || Utilities.getUuid()), clientId: row.id || "",
        title: row.empresa || row.nombre || "", etapa: row.etapa || "",
        direccion: row.direccion || "",
        lat: row.lat || row.latitude || row.latitud || row.mapLat || "",
        lng: row.lng || row.longitude || row.longitud || row.mapLng || "",
        query: row.direccion ? row.direccion + ", Mar del Plata" : (row.empresa || row.nombre || ""),
        status: row.direccion ? "direccion" : "sin_direccion",
        updatedAt: now_()
      };
    });
}

// ─── Team ────────────────────────────────────────────────────────────────────

function normalizeTeamRows_(rows) {
  return (rows || []).map(function(row) {
    row = row || {};
    const s91 = typeof row.status91 === "object" && row.status91 !== null ? row.status91 : {};
    const badgesArr = Array.isArray(row.badges) ? row.badges
      : (typeof row.badges === "string" ? row.badges.split(",").map(function(b) { return b.trim(); }).filter(Boolean) : []);
    const out = {
      id: row.id || Utilities.getUuid(),
      nombre: row.nombre || "",
      fechaNacimiento: row.fechaNacimiento || "",
      edad: row.edad || "",
      equipo: row.equipo || "",
      telefono: row.telefono || "",
      mail: row.mail || "",
      roles: row.roles || "",
      horarios: row.horarios || "",
      sueno: row.sueno || "",
      direccion: row.direccion || "",
      notas: row.notas || "",
      signo: row.signo || "",
      signoChino: row.signoChino || "",
      badges: badgesArr.join(","),
      createdAt: row.createdAt || now_(),
      updatedAt: row.updatedAt || now_()
    };
    STATUS91_KEYS.forEach(function(key) {
      out[s91Col_(key)] = s91[key] || row[s91Col_(key)] || "";
    });
    return out;
  });
}

function teamRowsToMembers_(rows, puntosRows) {
  const puntosByMember = {};
  (puntosRows || []).forEach(function(p) {
    const id = p.miembro_id || "";
    if (!id) return;
    if (!puntosByMember[id]) puntosByMember[id] = [];
    puntosByMember[id].push({
      puntos: p.puntos || "",
      detalles: p.detalles || "",
      fecha: p.fecha || "",
      estado: p.estado || ""
    });
  });
  return (rows || []).map(function(row) {
    row = row || {};
    const status91 = {};
    STATUS91_KEYS.forEach(function(key) { status91[key] = row[s91Col_(key)] || ""; });
    const badgesStr = row.badges || "";
    return {
      id: row.id || "",
      nombre: row.nombre || "",
      fechaNacimiento: row.fechaNacimiento || "",
      edad: row.edad || "",
      equipo: row.equipo || "",
      telefono: row.telefono || "",
      mail: row.mail || "",
      roles: row.roles || "",
      horarios: row.horarios || "",
      sueno: row.sueno || "",
      direccion: row.direccion || "",
      notas: row.notas || "",
      signo: row.signo || "",
      signoChino: row.signoChino || "",
      status91: status91,
      badges: badgesStr ? badgesStr.split(",").filter(Boolean) : [],
      monthlyPoints: puntosByMember[row.id] || [],
      createdAt: row.createdAt || "",
      updatedAt: row.updatedAt || ""
    };
  });
}

function extractPuntosFromTeam_(teamArray) {
  const out = [];
  (teamArray || []).forEach(function(member) {
    member = member || {};
    const mp = Array.isArray(member.monthlyPoints) ? member.monthlyPoints : [];
    mp.forEach(function(p) {
      out.push({
        miembro_id: member.id || "",
        miembro_nombre: member.nombre || "",
        puntos: p.puntos || "",
        detalles: p.detalles || "",
        fecha: p.fecha || "",
        estado: p.estado || ""
      });
    });
  });
  return out;
}

// ─── Procedures: pasos en columnas G en adelante (paso_1, paso_1_desc, paso_1_done, ...) ──

function normalizeProcedures_(rows) {
  return (rows || []).map(function(row) {
    row = row || {};
    // steps puede venir como array (desde frontend) o ya estar en columnas (desde Sheets)
    const steps = Array.isArray(row.steps) ? row.steps : [];
    const out = {
      id: row.id || Utilities.getUuid(),
      titulo: row.titulo || row.title || "",
      categoria: row.categoria || row.category || "",
      totalPasos: steps.length || Number(row.totalPasos || 0),
      creadoEn: row.creadoEn || row.createdAt || "",
      actualizadoEn: row.actualizadoEn || row.updatedAt || now_()
    };
    // Llenar columnas de pasos (G en adelante)
    for (var i = 1; i <= MAX_PASOS; i++) {
      var step = steps[i - 1];
      if (step) {
        out["paso_" + i]        = step.title       || step.paso_titulo  || row["paso_" + i]        || "";
        out["paso_" + i + "_desc"] = step.description || step.paso_descripcion || row["paso_" + i + "_desc"] || "";
        out["paso_" + i + "_done"] = (step.done === true || step.done === "SI" || step.paso_completado === "SI") ? "SI" : "NO";
      } else {
        // Preservar si ya venía en formato columna (ej. re-save desde Sheets sin steps array)
        out["paso_" + i]           = row["paso_" + i]           || "";
        out["paso_" + i + "_desc"] = row["paso_" + i + "_desc"] || "";
        out["paso_" + i + "_done"] = row["paso_" + i + "_done"] || "";
      }
    }
    return out;
  });
}

// Reconstruye objetos de procedimiento desde filas de Sheets (leyendo columnas paso_N)
function procedureRowsToObjects_(rows) {
  return (rows || []).map(function(row) {
    row = row || {};
    const steps = [];
    for (var i = 1; i <= MAX_PASOS; i++) {
      const titulo = String(row["paso_" + i] || "").trim();
      if (!titulo) continue;
      steps.push({
        id: "s" + i + "-" + (row.id || ""),
        title: titulo,
        description: String(row["paso_" + i + "_desc"] || ""),
        done: String(row["paso_" + i + "_done"] || "") === "SI"
      });
    }
    return {
      id: row.id || "",
      title: row.titulo || "",
      steps: steps
    };
  });
}

// ─── Meetings / History ──────────────────────────────────────────────────────

function meetingsObjectToRows_(obj) {
  if (!obj || typeof obj !== "object") return [];
  return Object.keys(obj).sort().map(function(date) {
    return {date: date, content: obj[date] || "", updatedAt: now_()};
  });
}

function meetingsRowsToObject_(rows) {
  const out = {};
  (rows || []).forEach(function(row) { if (row.date) out[row.date] = row.content || ""; });
  return out;
}

function appendHistory_(action, summary) {
  const sheet = getOrCreateSheet(SHEET_NAMES.history);
  ensureHeaders(sheet, HISTORY_HEADERS);
  sheet.appendRow([Utilities.getUuid(), now_(), action, summary || ""]);
  const last = sheet.getLastRow();
  if (last > 1001) sheet.deleteRows(2, last - 1001);
}

// ─── Google Calendar ─────────────────────────────────────────────────────────

function connectCalendarAction_(body) {
  const calendarId = String(body.calendarId || "primary").trim() || "primary";
  const events = Array.isArray(body.events) ? body.events : [];
  var synced = 0;
  events.forEach(function(event) {
    if (!event || !event.date) return;
    upsertCalendarEvent_(calendarId, event);
    synced++;
  });
  const appSettings = getJsonSheet(SHEET_NAMES.appSettings, {});
  appSettings.calendarId = calendarId;
  appSettings.calendarConnected = true;
  saveJsonSheet(SHEET_NAMES.appSettings, appSettings);
  return jsonResponse({ok: true, calendarId: calendarId, synced: synced, message: "Google Calendar conectado"});
}

function upsertCalendarAction_(body) {
  const calendarId = String(body.calendarId || "primary").trim() || "primary";
  if (!body.event) return jsonResponse({ok: false, error: "Falta el evento para Calendar"});
  const result = upsertCalendarEvent_(calendarId, body.event);
  return jsonResponse({ok: true, calendarId: calendarId, eventId: result.eventId, htmlLink: result.htmlLink, message: "Evento sincronizado"});
}

function upsertCalendarEvent_(calendarId, event) {
  const calendar = getCalendar_(calendarId);
  const bmId = String(event.id || event.clientId || Utilities.getUuid()).trim();
  const start = buildCalendarDate_(event.date, event.time || "09:00");
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const title = String(event.title || event.clientName || "Evento Biomarketing").trim();
  const description = buildCalendarDescription_(bmId, event);
  const existing = findCalendarEventByBmId_(calendar, start, bmId);
  if (existing) {
    existing.setTitle(title); existing.setTime(start, end); existing.setDescription(description);
    return {eventId: existing.getId(), htmlLink: ""};
  }
  const created = calendar.createEvent(title, start, end, {description: description});
  return {eventId: created.getId(), htmlLink: ""};
}

function getCalendar_(calendarId) {
  calendarId = String(calendarId || "primary").trim();
  if (!calendarId || calendarId === "primary") return CalendarApp.getDefaultCalendar();
  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) throw new Error("No se encontro el calendario: " + calendarId);
  return calendar;
}

function buildCalendarDate_(dateValue, timeValue) {
  const d = String(dateValue || "").trim();
  const t = String(timeValue || "09:00").trim() || "09:00";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) throw new Error("Fecha invalida para Calendar: " + d);
  const tm = t.match(/^(\d{1,2}):(\d{2})/);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), tm ? Number(tm[1]) : 9, tm ? Number(tm[2]) : 0, 0, 0);
}

function findCalendarEventByBmId_(calendar, startDate, bmId) {
  const from = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const to = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const marker = "BM_EVENT_ID:" + bmId;
  const events = calendar.getEvents(from, to, {search: marker});
  for (var i = 0; i < events.length; i++) {
    if (String(events[i].getDescription() || "").indexOf(marker) !== -1) return events[i];
  }
  return null;
}

function buildCalendarDescription_(bmId, event) {
  return [
    "BM_EVENT_ID:" + bmId,
    event.clientName ? "Cliente: " + event.clientName : "",
    event.clientId ? "Cliente ID: " + event.clientId : "",
    event.notes ? String(event.notes) : ""
  ].filter(Boolean).join("\n");
}
