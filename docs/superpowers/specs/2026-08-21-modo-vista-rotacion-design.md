# Modo Vista — rotación automática de pestañas — diseño

Fecha: 2026-08-21
Alcance: `src/` (Next.js). No toca el HTML legacy ni `mobile-crm/`.

## Contexto y problema

Ciro quiere un "modo vista" pensado para dejar la app mostrándose sola
(ej. en una pantalla/TV) navegando entre las pestañas de la app sin
intervención manual. Necesita poder elegir, desde el engranaje de
configuración:

- Qué pestañas entran en la rotación (no todas necesariamente).
- Cuánto tiempo se queda en cada una antes de pasar a la siguiente.
- Prender/apagar el modo cuando quiera.

## Decisiones tomadas con el usuario

- El control vive en el menú del engranaje (`SettingsMenu` en
  `src/components/layout/sidebar.tsx`), como una opción nueva "Modo
  Vista" que abre un modal dedicado (mismo patrón visual que
  `ApiSettingsModal` / `column-widths-modal.tsx`).
- El modal tiene: un switch maestro "Activar modo vista", y una lista
  de las pestañas de `TABS` (`src/lib/constants.ts`) con checkbox
  "incluir en rotación" + input numérico de segundos por pestaña
  incluida.
- El orden de rotación es el **orden fijo del array `TABS`**, filtrado
  a las pestañas marcadas — no hay drag-and-drop para reordenar (YAGNI,
  se puede sumar después si hace falta).
- Si no se especifica duración para una pestaña, se usa un default de
  15 segundos.
- Si el usuario navega manualmente mientras el modo vista está activo,
  no se bloquea el click ni se resetea nada — el próximo tick del timer
  simplemente sigue el ciclo desde donde estaba. Apagar el switch corta
  el timer.
- No hay pausa automática por inactividad ni detección de interacción.

## Estado (`src/store/app-settings.ts`)

Nuevo bloque en `AppSettings`:

```ts
viewMode: {
  enabled: boolean;
  tabs: string[];                     // keys de TABS incluidas en la rotación
  durations: Record<string, number>;  // segundos por key (default 15 si falta)
}
```

Default en `DEFAULT_APP_SETTINGS`: `{ enabled: false, tabs: [], durations: {} }`.
Persiste en `localStorage` igual que el resto de `settings` (ya cubierto
por el mecanismo genérico `persist()` del store — no hace falta código
nuevo de persistencia).

## Modal `ViewModeModal`

Nuevo archivo `src/components/layout/view-mode-modal.tsx`, siguiendo el
patrón de `column-widths-modal.tsx` (modal simple, `update(patch)` del
store al cerrar o en cada cambio).

Contenido:
- Switch maestro (lee/escribe `settings.viewMode.enabled`).
- Por cada `tab` de `TABS`: checkbox (¿está en `viewMode.tabs`?) + input
  numérico de segundos (lee/escribe `viewMode.durations[tab.key]`,
  placeholder `15`). El input se deshabilita si el checkbox no está
  marcado.
- Botón "Listo" para cerrar (los cambios ya se aplicaron en vivo vía
  `update()`, no hace falta un submit separado).

Se agrega la entrada "Modo Vista" en `SettingsMenu`
(`sidebar.tsx`, junto a "Ancho columnas"), con un estado
`viewModeModalOpen` en `Sidebar` para abrir/cerrar el modal.

## Motor de rotación

Vive en `src/components/layout/app-shell.tsx` (ya es donde se
inicializan los stores y envuelve toda la app, tiene acceso natural a
`router`).

```ts
const viewMode = useAppSettings(s => s.settings.viewMode);
const router = useRouter();

useEffect(() => {
  if (!viewMode.enabled || viewMode.tabs.length === 0) return;

  let idx = 0;
  const activeTabs = TABS.filter(t => viewMode.tabs.includes(t.key));
  if (activeTabs.length === 0) return;

  function tick() {
    router.push(activeTabs[idx].href);
    idx = (idx + 1) % activeTabs.length;
    const duration = (viewMode.durations[activeTabs[idx === 0 ? activeTabs.length - 1 : idx - 1].key] ?? 15) * 1000;
    timeoutId = setTimeout(tick, duration);
  }

  let timeoutId = setTimeout(tick, (viewMode.durations[activeTabs[0].key] ?? 15) * 1000);
  router.push(activeTabs[0].href); // arranca en la primera al activar

  return () => clearTimeout(timeoutId);
}, [viewMode.enabled, viewMode.tabs, viewMode.durations]);
```

(Pseudocódigo — el detalle exacto del closure/índices se ajusta en la
implementación; la idea es: al activarse, navega a la primera pestaña
de la lista y arranca un `setTimeout` con su duración; al cumplirse,
navega a la siguiente y reprograma con la duración de esa pestaña;
vuelve a la primera al llegar al final. El efecto se reinicia
completo si cambian `tabs`, `durations` o `enabled`.)

No requiere cambios en los stores de `leads`/`team`/etc — es puro
`router.push` sobre rutas ya existentes.

## Testing

- Activar modo vista con 2-3 pestañas y duraciones cortas (2-3s) y
  verificar en el browser que rota correctamente y hace loop.
- Verificar que navegar manualmente durante la rotación no rompe el
  ciclo (el próximo tick sigue navegando).
- Verificar que apagar el switch detiene la rotación de inmediato.
- Verificar que la configuración persiste tras recargar la página
  (localStorage).
