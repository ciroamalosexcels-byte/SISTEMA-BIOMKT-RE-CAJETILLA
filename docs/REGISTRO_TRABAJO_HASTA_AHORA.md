# Registro de trabajo hasta ahora

Fecha: 2026-06-12  
Rama actual: `modificacion-next`  
Alcance respetado: se trabajo sobre la app Next.js y archivos relacionados. No se leyo ni se modifico el HTML legacy.

## 1. Correccion de errores iniciales

Se reprodujeron dos fallos con comandos del proyecto:

```bash
npm run type-check
npm test
```

### Error TypeScript

Archivo afectado:

- `src/components/crm/leads-table.tsx`

Problema:

- El componente `Phone` de `lucide-react` recibia la prop `title`.
- `lucide-react` no tipa `title` como prop directa del icono, por eso `tsc --noEmit` fallaba.

Cambio realizado:

- Se movio el `title` a un `<span>` wrapper.
- El icono `Phone` quedo solo con props compatibles.

Resultado:

- `npm run type-check` paso correctamente.

### Error de test en adapter Supabase

Archivos afectados:

- `src/lib/supabase/adapters.ts`
- `src/lib/supabase/adapters.test.ts`

Problema:

- `adaptLead()` ya devolvia `clientOrder`, pero el test de cobertura de campos no lo tenia incluido en la lista de campos mapeados.
- Eso hacia fallar el test: esperaba que toda key del `Lead` adaptado estuviera cubierta.

Cambios realizados:

- Se agrego `clientOrder` al test como campo cubierto.
- Se agrego una expectativa explicita para `lead.clientOrder`.
- Se reemplazo `(row as any).client_order` por `row.client_order`, porque el tipo Supabase ya declara esa columna.

Resultado:

- `npm test` paso correctamente.
- Resultado verificado: 7 archivos de test, 42 tests.

## 2. Verificaciones ejecutadas

Despues de los cambios se ejecutaron:

```bash
npm run type-check
npm test
```

Resultados:

- TypeScript: sin errores.
- Vitest: 7 archivos pasados, 42 tests pasados.
- Quedo un warning informativo de Vite sobre `vite-tsconfig-paths`; no bloquea.

## 3. Memoria guardada en Engram

Se guardo una memoria en Engram con el resumen del fix:

```txt
#1 "Fix Next.js type-check and adapter tests"
```

Contenido resumido:

- Correccion del `title` en `Phone`.
- Actualizacion de test de `clientOrder`.
- Remocion de cast `any` innecesario en `adaptLead`.
- Verificaciones pasadas con `npm run type-check` y `npm test`.

## 4. Aclaracion de alcance: solo Next.js

El usuario aclaro que se esta trabajando solo con la aplicacion Next.js.

Decision registrada:

- No leer ni tocar `Sistema Biomarketing 60 Auditado.html`.
- Usar ese archivo, como maximo, solo como referencia congelada si el usuario lo autorizara explicitamente.
- El trabajo activo queda limitado a `src/`, configuracion, tests y documentacion relacionada.

## 5. Analisis tecnico del proyecto Next.js

Se creo el documento:

```txt
docs/ANALISIS_PROYECTO_NEXT.md
```

Contenido incluido:

- tecnologias principales
- scripts disponibles
- variables de entorno
- arbol de carpetas de `src/`
- arquitectura general
- autenticacion con Supabase
- contexto de negocio
- modelo de dominio
- logica comercial principal
- stores Zustand
- persistencia local y remota
- Supabase y Google Sheets
- manejo de fechas
- metodologia implicita
- riesgos tecnicos
- recomendacion de arquitectura objetivo
- plan de mejora por fases
- preguntas abiertas

Puntos principales del analisis:

- Next.js 15 con App Router.
- React 19.
- TypeScript strict.
- Zustand para estado cliente.
- Supabase como backend principal.
- `localStorage` como cache local.
- Google Sheets como importacion/sync secundaria, no como fuente principal.
- Las reglas de negocio todavia viven bastante en componentes y stores.
- Recomendacion principal: extraer dominio puro para leads, pipeline, clientes, calendario y dashboard.

## 6. Branch nueva para modificaciones

Se creo y activo una rama nueva:

```bash
git switch -c modificacion-next
```

Rama actual confirmada:

```txt
modificacion-next
```

Estado al momento del registro:

```txt
## modificacion-next
 M src/components/crm/leads-table.tsx
 M src/lib/supabase/adapters.test.ts
 M src/lib/supabase/adapters.ts
?? .codex/
?? AGENTS.md
?? docs/ANALISIS_PROYECTO_NEXT.md
```

Nota:

- La rama nueva conserva los cambios pendientes existentes en el working tree.

## 7. Analisis previo para implementar Caja

El usuario pidio analizar antes de modificar archivos para implementar la seccion Caja basada en la planilla `CAJA BIOMARKETING 2026`.

Restricciones indicadas:

- Next.js 15 con App Router.
- React + TypeScript strict.
- Zustand para estado cliente.
- Supabase como backend principal.
- `localStorage` como cache local.
- Rutas internas en `/api/supabase/*`.
- Ya existe `src/app/caja`.
- No usar Apps Script para esta nueva seccion.
- No modificar CRM, Clientes, Equipo, Dashboard, Calendario ni Planificacion salvo integracion minima necesaria.
- No modificar archivos todavia.

### Hallazgos sobre Caja actual

Archivo revisado:

- `src/app/caja/page.tsx`

Estado actual:

- La ruta existe.
- Solo muestra una pantalla de "Proximamente".
- No tiene store ni API propia.

Tambien se encontro logica de caja parcial en:

- `src/app/general/page.tsx`

Esa logica usa:

- `localStorage`
- keys como `biomarketing_caja_v1`
- campos simples: `entra`, `sale`, `caja`, `deuda`, `calle`, `objetivo`

Conclusion:

- Esa logica puede servir como referencia funcional minima, pero no cumple el objetivo nuevo porque no usa Supabase ni una arquitectura propia para Caja.

### Hallazgos sobre APIs Supabase existentes

Patron observado:

- `GET` verifica usuario con `createClient()`.
- Si no hay usuario, devuelve `[]`.
- Escrituras verifican usuario y devuelven `401` si no esta autenticado.
- Escrituras usan `createAdminClient()` server-side.
- Varios endpoints usan `runtime = "nodejs"`.
- Rutas dinamicas validan UUID en algunas entidades.
- Algunas entidades hacen soft delete con `deleted_at`; otras hacen delete real.

Archivos analizados como patrones:

- `src/app/api/supabase/leads/route.ts`
- `src/app/api/supabase/leads/[id]/route.ts`
- `src/app/api/supabase/content-events/route.ts`
- `src/app/api/supabase/content-events/[id]/route.ts`
- `src/app/api/supabase/plans/route.ts`
- `src/app/api/supabase/plans/[id]/route.ts`
- `src/app/api/supabase/team/route.ts`
- `src/app/api/supabase/team/[id]/route.ts`

### Hallazgos sobre stores Zustand

Patron observado:

- Stores cargan primero desde `localStorage`.
- Mutaciones actualizan Zustand inmediatamente.
- Luego persisten en `localStorage`.
- Finalmente disparan `fetch` a `/api/supabase/*`.
- La escritura remota es optimista y los errores quedan principalmente en consola.

Stores revisados:

- `src/store/leads.ts`
- `src/store/team.ts`
- `src/store/content-events.ts`
- `src/store/plans.ts`
- `src/store/pipeline.ts`
- `src/store/app-settings.ts`
- `src/store/column-widths.ts`

### Hallazgos sobre adapters y serializers

Archivos:

- `src/lib/supabase/adapters.ts`
- `src/lib/supabase/serializers.ts`

Patron:

- `adapters.ts` convierte filas Supabase snake_case a tipos de dominio camelCase.
- `serializers.ts` convierte tipos frontend a filas Supabase.
- Existe helper `d()` para convertir strings vacios a `null` en fechas.

Para Caja deberia replicarse este patron.

### Hallazgos sobre fechas

Archivo:

- `src/lib/dates.ts`

Funciones principales:

- `baParts`
- `todayBA`
- `nowDatetimeBA`
- `currentMonthBA`
- `normalizeISODate`
- `formatDateDisplay`
- `daysFromToday`

Decision para Caja:

- Usar `todayBA`, `currentMonthBA`, `normalizeISODate` y `formatDateDisplay`.
- Evitar `new Date()` directo en display o cortes por dia/mes.

### Hallazgos sobre UI reusable

Componentes revisados:

- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/badge.tsx`

Tambien existen clases globales y patrones visuales reutilizables:

- `bio-page-head`
- `bio-page-title`
- `bio-page-subtitle`
- `panel-head`
- `panel-title`
- `card`
- `table-top`
- `btn`
- `field`
- `modal-backdrop`
- `modal`

## 8. Plan tecnico propuesto para Caja

Archivos nuevos propuestos:

```txt
src/types/caja.ts
src/store/caja.ts
src/components/caja/caja-view.tsx
src/components/caja/cash-summary-cards.tsx
src/components/caja/cash-movements-table.tsx
src/components/caja/cash-movement-modal.tsx
src/components/caja/cash-filters.tsx
src/components/caja/cash-charts.tsx
src/app/api/supabase/caja/movements/route.ts
src/app/api/supabase/caja/movements/[id]/route.ts
src/app/api/supabase/caja/accounts/route.ts
src/app/api/supabase/caja/categories/route.ts
```

Archivos existentes a modificar de forma acotada:

```txt
src/types/index.ts
src/types/supabase.ts
src/lib/constants.ts
src/lib/storage.ts
src/lib/supabase/adapters.ts
src/lib/supabase/serializers.ts
src/lib/supabase/loaders.ts
src/components/layout/app-shell.tsx
src/app/caja/page.tsx
```

Tests propuestos:

```txt
src/lib/supabase/caja-adapters.test.ts
src/lib/supabase/caja-serializers.test.ts
```

Modelo inicial sugerido:

- `CajaMovement`
- `CajaAccount`
- `CajaCategory`
- `CajaMonthlySummary`
- `CajaPaymentStatus`

Campos probables para movimientos:

- `id`
- `date`
- `month`
- `type`
- `concept`
- `categoryId`
- `accountId`
- `amount`
- `paymentMethod`
- `clientId`
- `provider`
- `status`
- `notes`
- `createdAt`
- `updatedAt`

Tablas Supabase probables:

- `caja_movements`
- `caja_accounts`
- `caja_categories`

Pendiente necesario:

- El usuario debe aportar la planilla `CAJA BIOMARKETING 2026` o sus pestañas/columnas para cerrar el modelo exacto.

## 9. Restricciones activas para proximos pasos

- No usar Apps Script en Caja.
- No tocar HTML legacy.
- No modificar CRM, Clientes, Equipo, Dashboard, Calendario ni Planificacion salvo integracion minima necesaria.
- Mantener Supabase como fuente principal.
- Mantener `localStorage` como cache.
- Respetar `src/lib/dates.ts` para fechas.
- Crear tests de adapters/serializers antes o junto con implementacion.

