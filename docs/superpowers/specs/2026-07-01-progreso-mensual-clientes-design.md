# Progreso mensual en tarjetas de Clientes

## Problema

En `/clientes`, cada tarjeta de cliente muestra un círculo de progreso y un contador ("X contenidos") calculados sobre **todos** los `ContentEvent` históricos del cliente (`src/components/clientes/clientes-view.tsx`, funciones `getProgress` y `getContentCount`, líneas ~172-181). Esto no refleja el trabajo del mes en curso: un cliente con contenidos viejos completos sigue mostrando alto progreso aunque el mes actual esté vacío.

## Objetivo

El círculo de progreso y el contador deben reflejar únicamente los contenidos del **mes actual** (zona horaria Buenos Aires). Al cambiar de mes, si el cliente todavía no tiene contenidos cargados para el mes nuevo, la tarjeta debe mostrarlo con un estado visual distinto a "0% hecho".

## Alcance

Cambios acotados a `src/components/clientes/clientes-view.tsx`. No se toca el modelo de datos (`ContentEvent`), ni Supabase, ni otras vistas (planificación, calendario, etc.).

## Diseño

### Filtro por mes

- Se usa `currentMonthBA()` (ya existente en `src/lib/dates.ts`, retorna `YYYY-MM` en huso horario de Buenos Aires).
- `getProgress(clientId)` y `getContentCount(clientId)` primero filtran los `ContentEvent` del cliente por:
  - `e.clientId === clientId`
  - `e.scheduledDate` definido y su prefijo `YYYY-MM` igual a `currentMonthBA()`
- Eventos sin `scheduledDate` se excluyen del cálculo (no cuentan para ningún mes).

### Estado "sin contenidos este mes"

- Si el filtro anterior da **0 eventos**, `getProgress` retorna `null` (en vez de `0`) para distinguir "nada cargado este mes" de "cargado pero sin hacer".
- `ClientCard` recibe `progress: number | null`:
  - Si `progress === null`: el círculo se renderiza en un estilo neutro/gris (nueva clase CSS `progress-none`, sin relleno de `--pct`) mostrando `—` en vez de un porcentaje, y el texto debajo del círculo dice "Sin contenidos este mes" en vez de "X contenidos".
  - Si `progress` es un número: comportamiento actual (círculo verde/ámbar/rojo según `progressClass`, con `{pct}%`), y el contador debajo muestra "X contenidos" con X = cantidad de eventos del mes actual.

### Recálculo automático al cambiar de mes

No requiere ninguna acción manual: `currentMonthBA()` se evalúa en cada render, así que al llegar el día 1 del mes siguiente, el filtro cambia solo y, si no hay contenidos cargados para el nuevo mes, la tarjeta pasa automáticamente al estado "Sin contenidos este mes".

## Fuera de alcance

- No se modifica cómo se cargan/crean los `ContentEvent` (eso vive en planificación).
- No se agrega selector de mes en la vista de Clientes — siempre muestra el mes en curso.
- No se toca el conteo o vista de `/planificacion`, que puede seguir mostrando todos los contenidos sin filtrar (fuera del pedido actual).
