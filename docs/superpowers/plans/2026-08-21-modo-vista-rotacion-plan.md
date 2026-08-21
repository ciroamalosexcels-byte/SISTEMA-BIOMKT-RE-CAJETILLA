# Modo Vista — rotación automática de pestañas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar la app rotando sola entre pestañas elegidas por el usuario, con duración configurable por pestaña, controlado desde el engranaje de configuración.

**Architecture:** Nuevo bloque `viewMode` en el store `useAppSettings` (persistido en localStorage como el resto de `settings`). Un modal nuevo (`ViewModeModal`) edita ese bloque en vivo. Un efecto en `AppShell` (que ya envuelve toda la app y corre en cada ruta) lee `viewMode` y hace `router.push()` en loop con `setTimeout` cuando está activo.

**Tech Stack:** Next.js 15 App Router, Zustand 5, `next/navigation` (`useRouter`), TypeScript. Sin librerías nuevas.

**Spec:** `docs/superpowers/specs/2026-08-21-modo-vista-rotacion-design.md`

## Global Constraints

- No hay suite de tests automatizados en este proyecto (`package.json` solo tiene `dev`/`build`/`start`/`lint`/`type-check`). La verificación de cada tarea es `npm run type-check` + prueba manual en el browser (`npm run dev`), no tests unitarios.
- Nunca usar un selector de Zustand que devuelva un objeto/array nuevo en cada llamada (regla de `CLAUDE.md` — usar `useShallow` o subscribirse al array crudo). Los selectores de este plan devuelven siempre el mismo campo del store sin transformarlo, así que no aplica `useShallow` aquí, pero no violarlo al editar.
- Duración default por pestaña cuando no está configurada: **15 segundos**.
- El orden de rotación es el orden fijo del array `TABS` de `src/lib/constants.ts`, filtrado a las keys marcadas — no hay reordenamiento manual.

---

### Task 1: Estado `viewMode` en `useAppSettings`

**Files:**
- Modify: `src/store/app-settings.ts:14-43` (interface `AppSettings`), `src/store/app-settings.ts:45-82` (`DEFAULT_APP_SETTINGS`)

**Interfaces:**
- Produces: `AppSettings.viewMode: { enabled: boolean; tabs: string[]; durations: Record<string, number> }`, accesible vía `useAppSettings(s => s.settings.viewMode)` y actualizable vía `useAppSettings(s => s.update)({ viewMode: {...} })`.

- [ ] **Step 1: Agregar el campo a la interface `AppSettings`**

En `src/store/app-settings.ts`, dentro de la interface `AppSettings` (línea 14), agregar después de `selectedPlanName: string;` (línea 42):

```ts
  selectedPlanName: string;
  viewMode: {
    enabled: boolean;
    tabs: string[];
    durations: Record<string, number>;
  };
}
```

- [ ] **Step 2: Agregar el default**

En `DEFAULT_APP_SETTINGS` (línea 45), agregar después de `selectedPlanName: PLAN_NAMES[0],` (línea 81):

```ts
  selectedPlanName: PLAN_NAMES[0],
  viewMode: {
    enabled: false,
    tabs: [],
    durations: {},
  },
};
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores nuevos relacionados a `app-settings.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/store/app-settings.ts
git commit -m "feat(settings): agregar estado viewMode para rotación de pestañas"
```

---

### Task 2: Componente `ViewModeModal`

**Files:**
- Create: `src/components/layout/view-mode-modal.tsx`

**Interfaces:**
- Consumes: `useAppSettings` (`s.settings.viewMode`, `s.update`) de Task 1. `TABS` de `src/lib/constants.ts:81-97` (`{key, label, href}[]`).
- Produces: `export function ViewModeModal({ onClose }: { onClose: () => void })` — componente listo para montar desde `Sidebar`.

- [ ] **Step 1: Crear el archivo del modal**

Crear `src/components/layout/view-mode-modal.tsx` con este contenido completo:

```tsx
"use client";

import { useAppSettings } from "@/store/app-settings";
import { TABS } from "@/lib/constants";

interface Props {
  onClose: () => void;
}

const DEFAULT_DURATION = 15;

export function ViewModeModal({ onClose }: Props) {
  const viewMode = useAppSettings((s) => s.settings.viewMode);
  const update = useAppSettings((s) => s.update);

  function toggleEnabled() {
    update({ viewMode: { ...viewMode, enabled: !viewMode.enabled } });
  }

  function toggleTab(key: string) {
    const tabs = viewMode.tabs.includes(key)
      ? viewMode.tabs.filter((k) => k !== key)
      : [...viewMode.tabs, key];
    update({ viewMode: { ...viewMode, tabs } });
  }

  function setDuration(key: string, seconds: number) {
    update({
      viewMode: {
        ...viewMode,
        durations: { ...viewMode.durations, [key]: seconds },
      },
    });
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Modo Vista</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", maxHeight: "65vh" }}>
          <label
            className="flex items-center justify-between gap-3"
            style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}
          >
            Activar modo vista
            <input
              type="checkbox"
              checked={viewMode.enabled}
              onChange={toggleEnabled}
              style={{ width: 18, height: 18 }}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {TABS.map((tab) => {
              const included = viewMode.tabs.includes(tab.key);
              return (
                <div
                  key={tab.key}
                  className="flex items-center justify-between gap-3"
                  style={{ padding: "4px 0" }}
                >
                  <label
                    className="flex items-center gap-2"
                    style={{ fontSize: 12, fontWeight: 600, flex: 1 }}
                  >
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={() => toggleTab(tab.key)}
                    />
                    {tab.label}
                  </label>
                  <input
                    type="number"
                    min={1}
                    disabled={!included}
                    value={viewMode.durations[tab.key] ?? DEFAULT_DURATION}
                    onChange={(e) =>
                      setDuration(tab.key, Math.max(1, parseInt(e.target.value) || DEFAULT_DURATION))
                    }
                    className="column-settings-input"
                    style={{ width: 64, opacity: included ? 1 : 0.4 }}
                  />
                  <span style={{ fontSize: 11, opacity: 0.6 }}>seg</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-dark" onClick={onClose}>Listo</button>
        </div>
      </div>
    </div>
  );
}
```

Nota: reutiliza las clases CSS globales `modal-backdrop`, `modal`, `modal-header`, `modal-title`, `icon-btn`, `modal-footer`, `btn btn-dark` y `column-settings-input` — ya existen (usadas en `column-widths-modal.tsx`), no hace falta CSS nuevo.

- [ ] **Step 2: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/view-mode-modal.tsx
git commit -m "feat(settings): modal ViewModeModal para configurar rotación de pestañas"
```

---

### Task 3: Entrada "Modo Vista" en el engranaje de configuración

**Files:**
- Modify: `src/components/layout/sidebar.tsx:1-13` (imports), `src/components/layout/sidebar.tsx:114-198` (`SettingsMenu`), `src/components/layout/sidebar.tsx:203-495` (`Sidebar`)

**Interfaces:**
- Consumes: `ViewModeModal` de Task 2 (`import { ViewModeModal } from "./view-mode-modal"`).
- Produces: botón "Modo Vista" visible en el menú del engranaje que abre el modal.

- [ ] **Step 1: Importar `Eye` de lucide-react y `ViewModeModal`**

En `src/components/layout/sidebar.tsx`, en el import de lucide-react (líneas 6-13), agregar `Eye` a la lista:

```ts
import {
  TrendingUp, Users, Building2,
  Moon, Sun, RefreshCw, Upload, Save,
  ChevronLeft, ChevronDown, Bell, Settings, Eye,
  LayoutDashboard, GitMerge, UserCheck, CalendarDays,
  ClipboardList, Map, FileText, Users2, MessageSquare,
  BriefcaseBusiness, BarChart3, Database, LogOut, LogIn,
} from "lucide-react";
```

Después de la línea `import { ColumnWidthsModal } from "./column-widths-modal";` (línea 17), agregar:

```ts
import { ViewModeModal } from "./view-mode-modal";
```

- [ ] **Step 2: Agregar el prop `onViewMode` a `SettingsMenu` y el botón**

En la firma de `SettingsMenu` (línea 114), agregar `onViewMode` a las props:

```tsx
function SettingsMenu({ onClose, onImport, onApiSettings, onColWidths, onViewMode, sidebarW, onSync, syncing, isAdmin }: {
  onClose: () => void; onImport: () => void;
  onApiSettings: () => void; onColWidths: () => void; onViewMode: () => void;
  sidebarW: number;
  onSync?: () => void; syncing?: boolean; isAdmin?: boolean;
}) {
```

Después del botón "Ancho columnas" (línea 159), agregar:

```tsx
      <button className={MBTN} onClick={() => { onColWidths(); onClose(); }}><Settings size={17} /> Ancho columnas</button>
      <button className={MBTN} onClick={() => { onViewMode(); onClose(); }}><Eye size={17} /> Modo Vista</button>
```

- [ ] **Step 3: Agregar el estado y el render del modal en `Sidebar`**

En `Sidebar` (línea 203+), junto al estado `colWidthsOpen` (línea 212), agregar:

```ts
  const [colWidthsOpen, setColWidthsOpen] = useState(false);
  const [viewModeOpen, setViewModeOpen] = useState(false);
```

En el render de `<SettingsMenu>` (líneas 477-486), agregar el prop:

```tsx
          <SettingsMenu
            onClose={() => setSettingsOpen(false)}
            onImport={() => setImportOpen(true)}
            onApiSettings={() => setApiSettingsOpen(true)}
            onColWidths={() => setColWidthsOpen(true)}
            onViewMode={() => setViewModeOpen(true)}
            sidebarW={sidebarW}
            onSync={handleDbSync}
            syncing={dbSyncing}
            isAdmin={user?.role === "admin"}
          />
```

Junto al render de `{colWidthsOpen && <ColumnWidthsModal onClose={() => setColWidthsOpen(false)} />}` (línea 491), agregar:

```tsx
      {colWidthsOpen   && <ColumnWidthsModal onClose={() => setColWidthsOpen(false)} />}
      {viewModeOpen    && <ViewModeModal onClose={() => setViewModeOpen(false)} />}
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 5: Prueba manual**

Run: `npm run dev`, abrir `http://localhost:3000`, click en el engranaje "Configuración" → debe aparecer "Modo Vista" en la lista, click lo abre y muestra la lista completa de pestañas con checkbox + input de segundos.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(settings): agregar entrada Modo Vista al menú de configuración"
```

---

### Task 4: Motor de rotación en `AppShell`

**Files:**
- Modify: `src/components/layout/app-shell.tsx:1-18` (imports), `src/components/layout/app-shell.tsx:24-32` (cuerpo del componente, sección de hooks de settings)

**Interfaces:**
- Consumes: `useAppSettings(s => s.settings.viewMode)` de Task 1, `TABS` de `src/lib/constants.ts`, `useRouter` de `next/navigation`.

- [ ] **Step 1: Importar `useRouter` y `TABS`**

En `src/components/layout/app-shell.tsx`, agregar a los imports (después de la línea 17 `import { todayBA } from "@/lib/dates";`):

```ts
import { todayBA } from "@/lib/dates";
import { useRouter } from "next/navigation";
import { TABS } from "@/lib/constants";
```

- [ ] **Step 2: Leer `viewMode` del store y agregar el efecto de rotación**

Dentro de `export function AppShell({ children }: AppShellProps) {` (línea 24), después de la línea `const addNotification = useAppSettings((s) => s.addNotification);` (línea 31), agregar:

```ts
  const addNotification = useAppSettings((s) => s.addNotification);
  const viewMode = useAppSettings((s) => s.settings.viewMode);
  const router = useRouter();
```

Después del segundo `useEffect` existente (el de Ctrl+Z/Ctrl+Y, que termina en la línea 153 con `}, []);`), agregar un nuevo efecto:

```ts
  /* ─── Modo Vista: rotación automática entre pestañas ─────────── */
  useEffect(() => {
    if (!viewMode.enabled) return;
    const activeTabs = TABS.filter((t) => viewMode.tabs.includes(t.key));
    if (activeTabs.length === 0) return;

    let idx = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    function goToCurrent() {
      router.push(activeTabs[idx].href);
      const seconds = viewMode.durations[activeTabs[idx].key] ?? 15;
      timeoutId = setTimeout(advance, seconds * 1000);
    }

    function advance() {
      idx = (idx + 1) % activeTabs.length;
      goToCurrent();
    }

    goToCurrent();

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode.enabled, viewMode.tabs, viewMode.durations]);
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 4: Prueba manual — rotación funciona**

Run: `npm run dev`. En el modal "Modo Vista", marcar 2-3 pestañas (ej. Dashboard, CRM, Clientes) con 3 segundos cada una, activar el switch. Verificar en el browser que la URL cambia sola cada ~3 segundos siguiendo el orden marcado y hace loop al llegar a la última.

- [ ] **Step 5: Prueba manual — navegar manualmente no rompe el ciclo**

Con el modo vista activo, hacer click en un link del sidebar hacia otra pestaña no incluida en la rotación. Verificar que en el próximo tick el timer sigue navegando a la siguiente pestaña configurada (no se traba ni tira error en consola).

- [ ] **Step 6: Prueba manual — apagar corta la rotación**

Abrir "Modo Vista" y desactivar el switch. Verificar que la URL deja de cambiar sola.

- [ ] **Step 7: Prueba manual — persistencia**

Con el modo vista activo y configurado, recargar la página (F5). Verificar que sigue activo y sigue rotando con la misma configuración (localStorage).

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/app-shell.tsx
git commit -m "feat(settings): motor de rotación automática para Modo Vista"
```

---

## Self-Review Notes

- **Cobertura del spec:** switch maestro (Task 2), checkbox + duración por pestaña (Task 2), entrada en el engranaje (Task 3), motor de rotación con loop y default de 15s (Task 4), no bloquear navegación manual (Task 4 Step 5), persistencia vía localStorage ya cubierta por el mecanismo genérico de `useAppSettings` (Task 1, sin trabajo adicional). Todo lo del spec tiene tarea.
- **Placeholders:** ninguno — todos los steps tienen código completo.
- **Consistencia de tipos:** `viewMode.tabs: string[]`, `viewMode.durations: Record<string, number>`, `viewMode.enabled: boolean` se usan idénticos en Task 1 (definición), Task 2 (modal) y Task 4 (motor).
