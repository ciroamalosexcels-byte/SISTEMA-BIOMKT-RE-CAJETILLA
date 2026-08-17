# Historial mensual de contenidos contratados/hechos — diseño

Fecha: 2026-08-17
Alcance: `src/` (Next.js). No toca el HTML legacy ni `mobile-crm/`.

## Contexto y problema

En `/clientes/[id]`, la modal "Datos del cliente" muestra y edita contadores
de Historias/Reels/Publicaciones (contratado vs. hecho) directamente sobre
el `Lead` (columnas `historias_hechas`, `historias_contratadas`, etc. en
`leads`). Estos valores son un único número global por cliente: no varían
según el mes que se esté mirando en el calendario del detalle.

El usuario quiere que, al navegar entre meses con las flechitas del header
de `/clientes/[id]`, la modal "Datos del cliente" muestre y guarde los
contadores **de ese mes específico**, formando un historial ("si el mes
pasado hubo 7/7 historias, o si hubo 5/7"). Ambos números (contratado y
hecho) varían mes a mes — no solo el hecho.

Este historial mensual también reemplaza la fuente de datos que usa la
feature de progreso agregada en la sesión anterior (círculo "contratado" en
`/clientes` y en el header del detalle): en vez de leer los campos del
`Lead`, debe leer el registro del **mes actual** de este nuevo historial.

## Decisiones tomadas con el usuario

- Tanto "contratado" como "hecho" varían por mes (no solo el hecho).
- Los valores actuales cargados en `leads` (p. ej. Sauce Propiedades 7/7)
  migran como el registro de **agosto 2026** (mes actual al momento de este
  cambio). No hay historial retroactivo para meses anteriores — no existía
  ese dato separado.
- Al entrar a un mes sin registro guardado (mes futuro o mes viejo sin
  cargar): "hecho" arranca en 0, "contratado" se precarga con el valor del
  registro más reciente que tenga datos (para no re-tipear el plan cada
  mes). No se guarda nada en Supabase hasta que el usuario edite algo ese
  mes.
- Una vez migrados los datos, se eliminan las columnas viejas de `leads`
  (`historias_hechas`, `historias_contratadas`, `reels_hechos`,
  `reels_contratados`, `publicaciones_hechas`, `publicaciones_contratadas`)
  y sus equivalentes en `Lead`, `adapters.ts`, `serializers.ts` — no queda
  una fuente de datos duplicada.

## Alternativas descartadas

- **JSON histórico en una columna de `leads`** (p. ej. `contenidos_historial
  jsonb`): descartado — el proyecto tiene una regla explícita de no guardar
  datos como JSON serializado en una celda; toda la data debe vivir en
  columnas legibles.
- **Modelarlo como pseudo-eventos en `content_events`**: descartado — fuerza
  un modelo de "evento" sobre lo que en realidad es un contador acumulado
  mensual, sin fecha ni horario reales.

Se usa una tabla relacional nueva, mismo patrón que `bulk_event_series` y
`progress_mode` (tablas ya existentes en este proyecto).

## Modelo de datos

Tabla nueva `public.client_monthly_content`:

```sql
CREATE TABLE public.client_monthly_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  month text NOT NULL CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  historias_hechas integer NOT NULL DEFAULT 0,
  historias_contratadas integer NOT NULL DEFAULT 0,
  reels_hechos integer NOT NULL DEFAULT 0,
  reels_contratados integer NOT NULL DEFAULT 0,
  publicaciones_hechas integer NOT NULL DEFAULT 0,
  publicaciones_contratadas integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, month)
);
```

RLS: igual que `bulk_event_series` — habilitada, `REVOKE ALL` de
`PUBLIC, anon, authenticated`, `GRANT SELECT, INSERT, UPDATE` a
`service_role` (las rutas de API usan el admin client server-side).

**Migración de datos** (una sola vez, dentro de la misma migración SQL):
para cada lead con algún valor `> 0` en las columnas viejas de contenidos,
insertar una fila en `client_monthly_content` con `month = '2026-08'` y
esos valores. Luego, en una segunda sentencia de la misma migración,
`ALTER TABLE leads DROP COLUMN` las 6 columnas viejas.

## Tipos (`src/types/client-monthly-content.ts`, nuevo)

```ts
export interface ClientMonthlyContent {
  id: string;
  clientId: string;
  month: string; // "YYYY-MM"
  historiasHechas: number;
  historiasContratadas: number;
  reelsHechos: number;
  reelsContratados: number;
  publicacionesHechas: number;
  publicacionesContratadas: number;
  createdAt: string;
  updatedAt: string;
}

export type ClientMonthlyContentInput = Omit<
  ClientMonthlyContent, "id" | "createdAt" | "updatedAt"
>;
```

`CONTENIDOS_CATEGORIAS` (en `src/lib/constants.ts`) se retipa: `hechoKey`
y `contratadoKey` pasan a ser claves de `ClientMonthlyContent` en vez de
`Lead` (mismos nombres de campo, cambia solo el tipo dueño).

`Lead` (`src/types/lead.ts`) pierde los 6 campos de contenidos.

## API

`src/app/api/supabase/client-monthly-content/route.ts`:

- `GET`: requiere sesión (401 si no hay usuario, mismo patrón que
  `bulk-event-series`). Devuelve **todas** las filas — se carga completa en
  el store al iniciar la app, igual que `content_events`.
- `POST`: requiere sesión. Body = `ClientMonthlyContentInput`. Hace
  `upsert` en Supabase con `onConflict: "client_id,month"`. Devuelve la fila
  resultante.

No hace falta `PATCH`/`DELETE` — un solo upsert cubre crear y actualizar, y
no hay caso de uso para borrar un mes puntual.

## Store (`src/store/client-monthly-content.ts`, nuevo)

```ts
interface ClientMonthlyContentStore {
  records: ClientMonthlyContent[];
  load: () => void; // desde localStorage cache
  upsert: (clientId: string, month: string, patch: Omit<ClientMonthlyContentInput, "clientId" | "month">) => Promise<void>;
}
```

- `upsert` actualiza `records` en memoria de forma optimista (reemplaza o
  agrega la fila `clientId+month`), persiste en `localStorage`, hace el
  `POST`, y si falla revierte el estado anterior (mismo patrón que
  `setProgressMode` en `useContentEventsStore`).
- Se agrega `STORAGE_KEYS.clientMonthlyContent` en `constants.ts` y
  `storage.getClientMonthlyContent`/`setClientMonthlyContent` en
  `storage.ts`.
- `AppShell` llama `load()` al montar y agrega el `GET` al `Promise.all` de
  carga remota inicial, igual que el resto de los stores.

## Helpers (`src/lib/client-monthly-content.ts`, nuevo)

```ts
function findMonthlyRecord(records, clientId, month): ClientMonthlyContent | undefined
function getMostRecentContratado(records, clientId, beforeMonth): {
  historiasContratadas, reelsContratados, publicacionesContratadas
} // valores del registro más reciente < beforeMonth con datos; 0 si no hay ninguno
```

`getContratadoProgress` (`src/lib/client-progress.ts`) cambia de firma:
recibe `ClientMonthlyContent | undefined` en vez de `Lead`. Devuelve `null`
si no hay registro o si todo lo contratado es 0 (mismo criterio que hoy).

## UI

**`ClientDataModal` (dentro de `client-detail-view.tsx`)**:
- Nuevas props: `monthKey: string`, `onShiftMonth: (delta: 1 | -1) => void`,
  `monthlyRecord: ClientMonthlyContent | undefined`,
  `prefillContratado: {...}` (resultado de `getMostRecentContratado`),
  `onUpdateMonthly: (patch) => void`.
- Se agrega un header chico arriba de la sección "Contenidos": `‹ AGOSTO
  2026 ›`, reusando `shiftMonth`/`monthLabel` ya definidos en el archivo.
  Como `onShiftMonth` llama al mismo `setMonthKey` que usan las flechitas
  del calendario, cambiar el mes desde la modal mueve también el
  calendario de fondo (y viceversa).
- Los inputs de hecho/contratado leen de `monthlyRecord?.[key] ??
  (es contratadoKey ? prefillContratado[key] : 0)`. Cualquier `onChange`
  llama `onUpdateMonthly` con el objeto completo de 6 campos (valores
  actuales + el campo tocado), para que el upsert mande siempre una fila
  consistente.
- `ClientDetailView` calcula `monthlyRecord`/`prefillContratado` con los
  helpers de arriba usando `contentMonthlyRecords` del store nuevo y pasa
  todo a `ClientDataModal`.

**`/clientes` (`clientes-view.tsx`)**:
- `ClientesView` suscribe `useClientMonthlyContentStore((s) => s.records)`.
- `getProgress(lead)` en modo `"contratado"` pasa a llamar
  `getContratadoProgress(findMonthlyRecord(records, lead.id,
  currentMonthBA()))`.
- `ClientCard.contenidoRows` recibe el registro del mes actual como prop
  (calculado en `ClientesView`) en vez de leer `lead[hechoKey]` /
  `lead[contratadoKey]` directamente.
- Si no hay registro para el mes en curso, el comportamiento visual es
  idéntico al actual con contratado=0 (fila oculta, círculo gris "—").

## Testing

- `src/lib/client-monthly-content.test.ts` (nuevo): casos de
  `findMonthlyRecord` (encuentra / no encuentra) y `getMostRecentContratado`
  (elige el mes más reciente anterior con datos, ignora meses sin datos,
  devuelve 0 si no hay ninguno).
- `src/lib/client-progress.test.ts`: actualizar `getContratadoProgress` para
  la nueva firma (recibe `ClientMonthlyContent | undefined`).
- `src/lib/supabase/adapters.test.ts`: sacar las expectativas de
  `historiasHechas` etc. que se agregaron para `Lead` en la sesión
  anterior (ya no existen ahí).
- Nuevo `src/lib/supabase/client-monthly-content.test.ts` (adapter/
  serializer fila↔dominio) si se agrega un adapter dedicado, siguiendo el
  patrón de `bulk-event-series.test.ts`.

## Fuera de alcance

- No se migra historial retroactivo de meses anteriores a agosto 2026 (no
  existe ese dato).
- No hay UI para "borrar" un mes puntual del historial.
- El resto de los campos de "Datos del cliente" (contacto, credenciales,
  etc.) no cambia — siguen siendo del `Lead`, sin mes.
