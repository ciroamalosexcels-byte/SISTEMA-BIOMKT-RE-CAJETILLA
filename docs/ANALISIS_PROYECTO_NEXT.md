# Analisis del proyecto Next.js Biomarketing

Fecha de analisis: 2026-06-11  
Alcance: aplicacion Next.js ubicada en `src/` y archivos de configuracion relacionados.  
Exclusion explicita: no se analiza ni se toma como fuente el archivo HTML legacy.

## 1. Resumen ejecutivo

Este proyecto es una aplicacion operativa para Biomarketing orientada a ventas, seguimiento comercial, gestion de clientes, planificacion de contenido, equipo interno, calendario y sincronizacion de datos.

La arquitectura actual es una aplicacion Next.js 15 con App Router, React 19, TypeScript estricto, Zustand para estado cliente, Supabase como backend principal y Google Sheets como canal de importacion/sincronizacion secundaria. El modelo de ejecucion es local-first en la interfaz: los stores actualizan estado y `localStorage` inmediatamente, y luego disparan escrituras asincronas a rutas internas `/api/supabase/*`.

La aplicacion esta bastante avanzada en funcionalidad, pero todavia mezcla bastante logica de negocio dentro de componentes y stores. La prioridad tecnica no es migrar mas desde legacy, sino ordenar los limites internos del sistema Next.js: dominio, persistencia, validacion, sincronizacion, metricas y fechas.

## 2. Tecnologias principales

### Framework y runtime

- **Next.js 15.3.2** con App Router.
- **React 19** y **React DOM 19**.
- **TypeScript 5** con `strict: true`.
- Runtime Node.js para API routes que usan Supabase admin y Google APIs.

### UI y estilos

- **Tailwind CSS v4** via `@tailwindcss/postcss`.
- CSS global en `src/app/globals.css`.
- Componentes UI propios en `src/components/ui`.
- Radix UI para primitives accesibles:
  - dialog
  - dropdown
  - select
  - checkbox
  - tabs
  - tooltip
  - avatar
  - sheet
- **lucide-react** para iconos.
- **ApexCharts / react-apexcharts** y **Recharts** para graficos.

### Estado cliente

- **Zustand 5**.
- Stores principales:
  - `useLeadsStore`
  - `useTeamStore`
  - `useContentEventsStore`
  - `usePlansStore`
  - `usePipelineStore`
  - `useAppSettings`
  - `useColumnWidthsStore`

### Backend e integraciones

- **Supabase**:
  - Auth con `@supabase/ssr`.
  - Cliente browser en `src/lib/supabase/client.ts`.
  - Cliente server con cookies en `src/lib/supabase/server.ts`.
  - Cliente admin con service role en `src/lib/supabase/admin.ts`.
- **Google Sheets**:
  - `googleapis` para lectura server-side de Sheets.
  - Apps Script todavia soportado en `src/lib/sheets.ts`.
  - Sync moderno desde Sheets hacia Supabase en `src/lib/google-sheets/*`.

### Testing y calidad

- **Vitest 4**.
- Tests en `src/**/*.test.ts`.
- Configuracion en `vitest.config.ts`.
- Type-check via `npm run type-check`.
- Tests actuales cubren principalmente:
  - adapters Supabase
  - serializers / round-trip
  - cobertura de schema
  - normalizador Google Sheets
  - flujo de datos de Supabase
  - persistencia de equipo

## 3. Scripts disponibles

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run type-check
npm test
npm run test:watch
```

Observacion: el script `lint` usa `next lint`, pero en Next 15 ese comando puede requerir revision segun la version/configuracion. Las verificaciones confiables hoy son `npm run type-check` y `npm test`.

## 4. Variables de entorno

Archivo de referencia: `env.local.example`.

```env
NEXT_PUBLIC_SHEETS_API_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_SHEET_ID=
```

Notas importantes:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` se usan en cliente y middleware.
- `SUPABASE_SERVICE_ROLE_KEY` solo debe usarse server-side.
- Las credenciales `GOOGLE_*` habilitan importacion desde Google Sheets.
- `next.config.ts` marca `googleapis` y `google-auth-library` como `serverExternalPackages`.
- Todas las rutas `/api/*` tienen `Cache-Control: no-store`.

## 5. Arbol de carpetas

```txt
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── me/
│   │   ├── google-sheets/
│   │   │   ├── sync/
│   │   │   └── test/
│   │   └── supabase/
│   │       ├── content-events/
│   │       │   └── [id]/
│   │       ├── leads/
│   │       │   └── [id]/
│   │       ├── management-events/
│   │       │   └── [id]/
│   │       ├── pipeline/
│   │       │   └── [id]/
│   │       ├── plan-events/
│   │       │   └── [id]/
│   │       ├── plans/
│   │       │   └── [id]/
│   │       └── team/
│   │           └── [id]/
│   │               ├── points/
│   │               └── status91/
│   ├── auth/
│   │   ├── callback/
│   │   ├── login/
│   │   └── logout/
│   ├── base/
│   ├── caja/
│   ├── calendario/
│   ├── clientes/
│   │   ├── dashboard/
│   │   └── [id]/
│   ├── colaboradores/
│   ├── crm/
│   ├── dashboard/
│   ├── equipo/
│   │   ├── dashboard/
│   │   ├── objetivos/
│   │   └── [id]/
│   ├── general/
│   ├── mapa/
│   ├── planes/
│   │   └── [id]/
│   ├── planificacion/
│   ├── procedimientos/
│   ├── reunion/
│   │   └── [numero]/
│   ├── reuniones-equipo/
│   ├── seguimiento/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── calendario/
│   ├── clientes/
│   ├── crm/
│   ├── dashboard/
│   ├── equipo/
│   ├── layout/
│   ├── mapa/
│   ├── planes/
│   ├── planificacion/
│   ├── seguimiento/
│   └── ui/
├── hooks/
├── lib/
│   ├── google-sheets/
│   ├── supabase/
│   ├── constants.ts
│   ├── dates.ts
│   ├── sheets.ts
│   ├── storage.ts
│   └── utils.ts
├── store/
└── types/
```

## 6. Arquitectura general

### Flujo de render

`src/app/layout.tsx` define el layout raiz y envuelve toda la aplicacion en `AppShell`.

`AppShell` cumple cuatro funciones clave:

1. Carga settings, leads, equipo, eventos, planes, pipeline y anchos de columnas desde `localStorage`.
2. Consulta Supabase mediante APIs internas.
3. Si Supabase devuelve datos, actualiza Zustand y reescribe `localStorage`.
4. Refresca leads y equipo cada 5 minutos.

### Capas actuales

```txt
UI pages/components
  ↓
Zustand stores
  ↓
localStorage inmediato
  ↓
fetch a API route interna
  ↓
Supabase admin/server
```

Para Google Sheets:

```txt
Google Sheets
  ↓
googleapis server-side
  ↓
normalizer
  ↓
upsert en Supabase
  ↓
AppShell carga desde Supabase
```

## 7. Autenticacion y autorizacion

Archivo principal: `src/middleware.ts`.

El middleware:

- Crea un cliente Supabase server-side con cookies.
- Llama `supabase.auth.getUser()` para refrescar/verificar sesion.
- Permite rutas publicas:
  - `/auth/login`
  - `/auth/callback`
  - `/auth/logout`
- Redirige a `/auth/login?next=<path>` cuando no hay usuario en una ruta protegida.

El endpoint de sync de Google Sheets tiene doble modo:

- Header `x-sync-secret` igual a `SUPABASE_SERVICE_ROLE_KEY`.
- Usuario logueado con `profiles.role = admin`.

## 8. Contexto de negocio

La aplicacion gestiona la operacion comercial y productiva de Biomarketing.

### Areas de negocio cubiertas

- **Ventas / prospeccion**: carga, seguimiento y movimiento de leads.
- **Reuniones comerciales**: Reunion 1 y Reunion 2 con fecha/hora.
- **Seguimiento**: reactivacion, llamadas y proximo contacto.
- **Clientes**: leads ganados, estado activo/inactivo, ficha individual.
- **Contenido**: planificacion de piezas, responsables, estados, fechas y timers.
- **Planes**: plantillas o paquetes de contenido reutilizables.
- **Equipo**: integrantes, datos personales, medallas, objetivos y estado 9.1.
- **Dashboard**: KPIs de contactos, reuniones, cierres, conversion y pipeline.
- **Calendario**: vision mensual de reuniones, seguimientos y produccion.
- **Mapa**: ubicacion/direccion de clientes.
- **Caja / general**: areas administrativas en desarrollo o separadas.

## 9. Modelo de dominio

### Lead

Archivo: `src/types/lead.ts`.

Un `Lead` representa tanto prospectos como clientes. La etapa se guarda en `tab`, pero tecnicamente `TabKey` es `string`, porque ahora puede apuntar a etapas dinamicas del pipeline.

Campos centrales:

- identidad:
  - `id`
  - `sheetId`
- contacto:
  - `nombre`
  - `nombre2`
  - `telefono`
  - `telefono2`
  - `email`
  - `instagram`
- negocio:
  - `empresa`
  - `rubro`
  - `servicio`
  - `empresaBio`
  - `medio`
  - `source`
  - `ticket`
- responsables:
  - `responsable1`
  - `responsable2`
- ciclo comercial:
  - `tab`
  - `fechaContacto`
  - `meetingDatetime`
  - `proximoSeguimientoDias`
  - `proximoSeguimientoFecha`
- cliente:
  - `planId`
  - `activo`
  - `clientOrder`
- contenido/estrategia:
  - `objetivos`
  - `planAudiovisual`
  - `mesEntrada`
- credenciales:
  - `clave`
  - `claveEmail`

### Pipeline

Archivo: `src/types/pipeline.ts`.

Etapas por defecto:

```txt
CRM -> REUNION_1 -> REUNION_2 -> SEGUIMIENTO -> CLIENTES
```

Cada etapa tiene:

- `id`
- `label`
- `color`
- `order`
- `isWon`

`CLIENTES` es la etapa ganada (`isWon: true`).

### Equipo

Archivo: `src/types/team-member.ts`.

Un integrante tiene:

- datos personales
- roles/equipo/horarios
- sueno/notas
- estado mensual 9.1
- badges
- puntos mensuales

Badges disponibles:

```txt
wood, bronze, silver, gold
```

Los requisitos por defecto estan en `DEFAULT_BADGE_REQUIREMENTS`.

### Eventos de contenido

Archivo: `src/types/content-event.ts`.

`ContentEvent` representa una pieza o tarea de contenido para un cliente:

- cliente
- titulo
- tipo
- estado
- fecha programada
- responsable
- objetivo/frase/copy/archivo
- timer
- orden
- done

Tipos:

```txt
CARRUSEL, REEL, PLACA, HISTORIA
```

Estados:

```txt
SIN EDITAR, EDITANDO, COMPLETO, CALENDARIZADO
```

### Eventos de gestion

`ManagementEvent` representa acciones operativas sobre clientes:

- acompanamiento
- llamada
- visita
- cobro
- reunion
- produccion
- pago

Estos eventos alimentan el progreso visible en tarjetas de clientes y calendario.

### Planes

Archivo: `src/types/plan.ts`.

`Plan` es una unidad estrategica reutilizable. `PlanEvent` es una pieza dentro del plan, similar a `ContentEvent`, pero vinculada a `planId` en lugar de `clientId`.

## 10. Logica comercial principal

### Alta de lead

Entrada:

- modal de nuevo lead en CRM o seguimiento
- carga rapida
- importacion desde Google Sheets

Flujo:

1. Se construye un `Lead`.
2. Se asigna `id` con `crypto.randomUUID()`.
3. Se asigna `fechaContacto` con `nowDatetimeBA()`.
4. Se guarda en Zustand.
5. Se persiste en `localStorage`.
6. Se envia `POST /api/supabase/leads`.

### Movimiento entre etapas

El movimiento se hace con `moveLeadTo(id, tab)`, que internamente llama `updateLead`.

Reglas visibles:

- Si el destino es `REUNION_1` o `REUNION_2`, se puede pedir fecha/hora de reunion.
- Si el destino es `SEGUIMIENTO`, se puede pedir fecha de proximo seguimiento.
- Si el destino es `CLIENTES`, el lead aparece en la vista de clientes.

### Clientes

Un cliente es un `Lead` con `tab === "CLIENTES"`.

La vista de clientes:

- separa activos e inactivos
- calcula progreso por eventos de gestion completados
- muestra cantidad de contenidos asociados
- permite reordenar con drag and drop usando `clientOrder`
- exporta CSV

### Dashboard

El dashboard calcula desde `rows`:

- contactos del dia, mes y anio
- reuniones del mes
- cierres del mes
- conversion contacto -> reunion
- conversion reunion -> cierre
- seguimiento pendiente / atrasado
- proyeccion del mes
- performance por integrante contra objetivos diarios
- distribucion actual del pipeline

La logica esta mayormente dentro de `src/components/dashboard/dashboard-view.tsx`.

### Equipo

La vista de equipo:

- lista integrantes
- calcula cierres asociados por responsable
- muestra badges segun configuracion
- permite alta, edicion y borrado
- conecta con perfil individual de miembro

La logica de objetivos mensuales y semaforos vive en componentes de equipo y settings.

### Planificacion de contenidos

La vista de planificacion:

- lista `contentEvents`
- filtra por texto, estado y tipo
- muestra calendario mensual de contenidos
- permite agregar contenidos desde un dia calendario
- permite editar responsable, fecha, cliente, tipo, estado, idea y feedback
- incluye timers por pieza
- usa columnas redimensionables persistidas

### Calendario global

El calendario global agrupa:

- reuniones 1 y 2 desde `meetingDatetime`
- seguimientos desde `proximoSeguimientoFecha`
- produccion desde `managementEvents` de tipo `Produccion`

Permite abrir un dia y navegar al lead correspondiente, usando `highlightLeadId` para resaltarlo en la tabla destino.

## 11. Stores y responsabilidades

### `src/store/leads.ts`

Responsabilidades:

- mantener `rows`
- alta/edicion/borrado/movimiento de leads
- undo/redo limitado a 50 snapshots
- persistencia local
- escritura asincrona a Supabase
- deduplicacion por `id`
- normalizacion inicial de fechas

Riesgo:

- mezcla estado, historial, persistencia local, sync remoto y reglas de negocio.

### `src/store/team.ts`

Responsabilidades:

- cargar equipo desde localStorage
- crear equipo por defecto si no existe
- alta/edicion/borrado
- badges
- status 9.1
- puntos mensuales
- escritura a endpoints Supabase

Riesgo:

- el borrado local no parece disparar delete remoto.
- varias responsabilidades de persistencia estan embebidas en el store.

### `src/store/content-events.ts`

Responsabilidades:

- contenido por cliente
- eventos de gestion por cliente
- CRUD
- reorder
- done/toggle
- persistencia local y API Supabase

Riesgo:

- en reordenamiento se emite un PATCH por evento.
- no hay cola/retry visible si falla Supabase.

### `src/store/plans.ts`

Responsabilidades:

- planes
- eventos de plan
- CRUD local y Supabase

Riesgo:

- usa `new Date().toISOString()` para `createdAt`; si se muestra como fecha local hay que revisar zona horaria.

### `src/store/pipeline.ts`

Responsabilidades:

- etapas dinamicas
- orden
- colores
- persistencia local
- PATCH remoto al actualizar/reordenar

Riesgo:

- agregar o eliminar etapa parece persistir solo localmente; update/reorder si sincronizan.
- `id` generado como `stage_${Date.now()}` no es UUID; algunas APIs de leads ignoran IDs no UUID en rutas dinamicas de leads, pero pipeline puede requerir su propio criterio.

### `src/store/app-settings.ts`

Responsabilidades:

- dark mode
- escalas visuales
- objetivos
- layout dashboard
- workspace activo
- notificaciones
- planes de servicio
- configuracion Apps Script/calendario

Riesgo:

- usa `new Date()` en defaults y helpers internos. Para display critico conviene pasar por `src/lib/dates.ts`.

### `src/store/column-widths.ts`

Responsabilidades:

- anchos de columnas CRM/base/reuniones/seguimiento/clientes
- anchos de planificacion
- row height de planificacion
- modo resize
- persistencia local
- guardado diferido a Apps Script

Riesgo:

- este store todavia importa `saveToSheets`, mientras el resto de stores comenta Sheets y usa Supabase. Es una inconsistencia arquitectonica.

## 12. Persistencia y sincronizacion

### LocalStorage

Archivo: `src/lib/storage.ts`.

Provee wrappers seguros:

- `safeGet`
- `safeSet`

Claves principales:

- `ventas_biomarketing_v2`
- `ventas_biomarketing_team_v2`
- `ventas_biomarketing_client_content_events_v1`
- `ventas_biomarketing_client_management_events_v1`
- `ventas_biomarketing_plans_v1`
- `ventas_biomarketing_plan_events_v1`
- `ventas_biomarketing_column_widths_v2`
- `ventas_biomarketing_app_settings_v2`

### Supabase

La integracion esta dividida en:

- tipos generados/manuales: `src/types/supabase.ts`
- adapters DB -> dominio: `src/lib/supabase/adapters.ts`
- serializers dominio -> DB: `src/lib/supabase/serializers.ts`
- loaders client-side: `src/lib/supabase/loaders.ts`
- cliente browser/server/admin

Tablas relevantes:

- `leads`
- `pipeline_stages`
- `team_members`
- `team_status_91`
- `team_monthly_points`
- `content_events`
- `management_events`
- `plans`
- `plan_events`
- `profiles`
- `sheet_sources`
- `sheet_sync_runs`

### API routes Supabase

Patron general:

1. Verificar usuario con cliente server.
2. Usar cliente admin para leer/escribir.
3. Adaptar o serializar entidades.
4. Responder JSON.

Endpoints principales:

- `GET/POST /api/supabase/leads`
- `PATCH/DELETE /api/supabase/leads/[id]`
- `GET /api/supabase/team`
- `PATCH /api/supabase/team/[id]`
- `PATCH /api/supabase/team/[id]/status91`
- `PATCH /api/supabase/team/[id]/points`
- `GET/POST /api/supabase/content-events`
- `PATCH/DELETE /api/supabase/content-events/[id]`
- `GET/POST /api/supabase/management-events`
- `PATCH/DELETE /api/supabase/management-events/[id]`
- `GET/POST /api/supabase/plans`
- `PATCH/DELETE /api/supabase/plans/[id]`
- `GET/POST /api/supabase/plan-events`
- `PATCH/DELETE /api/supabase/plan-events/[id]`
- `GET /api/supabase/pipeline`
- `PATCH /api/supabase/pipeline/[id]`

### Google Sheets

Hay dos caminos:

1. `src/lib/sheets.ts`: cliente para Apps Script. Mantiene compatibilidad con `Content-Type: text/plain;charset=utf-8`.
2. `src/lib/google-sheets/*`: sync server-side moderno con `googleapis`.

El sync moderno:

- lee `Leads!A1:AZ1000`
- lee `Team!A1:AZ100`
- convierte filas a objetos
- normaliza tipos
- resuelve stage por `pipeline_stages`
- hace upsert en Supabase por `sheet_id`
- registra corrida en `sheet_sync_runs`

## 13. Fechas y zona horaria

Archivo: `src/lib/dates.ts`.

Zona oficial:

```txt
America/Argentina/Buenos_Aires
```

Funciones centrales:

- `baParts`
- `todayBA`
- `nowDatetimeBA`
- `currentMonthBA`
- `normalizeISODate`
- `formatDateDisplay`
- `daysFromToday`
- helpers de signos/edad

Riesgo actual:

- Algunos componentes todavia usan `new Date()` directamente para grillas, labels o defaults.
- Para calculos puramente de mes puede funcionar, pero para display/limites de dia deberia centralizarse mas.

Recomendacion:

- Crear helpers de calendario BA:
  - `prevMonthBA`
  - `nextMonthBA`
  - `monthLabelBA`
  - `buildMonthGridBA`
  - `dateOnlyBA`
  - `isBeforeTodayBA`

## 14. Metodologia implicita de desarrollo

La metodologia actual se puede describir asi:

### Local-first operativo

La UI responde rapido porque cada mutacion actualiza Zustand y `localStorage` antes de esperar Supabase.

Ventaja:

- buena experiencia de usuario
- tolerancia parcial a fallos temporales de red

Costo:

- si Supabase falla, puede haber divergencia silenciosa
- no hay cola visible de reintentos
- no hay estado por entidad de `syncing`, `synced`, `failed`

### Server API como boundary

La app cliente no escribe Supabase directo en las mutaciones de negocio; llama rutas internas.

Ventaja:

- service role queda server-side
- se puede centralizar validacion/autorizacion

Costo:

- hoy varias rutas confian en payloads ya formados por el cliente
- convendria validar con Zod antes de escribir DB

### Tests de integridad de datos

Los tests existentes apuntan a evitar drift entre:

- tipos de dominio
- schema Supabase
- adapters
- serializers
- normalizadores de Sheets

Esto es correcto para una app de datos. Faltan tests de reglas comerciales y fechas.

## 15. Riesgos tecnicos por area

### Alto: persistencia distribuida

Hay tres superficies:

- Zustand
- localStorage
- Supabase
- y restos de Apps Script en algunas zonas

Riesgo:

- divergencia silenciosa si falla una escritura remota.

Accion recomendada:

- introducir un modulo de sync por entidad con resultado observable:
  - `pending`
  - `syncing`
  - `synced`
  - `failed`

### Alto: logica de negocio dentro de componentes

Dashboard, calendario, seguimiento, planificacion y clientes contienen calculos y reglas directamente en JSX/componentes.

Riesgo:

- dificil testear
- dificil reutilizar reglas
- cambios de negocio pueden romper UI

Accion recomendada:

- crear `src/domain/` o `src/lib/domain/` con funciones puras.

### Medio: fechas

Existe una base buena en `dates.ts`, pero no todos los calculos pasan por ahi.

Riesgo:

- errores de dia/mes por timezone.

Accion recomendada:

- mover helpers de calendario y comparacion a `dates.ts`.

### Medio: pipeline dinamico vs constantes historicas

`TabKey` es string dinamico, pero varias pantallas todavia chequean strings historicos como `REUNION_1`, `REUNION_2`, `SEGUIMIENTO`, `CLIENTES`.

Riesgo:

- si el pipeline se vuelve realmente editable, algunas reglas no acompanan nuevas etapas.

Accion recomendada:

- formalizar metadata de etapa:
  - tipo: prospecting / meeting / followup / won / lost
  - requiere fecha
  - es cliente

### Medio: validacion de payloads

Hay dependencia de tipos TS, pero en runtime las API routes reciben JSON arbitrario.

Accion recomendada:

- Zod schemas por entidad:
  - `leadSchema`
  - `teamMemberSchema`
  - `contentEventSchema`
  - `planSchema`

### Bajo/medio: UI primitives incompletas

Hay carpeta `components/ui`, pero varias pantallas usan estilos inline y clases propias.

Riesgo:

- inconsistencia visual y mantenimiento mas lento.

Accion recomendada:

- consolidar Button, Modal, Field, Table, Toolbar y StatusChip.

## 16. Recomendacion de arquitectura objetivo

Sin cambiar funcionalidad, una evolucion razonable seria:

```txt
src/
├── domain/
│   ├── leads/
│   │   ├── rules.ts
│   │   ├── metrics.ts
│   │   └── filters.ts
│   ├── pipeline/
│   ├── clients/
│   ├── content/
│   ├── team/
│   └── calendar/
├── data/
│   ├── local-storage/
│   ├── supabase/
│   └── google-sheets/
├── store/
├── components/
└── app/
```

Prioridad:

1. Extraer reglas puras de leads/pipeline.
2. Extraer calculos de dashboard.
3. Extraer helpers de calendario.
4. Centralizar sync y errores de persistencia.
5. Validar API routes con Zod.

## 17. Plan de mejora por etapas

### Fase 1: estabilizar datos

- Definir fuente primaria: Supabase.
- Mantener localStorage como cache.
- Registrar errores de escritura por entidad.
- Mostrar estado de sync en UI.
- Eliminar o aislar dependencias directas a Apps Script donde ya no aplica.

### Fase 2: dominio

Crear funciones puras:

```ts
getActiveLeads(rows)
getClients(rows)
getLeadsByStage(rows, stageId)
moveLeadToStage(lead, stage, metadata)
calculateClientProgress(events)
calculateDashboardMetrics(rows, members, month)
buildCalendarEvents(rows, managementEvents)
```

### Fase 3: tests de negocio

Agregar tests para:

- movimiento CRM -> Reunion 1
- movimiento a Seguimiento con fecha
- cliente ganado
- progreso de cliente
- conversiones dashboard
- seguimientos atrasados
- calendario mensual BA

### Fase 4: limpieza de UI

- Reducir estilos inline repetidos.
- Unificar modales.
- Unificar tablas editables.
- Unificar chips de estado.
- Mantener pantallas densas y operativas.

### Fase 5: pipeline editable real

Si el pipeline va a ser editable por usuarios:

- agregar metadata de etapa
- persistir altas/bajas remoto
- definir restricciones para etapas ganadas/perdidas
- migrar reglas hardcodeadas a metadata

## 18. Preguntas abiertas

Estas preguntas conviene resolver antes de refactors grandes:

1. Supabase es definitivamente la fuente de verdad y Sheets queda solo como importacion?
2. Apps Script debe seguir escribiendo algo o se puede retirar de stores?
3. El pipeline tiene que ser editable por usuarios finales o solo configurable por admin?
4. `CLIENTES` es siempre la unica etapa ganada?
5. Se necesita etapa perdida / descartado?
6. La app debe funcionar offline o solo cachear para velocidad?
7. Cuando falla una escritura a Supabase, debe bloquearse la UI, mostrar alerta o reintentar silenciosamente?
8. Que rol tiene cada usuario: admin, vendedor, produccion, lider?
9. Los datos sensibles como `claveEmail` deben seguir en tabla normal o pasar a Vault como `clave`?
10. Que vistas son criticas para el dia a dia: seguimiento, clientes, calendario, dashboard?

## 19. Veredicto tecnico

La base Next.js es funcional y tiene una separacion inicial razonable entre rutas, componentes, stores, tipos e integraciones. La decision de usar Supabase como backend principal y localStorage como cache es adecuada para una herramienta interna de operacion.

El mayor riesgo tecnico actual es que demasiada logica de negocio vive en componentes y stores. Eso no impide avanzar, pero aumenta el costo de cambios futuros. La mejora de mayor retorno seria extraer funciones puras de dominio para leads, pipeline, clientes, calendario y dashboard, y cubrirlas con tests.

El segundo riesgo es la sincronizacion: hoy los cambios son optimistas y los fallos remotos pueden quedar solo en consola. Para una app operativa, conviene hacer visibles los errores de sync o implementar una cola de reintentos.

## 20. Comandos de verificacion recomendados

```bash
npm run type-check
npm test
npm run build
```

Antes de tocar persistencia o modelos, correr minimo:

```bash
npm run type-check
npm test
```

