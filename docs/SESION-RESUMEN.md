# Resumen de sesión — Sistema Biomarketing

---

## 1. Objetivo principal de la sesión

Migrar, rediseñar y mejorar el sistema interno de gestión de Biomarketing (agencia de marketing argentina) de un monolito HTML a una app Next.js 15 completamente funcional, con sidebar unificado, Kanban de leads, dashboard con ApexCharts, tablas shadcn, y corrección de bugs críticos de sincronización con Google Sheets.

---

## 2. Contexto importante

### El proyecto
- **Nombre:** Sistema Biomarketing / RE Cajetilla
- **Repo:** `C:\Users\dell\Documents\github\SISTEMA-BIOMKT-RE-CAJETILLA`
- **GitHub:** `https://github.com/ciroamalosexcels-byte/SISTEMA-BIOMKT-RE-CAJETILLA`
- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Estilos:** Tailwind CSS v4 + CSS custom en `globals.css` (migración en curso)
- **Estado global:** Zustand (leads, team, pipeline, settings, content, plans)
- **Backend:** Google Sheets via Apps Script (`Codigo.gs`) — es la única base de datos
- **Font principal:** Poppins (variable `--font-poppins`)
- **Colores brand:** amber `#f6bf26`, bio-dark `#07152f`, bio-rail `#020817`, bio-bg `#dbe1e7`
- **Dev server:** `http://localhost:3000` (puede variar a 3001/3002 si hay conflictos)

### Estructura del proyecto
```
src/
├── app/
│   ├── dashboard/page.tsx → DashboardView
│   ├── seguimiento/page.tsx → SeguimientoView (Kanban de Leads)
│   ├── clientes/ (+ /dashboard)
│   ├── equipo/ (+ /dashboard)
│   ├── general/page.tsx → Dashboard General (nuevo)
│   └── ...otras rutas
├── components/
│   ├── layout/sidebar.tsx → sidebar unificado colapsable
│   ├── layout/app-shell.tsx → layout principal
│   ├── dashboard/dashboard-view.tsx → ApexCharts + shadcn tables
│   ├── seguimiento/ → Kanban (column, card, modal, view)
│   └── ui/ → table.tsx (shadcn), apex-chart.tsx, etc.
├── store/ → leads.ts, pipeline.ts, team.ts, app-settings.ts, etc.
├── lib/ → dates.ts, sheets.ts, constants.ts, utils.ts
└── types/ → lead.ts, pipeline.ts, etc.
```

### Modelo de datos clave
- **Lead:** campos `tab` (etapa del pipeline), `fechaContacto`, `medio`, `nombre`, `empresa`, etc.
- **PipelineStage:** `{ id, label, color, order, isWon? }` — almacenado en localStorage `v2`
- **Etapas por defecto:** CRM=Prospecto(rojo), REUNION_1(naranja), REUNION_2(amarillo), SEGUIMIENTO(azul), CLIENTES=Cliente✓(verde)
- **Workspaces:** `ventas | clientes | equipo`

### Mapeo Sheets ↔ Frontend (crítico)
- La columna "etapa" en Sheets = campo `tab` en el frontend (son el mismo dato)
- Al leer de Sheets: `r.tab = r.tab || r.etapa || "CRM"` (app-shell.tsx línea ~107)
- Al guardar en Sheets (Codigo.gs): `etapa: row.etapa || row.tab || "CRM"`

---

## 3. Decisiones tomadas

### Arquitectura / Navegación
- **Sidebar unificado:** una sola barra que se expande (220px) / colapsa (52px). No hay rail separado. El logo B es el toggle.
- **Estructura del sidebar:** Logo/toggle → Dashboard General → Ventas/Clientes/Equipo (accordion) → Utilidades (guardar, sync, notif, config)
- **Dashboard General** en `/general` como vista transversal de las 3 áreas (aún placeholder)
- **Workspaces como menú padre** en el panel, con links como submenu
- **Icono guardar:** disquete (`FloppyIcon`) con check cuando está guardado (`FloppyCheckIcon`)
- **Modo noche y Sincronizar** dentro del menú ⚙️ (settings popup con backdrop)

### Kanban / Seguimiento
- **Nombre de la pestaña:** "LEADS" (no "Seguimiento")
- **5 columnas a ancho completo** (`flex-1`), sin botón "Nueva etapa"
- **Headers de columna:** fondo `#07152f` (negro navy), letras blancas
- **Cards con altura fija** `h-[118px]`, empresa arriba (bold), nombre abajo (gris)
- **Divisores de fecha** entre grupos de cards (Hoy / Ayer / DD/MM/AAAA)
- **Badge de medio siempre visible** con `mt-auto` en la tarjeta
- **Colores de medio:** WhatsApp=verde, Llamada=naranja, Instagram=rojo, Mail=azul, Presencial=amarillo
- **Prompt de fecha** al mover card a Reunión 1 o Reunión 2 (mini-modal)

### Dashboard
- **ApexCharts** para todos los gráficos (SSR-safe via dynamic import)
- **Reporte Diario:** barras distribuidas coloreadas por % de objetivo (rojo/amarillo/verde/lima)
- **Eje Y mínimo:** 10 por defecto
- **Secciones eliminadas:** TABLA AÑO y TABLA MES (se eliminaron del layout)
- **Headers de gráficos:** fondo `#111827` (negro), letras blancas, esquinas redondeadas 18px
- **shadcn Table** en lugar de tabla CSS custom

### Diseño general
- **Sin border-radius** en tablas y dashcard (redondeado solo en cards: 18px)
- **Fuente:** Poppins para todo, JetBrains Mono para labels de tabla (luego removido)
- **Headers de páginas:** mismo estilo que el Calendario (`bio-page-head`, `bio-page-title`, `bio-page-subtitle`)
- **Colores de etapas Kanban:** rojo, naranja, amarillo, azul, verde
- **Storage key de pipeline:** `v2` (bumpeado para resetear colores)

### Lead Modal
- **Estructura de campos:** Empresa → Nombre → Dirección → Teléfono → Observaciones → Responsable1 + Responsable2 → Medio + Empresa Bio → Fechas
- **Placeholders eliminados** de todos los inputs
- **Select de Medio** tiene `— Sin medio —` como primera opción (para que el valor vacío sea explícito)
- **Fechas con display formateado:** muestran `DD/MM/YYYY HH:MM` o `--/--/---- --:--` si vacío

---

## 4. Problemas resueltos

### Bug crítico — fechas seriales de Excel (498 leads afectados)
- **Problema:** El 86% de los leads tenían `fechaContacto` como número serial de Excel (`46168`) en lugar de ISO string, causando que no se contabilizaran en el dashboard.
- **Causa:** Google Sheets guarda fechas como números internamente; al exportar/importar, el formato se pierde.
- **Fix aplicado:**
  1. `src/lib/dates.ts`: `normalizeISODate()` ahora convierte seriales (40000–70000) a ISO
  2. `src/store/leads.ts`: `load()` normaliza toda `fechaContacto` que no sea ISO
  3. `src/components/layout/app-shell.tsx`: normaliza al leer de Sheets
  4. `Codigo.gs`: nueva función `normalizeSheetDate_()` que convierte al guardar
- **PENDIENTE:** Copiar `Codigo.gs` actualizado al editor de Apps Script en Google

### Bug — etapa (tab) vs etapa (Sheets)
- **Problema:** Frontend usa campo `tab`, Sheets usa columna `etapa`. El normalizer de Sheets hacía `row.etapa || "CRM"` ignorando `row.tab`.
- **Fix:** `Codigo.gs` normalizeLeadRows_ ahora hace `row.etapa || row.tab || "CRM"`. App-shell mapea al leer.

### Bug — badge de medio no aparecía
- **Problema 1:** El select de Medio sin `—` mostraba el primer valor visualmente aunque `form.medio = ""`, creando confusión.
- **Problema 2:** `overflow-hidden` + `maxHeight` cortaban el badge.
- **Fix:** Opción `— Sin medio —` en select. Badge usa `mt-auto` sin maxHeight.

### Bug — modo light no funcionaba
- CSS del kanban tenía colores hardcodeados oscuros. Migrado a light-first con dark overrides.

### Bug — caché corrupta de webpack
- Resuelto con `rm -rf .next` cuando nuevos paquetes causan chunk errors.

---

## 5. Estado actual

### Lo que está funcionando
- ✅ Sidebar colapsable unificado con workspaces accordion
- ✅ Kanban de Leads con 5 columnas a ancho completo, divisores de fecha, badges de medio
- ✅ Lead modal reorganizado con prompt de fecha de reunión
- ✅ Dashboard con ApexCharts (KPI cards, área, barras, reporte diario)
- ✅ Headers de páginas estilo calendario en todas las vistas
- ✅ Corrección de fechas seriales en el frontend (se aplica al recargar)
- ✅ Google Sheets listo para recibir el Codigo.gs actualizado

### Migración Tailwind
- ✅ Migraciones completadas: sidebar, app-shell, kanban, lead modal, dashboard
- ⏳ Pendientes: Equipo, Clientes, Planificación (usan CSS legacy que funciona pero no es Tailwind)
- `globals.css` bajó de 2525 → ~1500 líneas

### Dev server
- Corre en `localhost:3000` (o 3001/3002 si hay conflictos)
- Si hay error de chunk, hacer `rm -rf .next` y reiniciar

---

## 6. Próximos pasos recomendados

1. **URGENTE — Actualizar Codigo.gs en Google:**
   - Abrir `C:\Users\dell\Documents\github\SISTEMA-BIOMKT-RE-CAJETILLA\Codigo.gs`
   - Copiar todo el contenido
   - En Google Sheets → Extensiones → Apps Script → pegar y guardar → Implementar
   - Luego hacer una sincronización para corregir las fechas en Sheets

2. **Verificar datos de leads:**
   - Después de actualizar el script, abrir la app y sincronizar
   - Verificar que el dashboard muestra los contactos con sus fechas reales
   - Verificar que las etapas de los leads están correctas en la columna `etapa` de Sheets

3. **Dashboard General `/general`:**
   - Actualmente solo tiene placeholders
   - Decidir qué métricas mostrar de cada área

4. **Continuar migración Tailwind:**
   - Siguientes módulos: `equipo-view.tsx`, `clientes-view.tsx`, `planificacion-view.tsx`
   - Plan: `docs/superpowers/plans/2026-05-28-tailwind-migration.md`

5. **Vistas pendientes de mejora:**
   - Dashboard de Clientes (`/clientes/dashboard`) — placeholder
   - Dashboard de Equipo (`/equipo/dashboard`) — placeholder

---

## 7. Instrucciones para la próxima IA

### Stack técnico
```
Next.js 15 App Router | React 19 | TypeScript | Tailwind v4 | Zustand | ApexCharts | dnd-kit
```

### Reglas de trabajo del proyecto
1. **Idioma:** Responder siempre en español
2. **CSS:** Preferir Tailwind. El CSS legacy en `globals.css` se va eliminando progresivamente
3. **Dark mode:** Se activa con clase `dark-mode` en `body` (NO con `prefers-color-scheme`). Tailwind configurado con `darkMode: ["selector", ".dark-mode"]` en `tailwind.config.ts`
4. **Fechas:** Usar siempre `todayBA()`, `nowDatetimeBA()` de `src/lib/dates.ts`. Nunca `new Date()` directo
5. **Sheets:** `Content-Type: text/plain;charset=utf-8` con JSON string en body (NO `application/json`)
6. **Sheets campo tab vs etapa:** frontend usa `tab`, Sheets usa `etapa`. Ya mapeado en app-shell y Codigo.gs
7. **Pipeline stages:** guardadas en localStorage `ventas_biomarketing_pipeline_stages_v2`
8. **No romper:** Las vistas que aún usan CSS legacy (equipo, clientes, planificación) funcionan — no tocar sin plan

### Archivos clave a conocer
| Archivo | Qué hace |
|---|---|
| `src/components/layout/sidebar.tsx` | Sidebar colapsable unificado |
| `src/components/layout/app-shell.tsx` | Layout + auto-save + sync + mapeo etapa↔tab |
| `src/components/dashboard/dashboard-view.tsx` | Dashboard con ApexCharts |
| `src/components/seguimiento/` | Kanban: view, column, card, modal |
| `src/lib/dates.ts` | `normalizeISODate()` convierte seriales Excel, `todayBA()`, etc. |
| `src/store/pipeline.ts` | Etapas del Kanban (editables) |
| `Codigo.gs` | Apps Script de Google Sheets — DEBE actualizarse en Google |
| `tailwind.config.ts` | Config Tailwind con colores brand y dark mode selector |
| `src/lib/constants.ts` | WORKSPACE_NAV, MEDIO_OPTS, EMPRESA_BIO_OPTS, etc. |
| `src/app/globals.css` | CSS legacy + clases nuevas bio-page-head/title/subtitle |

### Comandos útiles
```bash
# Dev server
npm run dev

# Si hay error de chunks (después de instalar paquetes)
rm -rf .next && npm run dev

# TypeScript check
npx tsc --noEmit
```

### Convenciones de diseño actuales
- Cards y modales: `rounded-[18px]`
- Headers de página: clase `bio-page-head` + `bio-page-title` + `bio-page-subtitle` (estilo calendario)
- Colores de etapas: Prospecto=rojo, R1=naranja, R2=amarillo, Seguimiento=azul, Cliente=verde
- Colores de medio: WhatsApp=verde, Llamada=naranja, Instagram=rojo, Mail=azul, Presencial=amarillo
- Badge de responsable: nombre completo en pill redondeada
- Divisores de fecha en Kanban: Hoy / Ayer / DD/MM/YYYY
