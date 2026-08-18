# Selector de mes navegable en /clientes + dropdown de meses global — diseño

Fecha: 2026-08-18
Alcance: `src/` (Next.js). No toca el HTML legacy ni `mobile-crm/`.

## Contexto y problema

`/clientes` (`clientes-view.tsx`) siempre muestra los contadores de
contenidos y el progreso (círculo del header + círculo de cada tarjeta)
del **mes real actual** (`currentMonthBA()`), sin forma de navegar a otro
mes. El usuario quiere poder cambiar de mes desde el header de esa página
(al lado izquierdo de "+ Añadir eventos masivamente") y que las tarjetas
reflejen el mes elegido.

Además, la app ya tiene **7 lugares** con su propio selector "‹ MES AÑO
›" (implementaciones de `monthLabel`/`shiftMonth` duplicadas y no del
todo idénticas entre sí): Dashboard, Calendario general, dos en el
detalle de cliente (header de la página + calendario de contenido/gestión
compartido), el chip de mes del modal "Datos del cliente" (agregado en la
sesión anterior), el subtab-calendario de Clientes, y las métricas de
integrante en Equipo. El usuario quiere que, en los 7, **apretar el
nombre del mes** (no las flechitas) abra una lista desplegable con todos
los meses para saltar directo, **sin que el contenedor padre la recorte**
(varios contenedores en esta app usan `overflow: clip`/`hidden`, por
ejemplo `.clients-v11-panel` y `.client-detail-page`).

## Decisiones tomadas con el usuario

- El dropdown se agrega en los **7 lugares existentes**, no solo en
  Clientes.
- El rango de meses del dropdown es una **ventana fija de 25 meses**
  (12 atrás + mes actual real + 12 adelante), anclada siempre al mes
  real de hoy — no se corre al navegar.
- En `/clientes`, tanto el **círculo de progreso global del header**
  como **cada tarjeta** (conteo de contenidos y su círculo individual)
  reflejan el mes elegido, en ambos modos de progreso (`estado` y
  `contratado`) — a diferencia de `/clientes/[id]`, donde el círculo del
  header se mantiene fijo al mes real (esa distinción sigue vigente ahí,
  no se toca).

## Alternativas descartadas

- **Reusar `ui/dropdown-menu.tsx` (Radix, ya en el proyecto)**:
  descartado — sus clases de Tailwind (`bg-popover`, `text-popover-foreground`,
  `bg-accent`, etc.) dependen de tokens de color (`--popover`, `--accent`)
  que **no existen** en `globals.css` de este proyecto (solo se usa en
  `data-table.tsx`/`nav-user.tsx`/`nav-documents.tsx`, parte del sidebar
  "shadcn nuevo"). Usarlo en las vistas "legacy" (Clientes, Equipo,
  Dashboard, Calendario) renderizaría sin fondo/borde. Se construye un
  popover propio con `react-dom`'s `createPortal` (sin dependencia
  nueva) y CSS que sigue el lenguaje visual ya existente en
  `.cdp-popover` (fondo blanco, borde `#dbe3ef`, `border-radius`,
  `box-shadow`, variante `body.dark-mode`).
- **Unificar `monthLabel` (el texto "AGOSTO 2026" vs "AGOSTO DE 2026" vs
  el de `toLocaleDateString`) en una sola función para los 7 sitios**:
  descartado — el texto visible no es idéntico hoy entre sitios
  (Dashboard/subtab-calendario/member-metrics usan "MES DE AÑO",
  Calendario general usa `Intl.toLocaleDateString`, el detalle de
  cliente usa "MES AÑO" sin "DE"). Forzar un único formato cambiaría
  texto visible en páginas que nadie pidió tocar. Solo se comparte
  `shiftMonth` (matemática de fecha pura, las 5 implementaciones ya son
  funcionalmente idénticas) y el formateador "MES AÑO" que ya comparten
  el detalle de cliente y el chip del modal — el nuevo selector de
  `/clientes` reutiliza ese mismo formato porque es una instancia nueva,
  sin texto previo que preservar.

## Componente nuevo: `MonthPickerMenu`

`src/components/shared/month-picker-menu.tsx` — envuelve **solo el
label** de mes que cada página ya renderiza (nunca las flechitas ‹ ›,
que seguí funcionando igual que hoy).

```ts
interface MonthPickerMenuProps {
  monthKey: string;                    // "YYYY-MM" seleccionado actualmente
  onSelect: (monthKey: string) => void;
  monthLabel: (key: string) => string; // formateador propio de cada página
  className?: string;                  // clases a aplicar al trigger (button)
  style?: React.CSSProperties;         // estilos inline a aplicar al trigger
  children: React.ReactNode;           // contenido visible del trigger (igual que hoy)
}
```

- Renderiza un `<button type="button">` como trigger (reemplaza el
  `<div>`/`<span>` inerte que hay hoy en cada sitio), con el mismo
  `className`/`style` que ya tenía ese elemento — visualmente idéntico,
  ahora cliqueable. Reset de estilos de botón nativo (`background:none;
  border:none; padding:0; font:inherit; cursor:pointer;`) como base,
  para que el `className`/`style` pasado siga controlando la apariencia
  exactamente como antes.
- Al hacer click, calcula la posición del trigger
  (`getBoundingClientRect()`) y monta, vía `createPortal(..., document.body)`,
  un panel `position: fixed` justo debajo, con los 25 meses en grilla de
  2 columnas (`.month-picker-menu` / `.month-picker-menu-item`, nuevas
  clases en `globals.css`, mismo lenguaje visual que `.cdp-popover` +
  variante `body.dark-mode`). El mes actualmente seleccionado se resalta
  (clase `.active`).
- Cierra con: click afuera, tecla Escape, o scroll (de cualquier
  ancestro, capturado en fase de captura) — mismo patrón simple que ya
  usan los popovers existentes de esta app, sin reposicionamiento
  continuo.
- `z-index: 10000` — por encima de cualquier modal existente (los más
  altos usan `9999` inline) pero por debajo del stack de toasts
  (`99999`), porque el chip del modal "Datos del cliente" necesita que
  el dropdown aparezca sobre ese modal.
- Clamp horizontal simple: si el panel se saliera del viewport a la
  derecha, se alinea por la derecha del trigger en vez de la izquierda.

## Helpers compartidos nuevos (`src/lib/dates.ts`)

```ts
/** Shifts a "YYYY-MM" key by `delta` months. */
export function shiftMonth(key: string, delta: number): string { ... }

/** "AGOSTO 2026" — formato compartido por el detalle de cliente y el nuevo selector de /clientes. */
export function monthLabel(key: string): string { ... }

/** Ventana fija de 25 meses (-12 a +12) anclada al mes real de hoy. */
export function monthPickerRange(): string[] { ... }
```

`shiftMonth` reemplaza las 5 copias funcionalmente idénticas ya
existentes (`dashboard-view.tsx`, `subtab-calendario.tsx`,
`member-metrics.tsx`, `general/page.tsx`, `client-detail-view.tsx`).
`calendario-view.tsx` mantiene sus propias `prevMonth`/`nextMonth`
(mismo resultado, nombres distintos) — no se toca para no arriesgar su
formato de label basado en `toLocaleDateString`, que sí se preserva tal
cual.

`monthLabel` reemplaza la copia local en `client-detail-view.tsx` (salida
idéntica, verificado) y la usa también el nuevo selector de
`/clientes`. Las otras 4 páginas mantienen su propio formateador local
sin cambios.

## Integración en los 7 sitios existentes

Cada sitio reemplaza su `<div>`/`<span>` de label (inerte hoy) por
`<MonthPickerMenu monthKey=... onSelect=... monthLabel=...>` con el mismo
contenido/clases adentro. Sin cambios en las flechitas ‹ › ni en los
botones "HOY"/"MES ACTUAL" existentes.

| Archivo | Estado/mes | `monthLabel` a pasar |
|---|---|---|
| `dashboard-view.tsx` | `selectedMonth`/`handleMonth` | su `monthLabel` local ("MES DE AÑO") |
| `calendario-view.tsx` | `selectedMonth`/`handleMonthChange` | su `monthLabel` local (`toLocaleDateString`) |
| `general/page.tsx` (`selector`) | `selectedMonth`/`setSelectedMonth` | construido inline (`mesLabel.toUpperCase() + " " + y`) — se envuelve igual, sin extraer función nueva |
| `client-detail-view.tsx` (header página) | `monthKey`/`setMonthKey` | `monthLabel` de `lib/dates.ts` (se quita `pointerEvents:"none"` del `<span>` actual) |
| `client-detail-view.tsx` (chip modal Contenidos) | `monthKey`/nueva prop `onSelectMonth` | `monthLabel` de `lib/dates.ts` |
| `subtab-calendario.tsx` | `monthKey`/`setMonthKey` | su `monthLabel` local ("MES DE AÑO") |
| `member-metrics.tsx` | `monthKey`/`setMonthKey` | su `monthLabel` local ("MES DE AÑO") |

`ClientDataModal` (`client-detail-view.tsx`) hoy solo recibe
`onShiftMonth: (delta: 1 | -1) => void` — insuficiente para saltar
directo a un mes elegido en el dropdown. Se agrega una prop nueva
`onSelectMonth: (monthKey: string) => void`, pasada por `ClientDetailView`
como `setMonthKey` directamente (mismo estado que ya comparten el chip
del modal y el calendario de fondo). `onShiftMonth` no se toca — lo
siguen usando las flechitas ‹ ›.

## `/clientes` — selector de mes nuevo (`clientes-view.tsx`)

- Nuevo estado `const [monthKey, setMonthKey] = useState(currentMonthBA);`.
- `selectedMonthContent` (renombre de `currentMonthContent`): mismo
  `useMemo`, pero filtra por `monthKey` en vez de `currentMonthBA()`.
- `getProgress(lead)`: la rama `estado` pasa `monthKey` a
  `getEstadoProgress` en vez de `currentMonthBA()`; la rama `contratado`
  ya usa el mapa mensual, ahora indexado por `monthKey`.
- `ClientCard` seguí recibiendo `monthlyRecord` igual que hoy — el valor
  que le llega ahora corresponde al mes elegido, no siempre al actual.
- UI nueva en el header, en `client-panel-actions`, **antes** del botón
  "+ Añadir eventos masivamente": `‹` (btn-sm btn-outline) +
  `<MonthPickerMenu monthKey={monthKey} onSelect={setMonthKey}
  monthLabel={monthLabel} className="btn btn-sm btn-outline">{monthLabel(monthKey)}</MonthPickerMenu>`
  + `›` — mismo estilo visual que el header de `/clientes/[id]`.

## Testing

- Sin tests automatizados nuevos — estos son componentes de página React
  sin lógica de dominio aislable más allá de `shiftMonth`/`monthLabel`/
  `monthPickerRange`, que si son puros y testeables:
  `src/lib/dates.test.ts` (nuevo, o agregado si ya existe) cubre:
  `shiftMonth` cruzando fin de año en ambas direcciones,
  `monthLabel` para cada mes, `monthPickerRange` devuelve 25 elementos
  ordenados y centrados en `currentMonthBA()`.
- Verificación manual: `npm run type-check` + smoke test visual en los 8
  lugares (7 existentes + `/clientes` nuevo) — abrir el dropdown, elegir
  un mes lejano, confirmar que no se recorta contra el contenedor
  padre, y que las tarjetas de `/clientes` cambian sus contadores al
  mes elegido.

## Fuera de alcance

- No se cambia el formato de texto visible de ningún selector existente
  (solo se agrega la interactividad del dropdown).
- No se toca el comportamiento del círculo de progreso del header en
  `/clientes/[id]` (sigue fijo al mes real — decisión de la sesión
  anterior, no se revierte).
- `calendario-view.tsx` no comparte `monthLabel`/`shiftMonth`
  (mantiene `prevMonth`/`nextMonth` y su propio formateador) para no
  arriesgar su salida `toLocaleDateString`.
