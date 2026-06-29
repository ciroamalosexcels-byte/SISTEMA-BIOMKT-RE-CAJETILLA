# Mobile CRM — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una PWA mobile-first en `mobile-crm/` para carga rápida de prospectos conectada a la misma base Supabase del sistema desktop.

**Architecture:** HTML + CSS + JS vanilla sin build. Supabase JS v2 via CDN UMD. Web Speech API para voz local. Cuatro archivos JS separados por responsabilidad, cargados como scripts en orden en index.html.

**Tech Stack:** HTML5, CSS custom properties, vanilla JS ES5+, Supabase JS v2 (CDN), Web Speech API, PWA (manifest + service worker).

## Global Constraints

- Sin emojis en ningún elemento de UI
- Mismos design tokens que `src/app/globals.css`: `--dark` (#07152f), `--amber` (#f6bf26), `--bg` (#dbe1e7), `--card` (#fff)
- Dark mode: clase `dark-mode` en `<body>`
- Tipografía: `system-ui` (sin dependencias de red)
- Diseñado para 375px–430px de ancho
- `mobile-crm/js/config.js` va en `.gitignore`
- Tab keys exactos: `CRM`, `REUNION_1`, `REUNION_2`, `SEGUIMIENTO`
- Campo `empresaBio` default: `"BIOMARKETING"`
- Idioma de SpeechRecognition: `es-AR`

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `mobile-crm/index.html` | Shell HTML, SVG icons inline, script tags |
| `mobile-crm/css/style.css` | Design tokens, layout, componentes |
| `mobile-crm/js/config.js` | Credenciales Supabase (gitignoreado) |
| `mobile-crm/js/config.js.example` | Plantilla de config (commiteado) |
| `mobile-crm/js/supabase.js` | Init cliente + `fetchLeads` + `insertLead` |
| `mobile-crm/js/voice.js` | SpeechRecognition + `parseTranscript` |
| `mobile-crm/js/app.js` | Estado, rendering, event handlers |
| `mobile-crm/manifest.json` | PWA manifest |
| `mobile-crm/sw.js` | Service worker cache-first |

---

## Task 1: Scaffolding

**Files:**
- Create: `mobile-crm/` (directorio)
- Create: `mobile-crm/js/config.js.example`
- Modify: `.gitignore`

**Interfaces:**
- Produces: estructura de carpetas lista para los archivos siguientes

- [ ] **Step 1: Crear estructura de carpetas**

```bash
mkdir -p mobile-crm/css mobile-crm/js
```

- [ ] **Step 2: Crear config.js.example**

Contenido de `mobile-crm/js/config.js.example`:
```js
window.SUPABASE_URL = 'https://TU_PROJECT_ID.supabase.co';
window.SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI';
```

- [ ] **Step 3: Copiar config.js.example → config.js y rellenar con las credenciales reales del proyecto**

```bash
cp mobile-crm/js/config.js.example mobile-crm/js/config.js
```

Las credenciales se obtienen de: Supabase dashboard → Settings → API → Project URL y anon public key. Son las mismas que usa el sistema Next.js en `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

- [ ] **Step 4: Agregar config.js al .gitignore**

Al final del archivo `.gitignore` raíz agregar:
```
mobile-crm/js/config.js
```

- [ ] **Step 5: Commit**

```bash
git add mobile-crm/js/config.js.example .gitignore
git commit -m "feat(mobile-crm): scaffolding inicial y config"
```

---

## Task 2: CSS

**Files:**
- Create: `mobile-crm/css/style.css`

**Interfaces:**
- Produces: clases CSS usadas en index.html: `.header`, `.main`, `.bottom-nav`, `.nav-item`, `.nav-item.active`, `.fab`, `.fabs`, `.lead-card`, `.modal-overlay`, `.modal`, `.modal-form`, `.voice-overlay`, `.btn-submit`, `.loading`, `.empty`, `.hidden`

- [ ] **Step 1: Crear style.css**

Contenido completo de `mobile-crm/css/style.css`:
```css
/* ── Design tokens ──────────────────────────────────────── */
:root {
  --bg:        #dbe1e7;
  --card:      #fff;
  --text:      #0f172a;
  --dark:      #07152f;
  --dark-2:    #020817;
  --amber:     #f6bf26;
  --amber-2:   #ffe8a8;
  --amber-3:   #9a6700;
  --red:       #ef4444;
  --slate-50:  #f8fafc;
  --slate-100: #f1f5f9;
  --slate-200: #e2e8f0;
  --slate-300: #cbd5e1;
  --slate-400: #94a3b8;
  --slate-500: #64748b;
  --slate-700: #334155;
  --slate-800: #1e293b;
  --r-sm:  12px;
  --r-md:  16px;
  --r-lg:  22px;
  --r-xl:  28px;
  --shadow:    0 8px 24px rgba(15,23,42,.06);
  --shadow-sm: 0 2px 8px rgba(15,23,42,.05);
  --shadow-md: 0 8px 24px rgba(15,23,42,.08);
  --nav-h: 64px;
  --header-h: 52px;
}

body.dark-mode {
  --bg:   #020817;
  --card: #07152f;
  --text: #f8fafc;
  --slate-200: rgba(255,255,255,0.08);
  --slate-400: #94a3b8;
}

/* ── Reset ──────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 14px;
  background: var(--bg);
  color: var(--text);
  overscroll-behavior: none;
}

.hidden { display: none !important; }

/* ── Header ─────────────────────────────────────────────── */
.header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--header-h);
  background: var(--dark);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 100;
}

.header-title {
  color: var(--amber);
  font-size: 17px;
  font-weight: 800;
  letter-spacing: .5px;
}

.btn-dark-mode {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--slate-400);
  padding: 6px;
  display: flex;
  align-items: center;
  border-radius: 8px;
}
.btn-dark-mode:active { opacity: .7; }
.btn-dark-mode svg { width: 20px; height: 20px; }

/* ── Main content ───────────────────────────────────────── */
.main {
  position: fixed;
  top: var(--header-h);
  bottom: var(--nav-h);
  left: 0; right: 0;
  overflow-y: auto;
  padding: 12px 12px 80px;
  -webkit-overflow-scrolling: touch;
}

.loading, .empty {
  text-align: center;
  color: var(--slate-400);
  padding: 40px 16px;
  font-size: 13px;
}

/* ── Lead card ──────────────────────────────────────────── */
.lead-card {
  background: var(--card);
  border-radius: var(--r-md);
  padding: 14px 16px;
  margin-bottom: 10px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--slate-200);
  cursor: pointer;
  transition: box-shadow .15s;
}
.lead-card:active { box-shadow: none; opacity: .9; }

.lead-name {
  font-weight: 700;
  font-size: 15px;
  color: var(--text);
  margin-bottom: 3px;
}
.lead-meta {
  font-size: 12px;
  color: var(--slate-500);
  margin-bottom: 2px;
}
.lead-date {
  font-size: 11px;
  color: var(--slate-400);
  margin-top: 4px;
}

/* ── FABs ───────────────────────────────────────────────── */
.fabs {
  position: fixed;
  bottom: calc(var(--nav-h) + 16px);
  right: 16px;
  display: flex;
  gap: 12px;
  z-index: 90;
}

.fab {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--amber);
  color: var(--dark);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(246,191,38,.4);
  transition: transform .1s, box-shadow .1s;
}
.fab:active { transform: scale(.94); box-shadow: 0 2px 8px rgba(246,191,38,.3); }
.fab svg { width: 22px; height: 22px; }

.fab.recording {
  background: var(--red);
  color: #fff;
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,.4); }
  50% { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
}

/* ── Bottom navigation ──────────────────────────────────── */
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: var(--nav-h);
  background: var(--card);
  border-top: 1px solid var(--slate-200);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  z-index: 100;
  box-shadow: 0 -4px 16px rgba(15,23,42,.06);
}

.nav-item {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--slate-400);
  font-size: 10px;
  font-weight: 600;
  padding: 6px 2px;
  transition: color .15s;
  position: relative;
}
.nav-item.active { color: var(--amber); }
.nav-item svg { width: 22px; height: 22px; flex-shrink: 0; }

.nav-icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
}
.nav-badge {
  position: absolute;
  top: -4px;
  right: -6px;
  background: var(--amber);
  color: var(--dark);
  border-radius: 50%;
  width: 14px;
  height: 14px;
  font-size: 9px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.nav-item.active .nav-badge { background: var(--amber-3); color: #fff; }

/* ── Modal ──────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2,8,23,.6);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  padding: 0;
}

.modal {
  background: var(--card);
  border-radius: var(--r-xl) var(--r-xl) 0 0;
  width: 100%;
  max-height: 92vh;
  overflow-y: auto;
  padding: 20px 16px 32px;
  -webkit-overflow-scrolling: touch;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
}

.modal-close {
  background: var(--slate-100);
  border: none;
  border-radius: 50%;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--slate-500);
}
.modal-close svg { width: 16px; height: 16px; }

.form-group {
  margin-bottom: 14px;
}
.form-group label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--slate-500);
  text-transform: uppercase;
  letter-spacing: .4px;
  margin-bottom: 5px;
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--slate-200);
  border-radius: var(--r-md);
  padding: 10px 12px;
  font-size: 15px;
  color: var(--text);
  font-family: inherit;
  outline: none;
  transition: border-color .15s;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: var(--amber);
}
.form-group textarea { resize: vertical; min-height: 80px; }

.btn-submit {
  width: 100%;
  background: var(--amber);
  color: var(--dark);
  border: none;
  border-radius: var(--r-md);
  padding: 14px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  margin-top: 8px;
  transition: opacity .15s;
}
.btn-submit:active { opacity: .85; }
.btn-submit:disabled { opacity: .5; cursor: not-allowed; }

/* ── Voice overlay ──────────────────────────────────────── */
.voice-overlay {
  position: fixed;
  inset: 0;
  background: var(--dark);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.voice-content {
  text-align: center;
  width: 100%;
  max-width: 320px;
}

.voice-indicator {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--amber);
  margin: 0 auto 24px;
  animation: pulse-voice 1s infinite;
}
@keyframes pulse-voice {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: .8; }
}

.voice-hint {
  color: var(--slate-400);
  font-size: 13px;
  margin-bottom: 20px;
  line-height: 1.6;
}

.voice-transcript {
  color: var(--slate-50);
  font-size: 16px;
  min-height: 60px;
  margin-bottom: 28px;
  line-height: 1.5;
}

.btn-stop-voice {
  background: none;
  border: 2px solid var(--slate-700);
  border-radius: var(--r-md);
  padding: 10px 28px;
  color: var(--slate-400);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.btn-stop-voice:active { opacity: .7; }
```

- [ ] **Step 2: Verificar manualmente**

Abrir `mobile-crm/index.html` en el navegador (todavía no existe, este paso se verifica en Task 3). Marcar como hecho una vez que los estilos se vean correctos.

- [ ] **Step 3: Commit**

```bash
git add mobile-crm/css/style.css
git commit -m "feat(mobile-crm): estilos completos con design tokens"
```

---

## Task 3: HTML shell

**Files:**
- Create: `mobile-crm/index.html`

**Interfaces:**
- Consumes: `mobile-crm/css/style.css`, scripts en orden: CDN Supabase → `config.js` → `supabase.js` → `voice.js` → `app.js`
- Produces: IDs usados por app.js: `btnDarkMode`, `main`, `fabVoice`, `fabManual`, `modalOverlay`, `modalClose`, `leadForm`, `fNombre`, `fEmpresa`, `fTelefono`, `fMedio`, `fDireccion`, `fObservaciones`, `fTab`, `voiceOverlay`, `voiceTranscript`, `btnStopVoice`; clases: `.nav-item[data-tab]`

- [ ] **Step 1: Crear index.html**

Contenido completo de `mobile-crm/index.html`:
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#07152f">
  <title>BIOMKT CRM</title>
  <link rel="manifest" href="manifest.json">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>

<!-- Header -->
<header class="header">
  <span class="header-title">BIOMKT CRM</span>
  <button class="btn-dark-mode" id="btnDarkMode" aria-label="Cambiar modo">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  </button>
</header>

<!-- Main content -->
<main class="main" id="main">
  <div class="loading">Cargando...</div>
</main>

<!-- FABs -->
<div class="fabs">
  <button class="fab" id="fabVoice" aria-label="Carga por voz">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="8" y1="22" x2="16" y2="22"/>
    </svg>
  </button>
  <button class="fab" id="fabManual" aria-label="Carga manual">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  </button>
</div>

<!-- Bottom navigation -->
<nav class="bottom-nav">
  <button class="nav-item active" data-tab="CRM">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
    <span>Prospecto</span>
  </button>
  <button class="nav-item" data-tab="REUNION_1">
    <span class="nav-icon-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="7" r="3"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <circle cx="17" cy="7" r="3"/><path d="M21 21v-2a4 4 0 0 0-2-3.5"/>
      </svg>
      <span class="nav-badge">1</span>
    </span>
    <span>Reunión 1</span>
  </button>
  <button class="nav-item" data-tab="REUNION_2">
    <span class="nav-icon-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="7" r="3"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <circle cx="17" cy="7" r="3"/><path d="M21 21v-2a4 4 0 0 0-2-3.5"/>
      </svg>
      <span class="nav-badge">2</span>
    </span>
    <span>Reunión 2</span>
  </button>
  <button class="nav-item" data-tab="SEGUIMIENTO">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
    <span>Seguimiento</span>
  </button>
</nav>

<!-- Modal: nuevo lead -->
<div class="modal-overlay hidden" id="modalOverlay">
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">Nuevo registro</h2>
      <button class="modal-close" id="modalClose" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <form id="leadForm">
      <div class="form-group">
        <label for="fNombre">Nombre *</label>
        <input type="text" id="fNombre" autocomplete="off" required>
      </div>
      <div class="form-group">
        <label for="fEmpresa">Empresa *</label>
        <input type="text" id="fEmpresa" autocomplete="off" required>
      </div>
      <div class="form-group">
        <label for="fTelefono">Teléfono</label>
        <input type="tel" id="fTelefono" inputmode="tel">
      </div>
      <div class="form-group">
        <label for="fMedio">Medio</label>
        <select id="fMedio">
          <option value="">— seleccionar —</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="LLAMADA">Llamada</option>
          <option value="PRESENCIAL">Presencial</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="MAIL">Mail</option>
        </select>
      </div>
      <div class="form-group">
        <label for="fDireccion">Dirección</label>
        <input type="text" id="fDireccion" autocomplete="off">
      </div>
      <div class="form-group">
        <label for="fObservaciones">Observaciones</label>
        <textarea id="fObservaciones" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label for="fTab">Sección destino</label>
        <select id="fTab">
          <option value="CRM">Prospecto</option>
          <option value="REUNION_1">Reunión 1</option>
          <option value="REUNION_2">Reunión 2</option>
          <option value="SEGUIMIENTO">Seguimiento</option>
        </select>
      </div>
      <button type="submit" class="btn-submit">Guardar</button>
    </form>
  </div>
</div>

<!-- Voice overlay -->
<div class="voice-overlay hidden" id="voiceOverlay">
  <div class="voice-content">
    <div class="voice-indicator"></div>
    <p class="voice-hint">nombre · empresa · teléfono · dirección · observaciones</p>
    <p class="voice-transcript" id="voiceTranscript"></p>
    <button class="btn-stop-voice" id="btnStopVoice">Detener</button>
  </div>
</div>

<!-- Scripts: orden importante -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="js/config.js"></script>
<script src="js/supabase.js"></script>
<script src="js/voice.js"></script>
<script src="js/app.js"></script>

</body>
</html>
```

- [ ] **Step 2: Abrir en navegador y verificar**

Abrir `mobile-crm/index.html` directamente en Chrome (doble clic o arrastrar). Verificar:
- Header negro con texto amber
- Bottom nav con los 4 iconos
- FABs amber en esquina inferior derecha
- No aparecen errores en consola relacionados con el HTML/CSS (habrá errores de JS porque los scripts JS aún no existen)

- [ ] **Step 3: Commit**

```bash
git add mobile-crm/index.html
git commit -m "feat(mobile-crm): HTML shell con layout, iconos SVG y estructura completa"
```

---

## Task 4: Capa Supabase

**Files:**
- Create: `mobile-crm/js/supabase.js`

**Interfaces:**
- Consumes: `window.supabase` (CDN), `window.SUPABASE_URL`, `window.SUPABASE_ANON_KEY` (de config.js)
- Produces: `window.db` (SupabaseClient), `window.fetchLeads(tab: string): Promise<Lead[]>`, `window.insertLead(lead: object): Promise<Lead>`

- [ ] **Step 1: Crear supabase.js**

Contenido completo de `mobile-crm/js/supabase.js`:
```js
(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('[BIOMKT] Falta config.js con SUPABASE_URL y SUPABASE_ANON_KEY');
    return;
  }

  var client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  window.db = client;

  window.fetchLeads = async function (tab) {
    var result = await client
      .from('leads')
      .select('id, nombre, empresa, telefono, fechaContacto, medio, observaciones, direccion, responsable1, tab')
      .eq('tab', tab)
      .order('fechaContacto', { ascending: false });
    if (result.error) throw result.error;
    return result.data || [];
  };

  window.insertLead = async function (lead) {
    var result = await client
      .from('leads')
      .insert([lead])
      .select()
      .single();
    if (result.error) throw result.error;
    return result.data;
  };
})();
```

- [ ] **Step 2: Verificar en consola del navegador**

Abrir `mobile-crm/index.html` en Chrome. En DevTools → Console ejecutar:
```js
window.fetchLeads('CRM').then(d => console.log(d)).catch(e => console.error(e))
```
Resultado esperado: array de objetos lead (puede estar vacío si no hay datos) sin errores.

- [ ] **Step 3: Commit**

```bash
git add mobile-crm/js/supabase.js
git commit -m "feat(mobile-crm): capa Supabase con fetchLeads e insertLead"
```

---

## Task 5: Parseador de voz

**Files:**
- Create: `mobile-crm/js/voice.js`

**Interfaces:**
- Produces: `window.startVoice(onResult: (parsed: object) => void, onTranscript: (text: string) => void): SpeechRecognition|null`
- Produces: `window.parseTranscript(text: string): {nombre: string, empresa: string, telefono: string, direccion: string, observaciones: string}`

- [ ] **Step 1: Crear voice.js**

Contenido completo de `mobile-crm/js/voice.js`:
```js
(function () {
  var KEYWORDS = {
    nombre:       ['nombre'],
    empresa:      ['empresa'],
    telefono:     ['telefono', 'teléfono', 'tel', 'número', 'numero', 'celular'],
    direccion:    ['dirección', 'direccion'],
    observaciones:['observaciones', 'observacion', 'nota', 'notas']
  };

  var allKeys = [];
  Object.keys(KEYWORDS).forEach(function (f) {
    KEYWORDS[f].forEach(function (k) { allKeys.push(k); });
  });

  var KEY_PATTERN = new RegExp('\\b(' + allKeys.join('|') + ')\\b', 'gi');

  function fieldForKeyword(kw) {
    var lower = kw.toLowerCase();
    var fields = Object.keys(KEYWORDS);
    for (var i = 0; i < fields.length; i++) {
      if (KEYWORDS[fields[i]].indexOf(lower) !== -1) return fields[i];
    }
    return null;
  }

  window.parseTranscript = function (text) {
    var result = { nombre: '', empresa: '', telefono: '', direccion: '', observaciones: '' };
    var parts = text.split(KEY_PATTERN);
    var currentField = 'observaciones';

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) continue;
      var field = fieldForKeyword(part);
      if (field) {
        currentField = field;
      } else {
        result[currentField] = (result[currentField] + ' ' + part).trim();
      }
    }

    // Fallback: detectar teléfono por regex si no se capturó por keyword
    if (!result.telefono) {
      var m = text.match(/\b\d[\d\s\-]{6,}\b/);
      if (m) result.telefono = m[0].replace(/[\s\-]/g, '');
    }

    return result;
  };

  window.startVoice = function (onResult, onTranscript) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Reconocimiento de voz no disponible. Usá Chrome en Android.');
      return null;
    }

    var recognition = new SR();
    recognition.lang = 'es-AR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    var finalTranscript = '';

    recognition.onresult = function (e) {
      var interim = '';
      finalTranscript = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      if (onTranscript) onTranscript(finalTranscript || interim);
    };

    recognition.onend = function () {
      if (finalTranscript && onResult) {
        onResult(window.parseTranscript(finalTranscript));
      }
    };

    recognition.onerror = function (e) {
      console.error('[BIOMKT voice]', e.error);
    };

    recognition.start();
    return recognition;
  };
})();
```

- [ ] **Step 2: Verificar parseador en consola**

En DevTools → Console:
```js
window.parseTranscript('nombre Juan García empresa Panadería Sol teléfono 11 1234 5678 observaciones interesado en plan básico')
```
Resultado esperado:
```js
{ nombre: 'Juan García', empresa: 'Panadería Sol', telefono: '1112345678', direccion: '', observaciones: 'interesado en plan básico' }
```

- [ ] **Step 3: Commit**

```bash
git add mobile-crm/js/voice.js
git commit -m "feat(mobile-crm): Web Speech API con parseador de keywords en español"
```

---

## Task 6: Lógica de app

**Files:**
- Create: `mobile-crm/js/app.js`

**Interfaces:**
- Consumes: `window.fetchLeads`, `window.insertLead`, `window.startVoice`, IDs del DOM definidos en Task 3
- Produces: app funcional completa

- [ ] **Step 1: Crear app.js**

Contenido completo de `mobile-crm/js/app.js`:
```js
(function () {
  var state = {
    currentTab: 'CRM',
    leads: [],
    loading: false,
    recognition: null
  };

  function todayISO() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  }

  function generateId() {
    return (crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
  }

  // ── Dark mode ───────────────────────────────────────────
  var btnDark = document.getElementById('btnDarkMode');
  if (localStorage.getItem('biomkt_crm_dark') === 'true') {
    document.body.classList.add('dark-mode');
  }
  btnDark.addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('biomkt_crm_dark', document.body.classList.contains('dark-mode') ? 'true' : 'false');
  });

  // ── Tab navigation ──────────────────────────────────────
  document.querySelectorAll('.nav-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.currentTab = btn.dataset.tab;
      document.querySelectorAll('.nav-item').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      loadLeads();
    });
  });

  // ── Load leads ──────────────────────────────────────────
  function loadLeads() {
    state.loading = true;
    renderMain();
    window.fetchLeads(state.currentTab).then(function (data) {
      state.leads = data;
      state.loading = false;
      renderMain();
    }).catch(function (err) {
      state.leads = [];
      state.loading = false;
      renderMain();
      console.error('[BIOMKT]', err);
    });
  }

  function formatDate(iso) {
    if (!iso) return '';
    var parts = iso.split('-');
    if (parts.length < 3) return iso;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function renderMain() {
    var main = document.getElementById('main');
    if (state.loading) {
      main.innerHTML = '<div class="loading">Cargando...</div>';
      return;
    }
    if (!state.leads.length) {
      main.innerHTML = '<div class="empty">Sin registros en esta sección</div>';
      return;
    }
    main.innerHTML = state.leads.map(function (lead) {
      return '<div class="lead-card">' +
        '<div class="lead-name">' + escHtml(lead.nombre || '') + '</div>' +
        '<div class="lead-meta">' + escHtml(lead.empresa || '—') + '</div>' +
        (lead.telefono ? '<div class="lead-meta">' + escHtml(lead.telefono) + (lead.medio ? ' · ' + lead.medio : '') + '</div>' : '') +
        '<div class="lead-date">' + formatDate(lead.fechaContacto) + '</div>' +
        '</div>';
    }).join('');
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Modal ───────────────────────────────────────────────
  var overlay    = document.getElementById('modalOverlay');
  var form       = document.getElementById('leadForm');
  var submitBtn  = form.querySelector('.btn-submit');

  document.getElementById('modalClose').addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

  function openModal(prefill) {
    prefill = prefill || {};
    document.getElementById('fNombre').value       = prefill.nombre        || '';
    document.getElementById('fEmpresa').value      = prefill.empresa       || '';
    document.getElementById('fTelefono').value     = prefill.telefono      || '';
    document.getElementById('fMedio').value        = prefill.medio         || '';
    document.getElementById('fDireccion').value    = prefill.direccion     || '';
    document.getElementById('fObservaciones').value= prefill.observaciones || '';
    document.getElementById('fTab').value          = state.currentTab;
    overlay.classList.remove('hidden');
    document.getElementById('fNombre').focus();
  }

  function closeModal() {
    overlay.classList.add('hidden');
    form.reset();
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    var lead = {
      id:           generateId(),
      nombre:       document.getElementById('fNombre').value.trim(),
      empresa:      document.getElementById('fEmpresa').value.trim(),
      telefono:     document.getElementById('fTelefono').value.trim(),
      medio:        document.getElementById('fMedio').value,
      direccion:    document.getElementById('fDireccion').value.trim(),
      observaciones:document.getElementById('fObservaciones').value.trim(),
      tab:          document.getElementById('fTab').value,
      fechaContacto:todayISO(),
      responsable1: '',
      responsable2: '',
      empresaBio:   'BIOMARKETING'
    };

    window.insertLead(lead).then(function () {
      closeModal();
      if (lead.tab === state.currentTab) loadLeads();
    }).catch(function (err) {
      alert('Error al guardar: ' + (err.message || JSON.stringify(err)));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar';
    });
  });

  // ── FAB manual ──────────────────────────────────────────
  document.getElementById('fabManual').addEventListener('click', function () {
    openModal();
  });

  // ── FAB voz ─────────────────────────────────────────────
  var voiceOverlay     = document.getElementById('voiceOverlay');
  var voiceTranscript  = document.getElementById('voiceTranscript');
  var fabVoice         = document.getElementById('fabVoice');

  document.getElementById('btnStopVoice').addEventListener('click', stopVoice);

  function stopVoice() {
    if (state.recognition) {
      state.recognition.stop();
      state.recognition = null;
    }
    fabVoice.classList.remove('recording');
    voiceOverlay.classList.add('hidden');
    voiceTranscript.textContent = '';
  }

  fabVoice.addEventListener('click', function () {
    voiceOverlay.classList.remove('hidden');
    voiceTranscript.textContent = '';
    fabVoice.classList.add('recording');

    state.recognition = window.startVoice(
      function onResult(parsed) {
        stopVoice();
        openModal(parsed);
      },
      function onTranscript(text) {
        voiceTranscript.textContent = text;
      }
    );
  });

  // ── Init ────────────────────────────────────────────────
  loadLeads();
})();
```

- [ ] **Step 2: Verificar flujo completo en el navegador**

1. Abrir `mobile-crm/index.html` en Chrome
2. Verificar que la lista de leads del tab "Prospecto" carga desde Supabase
3. Tocar FAB lápiz → verificar que el modal se abre con el formulario
4. Completar nombre + empresa + guardar → verificar que aparece en la lista
5. Cambiar de tab → verificar que la lista se actualiza
6. Verificar dark mode toggle

- [ ] **Step 3: Commit**

```bash
git add mobile-crm/js/app.js
git commit -m "feat(mobile-crm): lógica completa de app, modal, voz y navegación"
```

---

## Task 7: PWA (manifest + service worker)

**Files:**
- Create: `mobile-crm/manifest.json`
- Create: `mobile-crm/sw.js`

**Interfaces:**
- Consumes: `<link rel="manifest">` ya en index.html (Task 3)
- Produces: app instalable en pantalla de inicio de Android via Chrome

- [ ] **Step 1: Crear manifest.json**

Contenido completo de `mobile-crm/manifest.json`:
```json
{
  "name": "BIOMKT CRM",
  "short_name": "BIOMKT",
  "description": "Carga rápida de prospectos Biomarketing",
  "start_url": "./index.html",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#07152f",
  "theme_color": "#07152f",
  "icons": [
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' rx='32' fill='%2307152f'/><text y='130' x='96' text-anchor='middle' font-size='100' font-family='system-ui' font-weight='900' fill='%23f6bf26'>B</text></svg>",
      "sizes": "192x192",
      "type": "image/svg+xml"
    }
  ]
}
```

- [ ] **Step 2: Crear sw.js**

Contenido completo de `mobile-crm/sw.js`:
```js
var CACHE = 'biomkt-crm-v1';
var ASSETS = [
  './index.html',
  './css/style.css',
  './js/supabase.js',
  './js/voice.js',
  './js/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  // Supabase requests: siempre network
  if (e.request.url.indexOf('supabase.co') !== -1 || e.request.url.indexOf('cdn.jsdelivr.net') !== -1) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Assets: cache-first
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request);
    })
  );
});
```

- [ ] **Step 3: Registrar service worker en app.js**

Al final del IIFE en `mobile-crm/js/app.js`, antes del `loadLeads()`, agregar:
```js
  // Service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function (err) {
      console.warn('[BIOMKT sw]', err);
    });
  }
```

- [ ] **Step 4: Verificar PWA en Chrome DevTools**

1. Abrir `mobile-crm/index.html` via servidor local (necesario para SW):
   ```bash
   cd mobile-crm && npx serve .
   ```
   O con Python: `python -m http.server 8080` desde `mobile-crm/`
2. Abrir `http://localhost:8080` en Chrome
3. DevTools → Application → Manifest: verificar que aparece nombre, colores, íconos
4. DevTools → Application → Service Workers: verificar "Status: activated and is running"
5. En Chrome mobile (via LAN o ngrok): verificar banner "Agregar a pantalla de inicio"

- [ ] **Step 5: Commit final**

```bash
git add mobile-crm/manifest.json mobile-crm/sw.js mobile-crm/js/app.js
git commit -m "feat(mobile-crm): PWA completa con manifest y service worker"
```

---

## Self-review del plan

**Cobertura del spec:**
- Header con dark mode toggle — Task 3 + Task 6
- Bottom nav con 4 tabs e iconos SVG — Task 3
- Badges "1" y "2" en Reunión 1 y 2 — Task 3 (`.nav-badge`)
- FAB lápiz + micrófono — Task 3 + Task 6
- Lista de leads por tab desde Supabase — Task 4 + Task 6
- Modal de carga manual — Task 3 + Task 6
- Flujo de voz con Web Speech API — Task 5 + Task 6
- Parseador de keywords en español — Task 5
- Design tokens idénticos al sistema — Task 2
- Dark mode persistido en localStorage — Task 6
- Gitignore de config.js — Task 1
- PWA instalable — Task 7

**Sin placeholders:** ningún TBD ni TODO en el plan.

**Consistencia de tipos:**
- `window.fetchLeads(tab)` definido en Task 4, consumido en Task 6
- `window.insertLead(lead)` definido en Task 4, consumido en Task 6
- `window.startVoice(onResult, onTranscript)` definido en Task 5, consumido en Task 6
- `window.parseTranscript(text)` definido en Task 5 (verificación manual en Task 5, Step 2)
- IDs del DOM definidos en Task 3, consumidos en Task 6
