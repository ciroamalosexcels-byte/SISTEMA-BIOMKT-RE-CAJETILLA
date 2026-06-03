# Resumen de sesión — Sistema Biomarketing

---

## 1. Objetivo principal de la sesión

Migrar, rediseñar y mejorar el sistema interno de gestión de Biomarketing (agencia de marketing argentina) de un monolito HTML a una app Next.js 15 completamente funcional. Esta sesión se centró en:
- Completar y refinar el Kanban de Leads (vista Seguimiento)
- Mejorar el Dashboard de Ventas con métricas reales
- Construir el Dashboard General con bloques de Caja, Clientes, Estado y Líder
- Agregar la vista de Objetivos al workspace Equipo
- Reorganizar los workspaces de la barra lateral

---

## 2. Contexto importante

### El proyecto
- **Nombre:** Sistema Biomarketing / RE Cajetilla
- **Repo:** `C:\Users\dell\Documents\github\SISTEMA-BIOMKT-RE-CAJETILLA`
- **GitHub:** `https://github.com/ciroamalosexcels-byte/SISTEMA-BIOMKT-RE-CAJETILLA`
- **Rama activa:** `ui-improvements` (creada esta sesión)
- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Estilos:** Tailwind CSS v4 + CSS legacy en `globals.css`
- **Estado global:** Zustand (leads, team, pipeline, settings, content, plans)
- **Backend:** Google Sheets via Apps Script (`Codigo.gs`) — única base de datos
- **Dev server:** `http://localhost:3000`

### Estructura clave
```
src/
├── app/
│   ├── general/page.tsx         → Dashboard General (5 bloques)
│   ├── dashboard/page.tsx       → Dashboard Ventas
│   ├── seguimiento/page.tsx     → Kanban de Leads
│   ├── equipo/
│   │   ├── page.tsx             → Vista Equipo
│   │   ├── objetivos/page.tsx   → Vista Objetivos (nueva)
│   │   └── dashboard/page.tsx
│   ├── caja/page.tsx            → "Próximamente"
│   └── ...otras rutas
├── components/
│   ├── layout/sidebar.tsx       → Sidebar colapsable con 4 workspaces
│   ├── dashboard/dashboard-view.tsx
│   ├── seguimiento/             → Kanban: view, column, card, modal
│   ├── equipo/
│   │   ├── equipo-view.tsx
│   │   └── objetivos-view.tsx   → Tabla Faro/Meta/Objetivos con semáforo
│   └── ui/
│       ├── welcome-area-chart.tsx  → Gráfico área compartido (nuevo)
│       └── apex-chart.tsx
├── lib/constants.ts             → WORKSPACE_NAV con 4 workspaces
└── store/app-settings.ts        → objetivosEquipo campo nuevo
```

### Workspaces (sidebar)
| Workspace | Label | Icono | Nav items |
|-----------|-------|-------|-----------|
| `equipo`  | Equipo | Building2 | Dashboard, Objetivos, Equipo, Colaboradores, Procedimientos, Reunión de Equipo |
| `ventas`  | Venta | TrendingUp | Dashboard, Leads, Clientes, Calendario |
| `clientes`| Clientes | Users | Dashboard, Clientes, Planificación, Planes, Mapa, Calendario |
| `caja`    | Caja | BarChart3 | Caja (→ /caja, "Próximamente") |

Default workspace: `equipo`

### Modelo de datos clave
- **Lead:** `tab` (etapa pipeline), `fechaContacto`, `medio`, `nombre`, `empresa`, `responsable1`, `responsable2`, etc.
- **PipelineStage:** `{ id, label, color, order }` — localStorage `ventas_biomarketing_pipeline_stages_v2`
- **TeamMember:** `roles` field → si contiene "lider/líder/LIDER" → es el líder del equipo
- **AppSettings:** agregado `objetivosEquipo: Record<string, number>`

### Mapeo Sheets ↔ Frontend
- La columna "etapa" en Sheets = campo `tab` en el frontend
- Al leer: `r.tab = r.tab || r.etapa || "CRM"` (app-shell.tsx)
- Al guardar: `etapa: row.etapa || row.tab || "CRM"` (Codigo.gs)

---

## 3. Decisiones tomadas

### Kanban / Seguimiento
- **Sin drag and drop** — reemplazado por flechas `← Pro. | Seg. | Reu 2 →` en cada tarjeta
- Flechas muestran abreviación de la columna adyacente (función `abbr()`)
- `Seg.` siempre en el medio → mueve directo a columna SEGUIMIENTO
- Menú clic derecho: Llamar, WhatsApp, Eliminar
- Al mover a Reunión 1/2 → prompt de fecha de reunión
- Al mover a Seguimiento → prompt de fecha de próximo seguimiento
- Cards: `h-[130px]`, empresa bold `17px`, nombre `14px`, badges pill `rounded-full`
- Badge de responsable: color determinístico por nombre (`RESP_COLOR` mapa fijo)
- Divisores de fecha: `text-[12px] text-slate-500` con "Hoy · 01/06", "Ayer · 31/05", "Anteayer"
- `React.memo` en KanbanColumn y LeadCard

### Modal de Lead
- Orden campos: Nombre contacto | Empresa → 2do contacto (toggle) → Observaciones → Dirección+Teléfono → Responsables → Medio → Fechas
- Sin pills de etapa ni botones de acciones rápidas
- Labels `text-[13px]`
- Botones footer: `.btn.btn-sm` (btn-amber, btn-outline, btn-danger)
- Fecha de contacto pre-llenada con `nowDatetimeBA()` en leads nuevos
- Responsables no pueden ser iguales, opción vacía invisible

### Vista Tabla (Leads)
- Columnas: Nombre | Empresa | Observaciones (15 chars + …) | Teléfono | Primer contacto | Dirección | Responsable (badge) | Medio (badge)
- Clic en celda de Observaciones → modal editable con mismo formato que lead modal
- Clic derecho en fila → menú: Llamar, WhatsApp, Eliminar
- Muestra todos los leads (sin filtro de etapa)
- `style={{ paddingLeft: 12 }}` en todas las celdas

### Dashboard de Ventas
- **Eliminados:** 3 gráficos de barras redundantes
- **Agregados:** Conversión (contactos→reunión, reunión→cierres), Pipeline actual, Seguimientos pendientes, Proyección del mes
- Separadores visuales: "📅 datos del mes" y "📍 estado actual"
- Seguimientos: link clickeable → `/seguimiento`
- Proyección: siempre visible, warning amber si < día 5
- WelcomeAreaChart extraído a `src/components/ui/welcome-area-chart.tsx` (compartido)
- WelcomeAreaChart acepta prop `actions` para renderizar contenido en el header

### Dashboard General (/general)
5 bloques:
1. **Resumen de Caja** — tabla editable: $ ENTRA / $ SALE / $ CAJA / $ DEUDA / $ CALLE / $ OBJETIVO (amber). localStorage `biomarketing_caja_v1`
2. **Clientes del mes** — Total activos (número grande) + Objetivo (editable, mismo tamaño) + Ticket promedio (amber, formato `100.000`) + Facturación estimada
3. **Estado de Clientes** — emoji semáforo (😄/😊/😐/😟), clic para cambiar. localStorage `biomarketing_estado_clientes_v1`
4. **Estado del Líder** — detecta líder por `roles` con regex `/l[ií]der/i`. Muestra nombre grande + círculo de color promedio 9.1. Sin porcentaje.
5. **Gráfico crecimiento mensual** — WelcomeAreaChart compartido con selector `‹ › HOY` dentro del header del gráfico

Layout: 4 columnas en fila superior, gráfico abajo

### Vista Objetivos (/equipo/objetivos)
- Tabla con 3 secciones: **FARO** (1 fila) / **META** (3 filas) / **OBJETIVOS** (9 filas)
- Columnas: Objetivo (texto editable) | Fecha | Estado (círculo semáforo, clic para ciclar 0→1→2→3)
- 0=gris, 1=rojo, 2=amarillo, 3=verde
- Guardado en localStorage `biomarketing_objetivos_v2`
- Accesible desde sidebar equipo como "Objetivos" debajo de Dashboard

### Sidebar
- 4 workspaces en orden: Equipo → Venta → Clientes → Caja
- Caja es accordion igual que los demás (no link directo)
- `wsLabel` toma `label` del `WORKSPACE_CONFIGS` (fix: antes hardcodeaba "Equipo")

---

## 4. Problemas resueltos

### Kanban
- **Drag lag** → eliminado dnd-kit, reemplazado por flechas ← Seg. →
- **Fechas seriales Excel** → `normalizeISODate()` convierte seriales (40000–70000) a ISO
- **Badge de medio vacío** → select con `<option value="">` sin texto
- **Modo light kanban** → migrado a light-first con dark overrides

### Dashboard
- **Gráfico general sin datos** → fixed con selector de mes (antes fijo en mes actual)
- **WelcomeAreaChart duplicado** → extraído a componente compartido
- **"Equipo" aparecía como label de Caja** → fix: wsLabel ahora toma `label` de WORKSPACE_CONFIGS

### Modal
- **Fecha no mostraba** → si viene sin "T", se agrega "T00:00" para datetime-local
- **Placeholder en campos vacíos** → `color: transparent` en inputs de fecha
- **Tipo WorkspaceMode** → agregado `"caja"` al union type y al DEFAULT_APP_SETTINGS

---

## 5. Estado actual

### Funcionando
- ✅ Sidebar con 4 workspaces (Equipo, Venta, Clientes, Caja)
- ✅ Kanban de Leads con flechas de movimiento, prompts de fecha, badges, clic derecho
- ✅ Vista Tabla con observaciones, clic derecho, todos los leads
- ✅ Lead modal reorganizado con 2do contacto, botones sistema, labels grandes
- ✅ Dashboard Ventas con conversión, pipeline, seguimientos, proyección
- ✅ Dashboard General con 5 bloques funcionales
- ✅ Vista Objetivos del Equipo (Faro/Meta/Objetivos con semáforo)
- ✅ Página Caja con "Próximamente"
- ✅ WelcomeAreaChart compartido entre dashboards

### Rama activa
- Trabajando en `ui-improvements` (no mergeada a `main` aún)

### Último commit en main
- `30645bf` — "feat: mejoras kanban, tabla y modal de leads"

### Dev server
- Corre en `localhost:3000`
- Si hay error de chunk: `Remove-Item -Recurse -Force .next && npm run dev`

---

## 6. Próximos pasos recomendados

1. **Mergear `ui-improvements` a `main`** y hacer push a GitHub
2. **Actualizar `Codigo.gs`** en Google Apps Script (pendiente desde sesión anterior):
   - Abre `Codigo.gs`, copia todo, pega en Apps Script editor, guarda, implementa
   - Luego sincronizar desde la app para corregir fechas seriales en Sheets
3. **Dashboard General** — verificar que los datos reales aparecen correctamente
4. **Dashboards Clientes y Equipo** (`/clientes/dashboard`, `/equipo/dashboard`) — siguen como placeholders
5. **Migración Tailwind** — pendiente en `equipo-view.tsx`, `clientes-view.tsx`, `planificacion-view.tsx`

---

## 7. Instrucciones para la próxima IA

### Stack técnico
```
Next.js 15 App Router | React 19 | TypeScript | Tailwind v4 | Zustand | ApexCharts
```

### Reglas críticas del proyecto
1. **Idioma:** Responder siempre en español
2. **CSS:** Preferir Tailwind. Si no funciona, usar inline `style={{ }}`. CSS legacy en `globals.css` se elimina progresivamente
3. **Dark mode:** Clase `dark-mode` en `body` (NO `prefers-color-scheme`). Tailwind config: `darkMode: ["selector", ".dark-mode"]`
4. **Fechas:** Usar `todayBA()`, `nowDatetimeBA()` de `src/lib/dates.ts`. Nunca `new Date()` directamente para display
5. **Sheets:** `Content-Type: text/plain;charset=utf-8` con JSON string en body (NO `application/json`)
6. **tab vs etapa:** frontend usa `tab`, Sheets usa `etapa`. Mapeado en app-shell y Codigo.gs
7. **Pipeline stages:** localStorage `ventas_biomarketing_pipeline_stages_v2`
8. **No tocar:** vistas que usan CSS legacy (equipo, clientes, planificación) sin tener plan
9. **Botones:** usar clases `.btn .btn-sm .btn-amber/.btn-dark/.btn-outline/.btn-danger` del globals.css
10. **Headers de página:** clases `bio-page-head`, `bio-page-title`, `bio-page-subtitle`

### Archivos clave
| Archivo | Qué hace |
|---|---|
| `src/components/layout/sidebar.tsx` | Sidebar con 4 workspaces |
| `src/components/layout/app-shell.tsx` | Layout + auto-save + sync + mapeo etapa↔tab |
| `src/app/general/page.tsx` | Dashboard General (5 bloques) |
| `src/components/dashboard/dashboard-view.tsx` | Dashboard Ventas con ApexCharts |
| `src/components/ui/welcome-area-chart.tsx` | Gráfico área compartido |
| `src/components/seguimiento/` | Kanban: view, column, card, modal |
| `src/components/equipo/objetivos-view.tsx` | Tabla Faro/Meta/Objetivos |
| `src/lib/constants.ts` | WORKSPACE_NAV, WorkspaceMode, MEDIO_OPTS |
| `src/lib/dates.ts` | `normalizeISODate()`, `todayBA()`, `nowDatetimeBA()` |
| `src/store/pipeline.ts` | Etapas del Kanban |
| `src/store/app-settings.ts` | Settings + `objetivosEquipo` |
| `Codigo.gs` | Apps Script Google Sheets — DEBE actualizarse |
| `tailwind.config.ts` | Colores brand: amber=#f6bf26, bio-dark=#07152f |

### Comandos útiles
```powershell
# Dev server
npm run dev

# Limpiar caché si hay errores de chunk
Remove-Item -Recurse -Force .next; npm run dev

# TypeScript check
npx tsc --noEmit

# Git — rama activa
git checkout ui-improvements
git push origin ui-improvements
```

### Convenciones de diseño actuales
- Cards: `rounded-[18px]`, header `bg-[#07152f]` con texto blanco
- Badges: `rounded-full`, colores por tipo (medio, responsable, estado)
- Responsable CIRO=#6366f1, LOREN=#ec4899, FEDE=#f97316, MATE=#22c55e, TINCHO=#ef4444, ARI=#a855f7, LU=#14b8a6
- Medio: WHATSAPP=#22c55e, LLAMADA=#f97316, INSTAGRAM=#ef4444, MAIL=#3b82f6, PRESENCIAL=#eab308
- Semáforo 9.1: ≥70%=verde, ≥40%=amarillo, <40%=rojo
- Separadores de sección en dashboard: `<Separator label="📅 ...">` / `<Separator label="📍 ...">`
