# Migración a Tailwind CSS — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los ~2525 líneas de CSS custom en `globals.css` por clases de Tailwind directamente en los componentes, eliminando la necesidad de mantener un archivo CSS monolítico.

**Architecture:** Migración progresiva por módulos — primero configurar Tailwind v4 correctamente (colores brand + dark mode con clase), luego migrar componente por componente empezando por los más usados (sidebar, kanban, dashboard), dejando el CSS legacy en `globals.css` para los módulos viejos hasta migrarlos. Cada tarea es un commit autónomo que no rompe nada.

**Tech Stack:** Next.js 15, Tailwind CSS v4 (`@tailwindcss/postcss`), `dark:` variants con selector `.dark-mode`, clsx + tailwind-merge ya instalados.

---

## Estado actual del proyecto

- `src/app/globals.css` → 2525 líneas, 711 clases custom, 241 overrides `body.dark-mode`
- Dark mode: `document.body.classList.toggle("dark-mode", ...)` en `src/store/app-settings.ts`
- Tailwind v4 ya instalado (`@import "tailwindcss"` en globals.css, postcss configurado)
- Sin `tailwind.config.ts` — Tailwind v4 permite configurar todo en CSS

## Archivos por módulo

| Módulo | Archivos a modificar |
|---|---|
| Config | `src/app/globals.css`, `tailwind.config.ts` (crear) |
| Layout | `src/components/layout/sidebar.tsx`, `src/components/layout/app-shell.tsx` |
| Kanban | `src/components/seguimiento/seguimiento-view.tsx`, `kanban-column.tsx`, `lead-card.tsx`, `lead-modal.tsx` |
| Dashboard | `src/components/dashboard/dashboard-view.tsx`, `src/components/ui/table.tsx` |
| UI Shared | `src/components/ui/table.tsx`, `src/components/layout/api-settings-modal.tsx` |

---

## Tarea 1 — Configurar Tailwind v4 con colores brand y dark mode

**Archivos:**
- Crear: `tailwind.config.ts`
- Modificar: `src/app/globals.css` (primeras 60 líneas del `:root` block)

### Por qué
Tailwind v4 usa `@import "tailwindcss"` pero sin un `tailwind.config.ts` no puede usar `dark:` variants con clase. Necesitamos declarar la estrategia `selector` para que `dark:bg-slate-900` funcione cuando `body` tiene la clase `dark-mode`.

- [ ] **Step 1: Crear `tailwind.config.ts`**

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["selector", ".dark-mode"],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        amber:    "#f6bf26",
        "amber-2":"#ffe8a8",
        "amber-3":"#9a6700",
        "bio-dark":  "#07152f",
        "bio-dark-2":"#020817",
        "bio-rail":  "#020817",
        "bio-panel": "#07152f",
        "bio-bg":    "#dbe1e7",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
    },
  },
} satisfies Config;
```

- [ ] **Step 2: Vincular el config en globals.css**

Reemplazar la primera línea de `src/app/globals.css`:
```css
/* ANTES */
@import "tailwindcss";

/* DESPUÉS */
@import "tailwindcss";
@config "../tailwind.config.ts";
```

- [ ] **Step 3: Verificar que dark: funciona**

En cualquier componente `"use client"` temporal, agregar:
```tsx
<div className="bg-white dark:bg-slate-900 text-black dark:text-white p-4">
  Test dark mode
</div>
```
Activar dark mode desde el sistema → el div debe cambiar de color.
Luego remover el div de prueba.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts src/app/globals.css
git commit -m "chore: configure Tailwind v4 dark mode selector + brand colors"
```

---

## Tarea 2 — Migrar el Sidebar (rail + panel)

**Archivos:**
- Modificar: `src/components/layout/sidebar.tsx`
- No hay CSS que agregar — se eliminan las clases del CSS

### Mapeo CSS → Tailwind

| Clase CSS | Tailwind equivalente |
|---|---|
| `.sidebar-rail` | `w-[52px] bg-bio-rail flex flex-col items-center py-3 gap-1 z-50 border-r border-white/[0.04] flex-shrink-0` |
| `.rail-logo` | `w-[34px] h-[34px] bg-amber text-bio-dark rounded-lg flex items-center justify-center text-sm font-black mb-2.5 flex-shrink-0` |
| `.rail-ws.active` | `bg-amber/[0.14] text-amber` |
| `.rail-ws:not(.active)` | `text-slate-600 hover:bg-white/[0.06] hover:text-slate-400` |
| `.rail-ws` (base) | `w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors flex-shrink-0 border-none` |
| `.rail-spacer` | `flex-1` |
| `.rail-util` | `w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-slate-600 hover:text-slate-400 hover:bg-white/[0.06] transition-colors border-none bg-transparent` |
| `.rail-util.notif-active` | `text-amber` |
| `.sidebar-panel` | `flex-shrink-0 bg-bio-panel flex flex-col overflow-hidden transition-[width] duration-200 border-r border-white/[0.04] relative z-[49]` |
| `.panel-collapsed` | `w-0` (vs default `w-[200px]`) |
| `.panel-header` | `px-3.5 pt-3.5 pb-2.5 flex items-center justify-between border-b border-white/[0.05] flex-shrink-0 whitespace-nowrap overflow-hidden` |
| `.panel-workspace-name` | `text-[10px] font-black text-amber tracking-[0.1em] uppercase` |
| `.panel-collapse-btn` | `w-5 h-5 rounded flex items-center justify-center text-slate-600 cursor-pointer hover:text-slate-400 hover:bg-white/[0.06] transition-colors bg-transparent border-none flex-shrink-0` |
| `.panel-nav` | `flex-1 overflow-y-auto py-1.5` |
| `.panel-link` | `flex items-center gap-2 px-3.5 py-[7px] text-xs font-semibold text-[#2d4a6b] hover:text-[#6b8db5] hover:bg-white/[0.03] no-underline transition-colors whitespace-nowrap overflow-hidden` |
| `.panel-link.active` | `text-amber bg-amber/[0.07] font-bold` |
| `.panel-footer` | `px-2 pb-2.5 pt-2 border-t border-white/[0.05] flex flex-col gap-0.5 flex-shrink-0 min-w-[200px]` |
| `.panel-footer-btn` | `flex items-center gap-2 px-2 py-[7px] text-[11px] font-semibold text-[#1e3a5f] rounded-md hover:text-[#4b7ab5] hover:bg-white/[0.04] transition-colors whitespace-nowrap bg-transparent border-none cursor-pointer` |
| `.panel-footer-btn.dirty` | `text-amber` |
| `.panel-expand-btn` | `fixed left-[52px] top-1/2 -translate-y-1/2 w-4 h-10 bg-bio-panel rounded-r-md flex items-center justify-center cursor-pointer text-slate-600 z-[48] border border-white/[0.05] border-l-0 hover:text-amber transition-colors` |

- [ ] **Step 1: Reescribir el `<aside>` del rail**

En `src/components/layout/sidebar.tsx`, reemplazar el bloque:
```tsx
{/* ── Rail ─────────────────────────────────────────────────── */}
<aside className="sidebar-rail">
  <div className="rail-logo">B</div>
  {WORKSPACE_CONFIGS.map(({ key, Icon, label }) => (
    <button
      key={key}
      className={`rail-ws${mode === key ? " active" : ""}`}
      onClick={() => switchWorkspace(key)}
      title={label}
    >
      <Icon size={18} />
    </button>
  ))}
  <div className="rail-spacer" />
  {/* Dark / Light toggle */}
  <button className="rail-util" ... >
  <button className={`rail-util${hasUnread ? " notif-active" : ""}`} ...>
  <button ref={settingsRef} className="rail-util" ...>
</aside>
```

Por:
```tsx
<aside className="w-[52px] bg-bio-rail flex flex-col items-center py-3 gap-1 z-50 border-r border-white/[0.04] flex-shrink-0">
  <div className="w-[34px] h-[34px] bg-amber text-bio-dark rounded-lg flex items-center justify-center text-sm font-black mb-2.5 flex-shrink-0">
    B
  </div>

  {WORKSPACE_CONFIGS.map(({ key, Icon, label }) => (
    <button
      key={key}
      className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-colors border-none flex-shrink-0 ${
        mode === key
          ? "bg-amber/[0.14] text-amber"
          : "bg-transparent text-slate-600 hover:bg-white/[0.06] hover:text-slate-400"
      }`}
      onClick={() => switchWorkspace(key)}
      title={label}
    >
      <Icon size={18} />
    </button>
  ))}

  <div className="flex-1" />

  <button
    className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-slate-600 hover:text-slate-400 hover:bg-white/[0.06] transition-colors border-none bg-transparent"
    title={settings.darkMode ? "Modo claro" : "Modo noche"}
    onClick={() => update({ darkMode: !settings.darkMode })}
  >
    {settings.darkMode ? <Sun size={16} /> : <Moon size={16} />}
  </button>

  <button
    className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border-none bg-transparent ${hasUnread ? "text-amber" : "text-slate-600 hover:text-slate-400 hover:bg-white/[0.06]"}`}
    title="Notificaciones"
    onClick={() => setNotifOpen(true)}
  >
    <Bell size={16} />
  </button>

  <button
    ref={settingsRef}
    className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-slate-600 hover:text-slate-400 hover:bg-white/[0.06] transition-colors border-none bg-transparent"
    title="Configuración"
    onClick={() => setSettingsOpen((v) => !v)}
  >
    <Settings size={16} />
  </button>
</aside>
```

- [ ] **Step 2: Reescribir el `<aside>` del panel**

Reemplazar:
```tsx
<aside className={`sidebar-panel${collapsed ? " panel-collapsed" : ""}`}>
  <div className="panel-header">
    <span className="panel-workspace-name">{WORKSPACE_TITLES[mode]}</span>
    <button className="panel-collapse-btn" onClick={() => setCollapsed(true)}>
      <ChevronLeft size={14} />
    </button>
  </div>
  <nav className="panel-nav">
    {links.map((link) => {
      const Icon = NAV_ICONS[link.key] ?? FileText;
      return (
        <Link key={link.key} href={link.href}
          className={`panel-link${isActive(link.href) ? " active" : ""}`}>
          <Icon size={14} />
          <span>{link.label}</span>
        </Link>
      );
    })}
  </nav>
  <div className="panel-footer">
    {onSave && (
      <button className={`panel-footer-btn${dirty ? " dirty" : ""}`} ...>
    {onSync && (
      <button className="panel-footer-btn" ...>
  </div>
</aside>
{collapsed && (
  <button className="panel-expand-btn" ...>
```

Por:
```tsx
<aside
  className={`bg-bio-panel flex flex-col overflow-hidden transition-[width] duration-200 border-r border-white/[0.04] relative z-[49] flex-shrink-0 ${
    collapsed ? "w-0" : "w-[200px]"
  }`}
>
  <div className="px-3.5 pt-3.5 pb-2.5 flex items-center justify-between border-b border-white/[0.05] flex-shrink-0 whitespace-nowrap overflow-hidden">
    <span className="text-[10px] font-black text-amber tracking-[0.1em] uppercase">
      {WORKSPACE_TITLES[mode]}
    </span>
    <button
      className="w-5 h-5 rounded flex items-center justify-center text-slate-600 cursor-pointer hover:text-slate-400 hover:bg-white/[0.06] transition-colors bg-transparent border-none flex-shrink-0"
      onClick={() => setCollapsed(true)}
    >
      <ChevronLeft size={14} />
    </button>
  </div>

  <nav className="flex-1 overflow-y-auto py-1.5">
    {links.map((link) => {
      const Icon = NAV_ICONS[link.key] ?? FileText;
      return (
        <Link
          key={link.key}
          href={link.href}
          className={`flex items-center gap-2 px-3.5 py-[7px] text-xs font-semibold no-underline transition-colors whitespace-nowrap overflow-hidden ${
            isActive(link.href)
              ? "text-amber bg-amber/[0.07] font-bold"
              : "text-[#2d4a6b] hover:text-[#6b8db5] hover:bg-white/[0.03]"
          }`}
        >
          <Icon size={14} />
          <span>{link.label}</span>
        </Link>
      );
    })}
  </nav>

  <div className="px-2 pb-2.5 pt-2 border-t border-white/[0.05] flex flex-col gap-0.5 flex-shrink-0 min-w-[200px]">
    {onSave && (
      <button
        className={`flex items-center gap-2 px-2 py-[7px] text-[11px] font-semibold rounded-md hover:bg-white/[0.04] transition-colors whitespace-nowrap bg-transparent border-none cursor-pointer ${
          dirty ? "text-amber" : "text-[#1e3a5f] hover:text-[#4b7ab5]"
        }`}
        onClick={onSave}
        disabled={saving}
      >
        {saving ? <RefreshCw size={13} className="animate-spin" /> : dirty ? <Save size={13} /> : <CheckCheck size={13} />}
        <span>{saving ? "Guardando…" : dirty ? "Guardar en Sheets" : "Todo guardado"}</span>
      </button>
    )}
    {onSync && (
      <button
        className="flex items-center gap-2 px-2 py-[7px] text-[11px] font-semibold text-[#1e3a5f] rounded-md hover:text-[#4b7ab5] hover:bg-white/[0.04] transition-colors whitespace-nowrap bg-transparent border-none cursor-pointer"
        onClick={onSync}
        disabled={syncing}
      >
        <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
        <span>{syncing ? "Sincronizando…" : "Sincronizar Sheets"}</span>
      </button>
    )}
  </div>
</aside>

{collapsed && (
  <button
    className="fixed left-[52px] top-1/2 -translate-y-1/2 w-4 h-10 bg-bio-panel rounded-r-md flex items-center justify-center cursor-pointer text-slate-600 z-[48] border border-white/[0.05] border-l-0 hover:text-amber transition-colors"
    onClick={() => setCollapsed(false)}
  >
    <ChevronRight size={14} />
  </button>
)}
```

- [ ] **Step 3: Eliminar clases del sidebar de globals.css**

Buscar el bloque `/* ── Rail (52px, siempre visible) ───── */` en globals.css y eliminar hasta `/* ── Área de contenido ────── */` inclusive (unas 140 líneas). El resto del CSS de otros módulos no se toca.

- [ ] **Step 4: Verificar en el navegador**

Abrir http://localhost:3000 → el sidebar debe verse igual que antes. Probar colapsar/expandir y cambiar de workspace.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/sidebar.tsx src/app/globals.css
git commit -m "refactor: migrate sidebar to Tailwind classes"
```

---

## Tarea 3 — Migrar AppShell layout

**Archivos:**
- Modificar: `src/components/layout/app-shell.tsx`
- Modificar: `src/app/globals.css` (eliminar `.app-layout`, `.content-area`)

### Mapeo

| Clase CSS | Tailwind |
|---|---|
| `.app-layout` | `flex h-screen overflow-hidden bg-[--bg]` |
| `.content-area` | `flex-1 overflow-y-auto flex flex-col min-w-0 bg-[--bg] dark:bg-[#060e1c]` |

- [ ] **Step 1: Reemplazar el wrapper en app-shell.tsx**

En `src/components/layout/app-shell.tsx`, reemplazar:
```tsx
return (
  <div className="app-layout" style={{ zoom: settings.systemScale }}>
    <Sidebar ... />
    <div className="content-area">
      {children}
    </div>
    {/* Toast stack */}
  </div>
);
```

Por:
```tsx
return (
  <div
    className="flex h-screen overflow-hidden bg-bio-bg dark:bg-[#060e1c]"
    style={{ zoom: settings.systemScale }}
  >
    <Sidebar ... />
    <div className="flex-1 overflow-y-auto flex flex-col min-w-0 bg-bio-bg dark:bg-[#060e1c] [scrollbar-width:thin]">
      {children}
    </div>
    {/* Toast stack — mantiene su CSS existente por ahora */}
    {toasts.length > 0 && (
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="toast-card" onClick={() => dismissToast(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    )}
  </div>
);
```

- [ ] **Step 2: Eliminar de globals.css**

Eliminar los bloques:
```css
/* ── New App Layout (Sidebar doble columna) */
.app-layout { ... }
/* ── Área de contenido ─── */
.content-area { ... }
body.dark-mode .content-area { ... }
```

- [ ] **Step 3: Verificar**

El layout debe verse igual en http://localhost:3000. El sidebar está a la izquierda, contenido a la derecha, sin overflow.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-shell.tsx src/app/globals.css
git commit -m "refactor: migrate app-shell layout to Tailwind"
```

---

## Tarea 4 — Migrar la vista Kanban (Seguimiento)

**Archivos:**
- Modificar: `src/components/seguimiento/seguimiento-view.tsx`
- Modificar: `src/components/seguimiento/kanban-column.tsx`
- Modificar: `src/components/seguimiento/lead-card.tsx`

### Mapeo clave

| Clase CSS | Tailwind |
|---|---|
| `.kb-page` | `flex flex-col h-full min-h-screen bg-bio-bg dark:bg-[#080f1e] text-slate-900 dark:text-slate-200` |
| `.kb-topbar` | `h-[54px] flex items-center px-5 gap-3 border-b border-black/[0.05] dark:border-white/[0.05] bg-white dark:bg-[#080f1e] flex-shrink-0` |
| `.kb-title` | `text-[15px] font-black text-slate-900 dark:text-slate-200` |
| `.kb-subtitle` | `text-[11px] text-slate-400 dark:text-slate-600` |
| `.kb-view-toggle` | `flex gap-0.5 bg-black/[0.05] dark:bg-white/[0.05] p-0.5 rounded-lg` |
| `.kb-view-btn` | `px-[11px] py-1 rounded-md text-[11px] font-bold cursor-pointer border-none bg-transparent text-slate-400 dark:text-slate-600 hover:text-slate-500 transition-colors` |
| `.kb-view-btn.active` | `bg-white dark:bg-white/[0.1] text-slate-900 dark:text-slate-200 shadow-sm` |
| `.kb-add-btn` | `px-3.5 py-1.5 bg-amber text-bio-dark rounded-lg text-xs font-black border-none cursor-pointer hover:opacity-90 transition-opacity` |
| `.kb-board` | `flex-1 overflow-x-auto overflow-y-hidden px-5 py-4 flex gap-3 items-start` |
| `.kb-col` | `flex-shrink-0 w-[220px] bg-black/[0.03] dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] rounded-none flex flex-col max-h-[calc(100vh-110px)]` |
| `.kb-col.drag-over` | `bg-amber/[0.06] border-amber/[0.35]` |
| `.kb-col-head` | `px-3 py-2.5 flex items-center gap-[7px] border-b border-slate-200 dark:border-white/[0.04] flex-shrink-0` |
| `.kb-col-label` | `text-[11px] font-black tracking-[0.04em] uppercase flex-1 truncate` |
| `.kb-col-count` | `text-[10px] text-slate-400 dark:text-slate-600 bg-black/[0.05] dark:bg-white/[0.04] px-[7px] py-px rounded-full font-bold` |
| `.kb-col-body` | `flex-1 overflow-y-auto p-2 flex flex-col gap-1.5` |
| `.kb-col-add` | `mx-2 mb-2 py-1.5 rounded border border-dashed border-slate-300 dark:border-white/[0.06] bg-transparent text-slate-400 dark:text-[#1e3a5f] text-[11px] cursor-pointer text-center hover:border-amber hover:text-slate-500 font-semibold transition-colors` |
| `.kb-card` | `bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-none p-[10px_11px] cursor-pointer transition-all select-none shadow-sm hover:border-amber hover:-translate-y-px hover:shadow-md` |
| `.kb-card-name` | `text-xs font-bold text-slate-900 dark:text-slate-200 mb-0.5 leading-tight` |
| `.kb-card-empresa` | `text-[10px] text-slate-400 dark:text-slate-600 mb-[7px]` |
| `.kb-card-tags` | `flex gap-1 flex-wrap mb-[7px]` |
| `.kb-tag` | `text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-[3px]` |
| `.kb-avatar` | `w-5 h-5 rounded-full bg-slate-100 dark:bg-[#1e3a5f] flex items-center justify-center text-[8px] font-black text-slate-500 dark:text-[#4b7ab5] flex-shrink-0` |
| `.kb-add-col` | `flex-shrink-0 w-12 flex flex-col items-center pt-3 gap-1 cursor-pointer opacity-30 hover:opacity-70 bg-transparent border-none transition-opacity` |

- [ ] **Step 1: Migrar `seguimiento-view.tsx`**

Reemplazar todas las clases `kb-*` en el topbar y board con las clases Tailwind del mapeo. El componente completo queda:

```tsx
// src/components/seguimiento/seguimiento-view.tsx — sección de render
return (
  <div className="flex flex-col h-full min-h-screen bg-bio-bg dark:bg-[#080f1e] text-slate-900 dark:text-slate-200">
    {/* Topbar */}
    <div className="h-[54px] flex items-center px-5 gap-3 border-b border-black/[0.05] dark:border-white/[0.05] bg-white dark:bg-[#080f1e] flex-shrink-0">
      <div>
        <span className="text-[15px] font-black text-slate-900 dark:text-slate-200">Seguimiento</span>
        <span className="text-[11px] text-slate-400 dark:text-slate-600 ml-2.5">
          {totalActive} leads activos
        </span>
      </div>
      <div className="flex-1" />
      <div className="flex gap-0.5 bg-black/[0.05] dark:bg-white/[0.05] p-0.5 rounded-lg">
        <button
          className={`px-[11px] py-1 rounded-md text-[11px] font-bold cursor-pointer border-none transition-colors ${
            viewMode === "kanban"
              ? "bg-white dark:bg-white/[0.1] text-slate-900 dark:text-slate-200 shadow-sm"
              : "bg-transparent text-slate-400 dark:text-slate-600 hover:text-slate-500"
          }`}
          onClick={() => setViewMode("kanban")}
        >
          <LayoutGrid size={13} className="inline mr-1 align-middle" />Kanban
        </button>
        <button
          className={`px-[11px] py-1 rounded-md text-[11px] font-bold cursor-pointer border-none transition-colors ${
            viewMode === "table"
              ? "bg-white dark:bg-white/[0.1] text-slate-900 dark:text-slate-200 shadow-sm"
              : "bg-transparent text-slate-400 dark:text-slate-600 hover:text-slate-500"
          }`}
          onClick={() => setViewMode("table")}
        >
          <List size={13} className="inline mr-1 align-middle" />Tabla
        </button>
      </div>
      <button
        className="px-3.5 py-1.5 bg-amber text-bio-dark rounded-none text-xs font-black border-none cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => openNewLead(sortedStages[0]?.id ?? "CRM")}
      >
        + Nuevo lead
      </button>
    </div>

    {/* Board / Table */}
    {viewMode === "kanban" ? (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-5 py-4 flex gap-3 items-start">
          {sortedStages.map((stage) => (
            <KanbanColumn key={stage.id} stage={stage} leads={leadsForStage(stage.id)}
              onCardClick={openEditLead} onAddLead={openNewLead} />
          ))}
          <button className="flex-shrink-0 w-12 flex flex-col items-center pt-3 gap-1 cursor-pointer opacity-30 hover:opacity-70 bg-transparent border-none transition-opacity"
            onClick={handleAddStage}>
            <div className="w-9 h-9 border-2 border-dashed border-slate-300 dark:border-[#1e293b] rounded-none flex items-center justify-center text-slate-400 dark:text-[#334155]">
              <Plus size={16} />
            </div>
            <div className="text-[9px] text-slate-400 dark:text-[#334155] text-center leading-tight">Nueva<br />etapa</div>
          </button>
        </div>
        <DragOverlay>
          {draggingLead && (
            <div className="bg-white dark:bg-white/[0.08] border-2 border-amber rounded-none p-[10px_11px] shadow-[0_16px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] pointer-events-none rotate-2 w-[220px]">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-200">{draggingLead.nombre}</div>
              {draggingLead.empresa && <div className="text-[10px] text-slate-400 dark:text-slate-600">{draggingLead.empresa}</div>}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    ) : (
      /* Table view - mantiene CSS existente por ahora */
      <div className="kb-table-wrap">
        <table className="kb-table">...</table>
      </div>
    )}

    {selectedLead !== undefined && (
      <LeadModal lead={selectedLead} defaultStageId={defaultStageId} onClose={closeModal} />
    )}
  </div>
);
```

- [ ] **Step 2: Migrar `kanban-column.tsx`**

Reemplazar las clases CSS del componente `KanbanColumn`:

```tsx
// src/components/seguimiento/kanban-column.tsx
return (
  <div
    ref={setNodeRef}
    className={`flex-shrink-0 w-[220px] border flex flex-col max-h-[calc(100vh-110px)] transition-colors ${
      isOver
        ? "bg-amber/[0.04] border-amber/[0.2] dark:bg-amber/[0.04] dark:border-amber/[0.2]"
        : "bg-black/[0.03] dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.05]"
    }`}
  >
    {/* Header */}
    <div className="px-3 py-2.5 flex items-center gap-[7px] border-b border-slate-200 dark:border-white/[0.04] flex-shrink-0">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />

      {editing ? (
        <>
          <input autoFocus value={editLabel} onChange={e => setEditLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && saveEdit()}
            className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded px-[7px] py-0.5 text-[11px] font-bold text-slate-200 outline-none"
          />
          {/* color swatches */}
          <button onClick={saveEdit} className="bg-transparent border-none cursor-pointer text-green-400"><Check size={13} /></button>
          <button onClick={() => setEditing(false)} className="bg-transparent border-none cursor-pointer text-red-400"><X size={13} /></button>
        </>
      ) : (
        <>
          <span className="text-[11px] font-black tracking-[0.04em] uppercase flex-1 truncate" style={{ color: stage.color }}>
            {stage.label}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-600 bg-black/[0.05] dark:bg-white/[0.04] px-[7px] py-px rounded-full font-bold">
            {leads.length}
          </span>
          <button
            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-slate-400 cursor-pointer bg-transparent border-none hover:text-amber transition-all [.kb-col-head:hover_&]:opacity-100"
            onClick={() => setEditing(true)}
          >
            <Pencil size={11} />
          </button>
        </>
      )}
    </div>

    {/* Cards */}
    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
      {leads.map(lead => (
        <LeadCard key={lead.id} lead={lead} stageColor={stage.color} onClick={() => onCardClick(lead)} />
      ))}
    </div>

    {/* Add lead */}
    <button
      className="mx-2 mb-2 py-1.5 border border-dashed border-slate-300 dark:border-white/[0.06] bg-transparent text-slate-400 dark:text-[#1e3a5f] text-[11px] cursor-pointer text-center hover:border-amber hover:text-slate-500 font-semibold transition-colors"
      onClick={() => onAddLead(stage.id)}
    >
      + Agregar lead
    </button>

    {/* Delete stage — mantiene lógica existente */}
    {showDelete && ( ... /* mismo código de confirmación */ )}
  </div>
);
```

- [ ] **Step 3: Migrar `lead-card.tsx`**

```tsx
// src/components/seguimiento/lead-card.tsx
return (
  <div
    ref={setNodeRef}
    style={{ transform: CSS.Translate.toString(transform) }}
    className={`bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] p-[10px_11px] cursor-pointer transition-all select-none shadow-sm hover:border-amber hover:-translate-y-px hover:shadow-md [&:hover_.kb-card-actions]:opacity-100 ${
      isDragging ? "opacity-40 rotate-1" : ""
    }`}
    onClick={onClick}
    {...attributes}
    {...listeners}
  >
    <div className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-0.5 leading-tight">{lead.nombre}</div>
    {lead.empresa && (
      <div className="text-[10px] text-slate-400 dark:text-slate-600 mb-[7px]">{lead.empresa}</div>
    )}
    <div className="flex gap-1 flex-wrap mb-[7px]">
      {MedioIcon && (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-[3px] ${medioTagClass}`}>
          <MedioIcon size={9} /> {lead.medio}
        </span>
      )}
      {displayDate && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-[3px] bg-indigo-100 dark:bg-indigo-500/[0.1] text-indigo-600 dark:text-indigo-400">
          <Calendar size={9} /> {displayDate}
        </span>
      )}
      {isFollowUpToday && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-[3px] bg-red-100 dark:bg-red-500/[0.1] text-red-600 dark:text-red-400">
          <RefreshCw size={9} /> seguir hoy
        </span>
      )}
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-[#1e3a5f] flex items-center justify-center text-[8px] font-black text-slate-500 dark:text-[#4b7ab5] flex-shrink-0">
          {initials}
        </div>
        <span className="text-[10px] text-slate-400 dark:text-[#1e3a5f]">{lead.responsable1}</span>
      </div>
      <div className="kb-card-actions flex gap-0.5 opacity-0 transition-opacity">
        {lead.telefono && (
          <button className="w-[22px] h-[22px] rounded bg-slate-100 dark:bg-white/[0.05] border-none flex items-center justify-center text-slate-400 dark:text-[#334155] cursor-pointer hover:bg-amber/[0.15] hover:text-amber-3 dark:hover:text-amber transition-colors"
            onClick={openWhatsApp}>
            <MessageCircle size={12} />
          </button>
        )}
        <button className="w-[22px] h-[22px] rounded bg-slate-100 dark:bg-white/[0.05] border-none flex items-center justify-center text-slate-400 dark:text-[#334155] cursor-pointer hover:bg-amber/[0.15] hover:text-amber-3 dark:hover:text-amber transition-colors"
          onClick={(e) => { e.stopPropagation(); onClick(); }}>
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  </div>
);
```

- [ ] **Step 4: Eliminar CSS del Kanban de globals.css**

Eliminar el bloque completo:
```
/* ═══ KANBAN — Vista Seguimiento ═══ */
.kb-page { ... }
... todas las clases .kb-* hasta "/* ═══ LEAD MODAL ═══ */"
```

- [ ] **Step 5: Verificar en el navegador**

Abrir http://localhost:3000/seguimiento → el Kanban debe verse igual que antes en light y dark mode. Probar drag de una card entre columnas.

- [ ] **Step 6: Commit**

```bash
git add src/components/seguimiento/
git commit -m "refactor: migrate Kanban Seguimiento to Tailwind classes"
```

---

## Tarea 5 — Migrar el Lead Modal

**Archivos:**
- Modificar: `src/components/seguimiento/lead-modal.tsx`

### Mapeo

| Clase CSS | Tailwind |
|---|---|
| `.lm-backdrop` | `fixed inset-0 bg-slate-900/50 dark:bg-[#020817]/[0.82] backdrop-blur-[4px] flex items-center justify-center z-[200] p-5` |
| `.lm-modal` | `w-full max-w-[680px] bg-white dark:bg-[#0b1628] rounded-none border border-slate-200 dark:border-white/[0.07] max-h-[92vh] flex flex-col shadow-[0_24px_60px_rgba(15,23,42,0.15)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.65)] text-slate-900 dark:text-slate-200` |
| `.lm-top` | `pt-5 px-[22px] flex items-start gap-3 flex-shrink-0` |
| `.lm-name` | `text-[19px] font-black text-slate-900 dark:text-slate-100 mb-0.5 truncate` |
| `.lm-sub` | `text-xs text-slate-400 dark:text-[#334155]` |
| `.lm-close` | `w-[30px] h-[30px] rounded bg-slate-100 dark:bg-white/[0.04] border-none text-slate-400 dark:text-[#475569] cursor-pointer flex items-center justify-center flex-shrink-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/[0.1] dark:hover:text-red-400 transition-colors` |
| `.lm-stages` | `flex gap-1 px-[22px] py-3 border-b border-slate-200 dark:border-white/[0.05] flex-shrink-0 overflow-x-auto` |
| `.lm-stage-pill` | `px-3 py-1 rounded-full text-[10px] font-black cursor-pointer whitespace-nowrap border transition-all bg-slate-50 dark:bg-white/[0.03] text-slate-400 dark:text-[#334155]` |
| `.lm-stage-pill.active` | `border-white/[0.15] text-slate-900 dark:text-slate-200` |
| `.lm-quick` | `flex gap-1 px-[22px] py-2 border-b border-slate-100 dark:border-white/[0.04] flex-shrink-0 flex-wrap` |
| `.lm-quick-btn` | `flex items-center gap-1 px-[11px] py-[5px] rounded border border-slate-200 dark:border-white/[0.06] bg-transparent text-slate-500 dark:text-[#475569] text-[11px] font-bold cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-white/[0.06]` |
| `.lm-body` | `flex-1 overflow-y-auto px-[22px] py-3.5 flex flex-col gap-3.5` |
| `.lm-section-title` | `text-[9px] font-black text-slate-400 dark:text-[#1e3a5f] uppercase tracking-[0.1em] mb-1.5` |
| `.lm-grid` | `grid grid-cols-2 gap-2` |
| `.lm-label` | `text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]` |
| `.lm-input / .lm-select / .lm-textarea` | `bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded py-[7px] px-2.5 text-xs text-slate-900 dark:text-slate-200 transition-colors outline-none focus:border-amber dark:focus:border-amber/[0.3] focus:bg-white dark:focus:bg-white/[0.05] w-full` |
| `.lm-footer` | `px-[22px] py-3 border-t border-slate-200 dark:border-white/[0.05] flex items-center gap-2 flex-shrink-0` |
| `.lm-btn-save` | `px-[18px] py-2 bg-amber text-bio-dark border-none rounded font-black text-xs cursor-pointer hover:opacity-90 transition-opacity` |
| `.lm-btn-cancel` | `px-[13px] py-2 bg-transparent text-slate-500 dark:text-[#334155] border border-slate-200 dark:border-white/[0.06] rounded text-xs cursor-pointer hover:text-slate-700 dark:hover:text-slate-400 transition-colors` |
| `.lm-btn-delete` | `ml-auto px-[13px] py-2 bg-transparent text-red-700 dark:text-[#7f1d1d] border border-red-200 dark:border-red-500/[0.1] rounded text-xs cursor-pointer flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-500/[0.08] hover:text-red-600 dark:hover:text-red-400 transition-colors` |

- [ ] **Step 1: Reescribir `lead-modal.tsx` con Tailwind**

Reemplazar cada `className="lm-*"` con el equivalente Tailwind del mapeo. El archivo debe quedar sin ninguna referencia a clases `lm-`.

El bloque del modal completo:
```tsx
return (
  <div className="fixed inset-0 bg-slate-900/50 dark:bg-[#020817]/[0.82] backdrop-blur-[4px] flex items-center justify-center z-[200] p-5"
    onClick={onClose}>
    <div className="w-full max-w-[680px] bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.07] max-h-[92vh] flex flex-col shadow-[0_24px_60px_rgba(15,23,42,0.15)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.65)] text-slate-900 dark:text-slate-200"
      onClick={(e) => e.stopPropagation()}>

      {/* Top */}
      <div className="pt-5 px-[22px] flex items-start gap-3 flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full mt-[6px] flex-shrink-0" style={{ background: activeStage?.color ?? "#94a3b8" }} />
        <div className="flex-1 min-w-0">
          <div className="text-[19px] font-black text-slate-900 dark:text-slate-100 mb-0.5 truncate">
            {form.nombre || (isNew ? "Nuevo lead" : "—")}
          </div>
          <div className="text-xs text-slate-400 dark:text-[#334155]">
            {form.empresa || "Sin empresa"} · {form.empresaBio}
          </div>
        </div>
        <button className="w-[30px] h-[30px] bg-slate-100 dark:bg-white/[0.04] border-none text-slate-400 dark:text-[#475569] cursor-pointer flex items-center justify-center flex-shrink-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/[0.1] dark:hover:text-red-400 transition-colors"
          onClick={onClose}>
          <X size={15} />
        </button>
      </div>

      {/* Stage pills */}
      <div className="flex gap-1 px-[22px] py-3 border-b border-slate-200 dark:border-white/[0.05] flex-shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {stages.map(s => (
          <button key={s.id}
            className={`px-3 py-1 rounded-full text-[10px] font-black cursor-pointer whitespace-nowrap border transition-all ${
              stageId === s.id
                ? "border-transparent"
                : "bg-slate-50 dark:bg-white/[0.03] text-slate-400 dark:text-[#334155] border-transparent hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-500 dark:hover:text-slate-400"
            }`}
            style={stageId === s.id ? { background: `${s.color}18`, color: s.color, borderColor: `${s.color}40` } : {}}
            onClick={() => setStageId(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-1 px-[22px] py-2 border-b border-slate-100 dark:border-white/[0.04] flex-shrink-0 flex-wrap">
        <button className="flex items-center gap-1 px-[11px] py-[5px] border border-slate-200 dark:border-white/[0.06] bg-transparent text-slate-500 dark:text-[#475569] text-[11px] font-bold cursor-pointer transition-all hover:bg-green-50 dark:hover:bg-green-500/[0.08] hover:text-green-600 dark:hover:text-green-400 hover:border-green-200 dark:hover:border-green-500/[0.2]"
          onClick={openWhatsApp}>
          <MessageCircle size={13} /> WhatsApp
        </button>
        <button className="flex items-center gap-1 px-[11px] py-[5px] border border-slate-200 dark:border-white/[0.06] bg-transparent text-slate-500 dark:text-[#475569] text-[11px] font-bold cursor-pointer transition-all hover:bg-blue-50 dark:hover:bg-blue-500/[0.08] hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-500/[0.2]"
          onClick={() => form.telefono && window.open(`tel:${form.telefono}`)}>
          <Phone size={13} /> Llamar
        </button>
        <button className="flex items-center gap-1 px-[11px] py-[5px] border border-slate-200 dark:border-white/[0.06] bg-transparent text-slate-500 dark:text-[#475569] text-[11px] font-bold cursor-pointer transition-all hover:bg-purple-50 dark:hover:bg-purple-500/[0.08] hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-200 dark:hover:border-purple-500/[0.2]"
          onClick={openInstagram}>
          <ExternalLink size={13} /> Instagram
        </button>
        <button className="flex items-center gap-1 px-[11px] py-[5px] border border-slate-200 dark:border-white/[0.06] bg-transparent text-slate-500 dark:text-[#475569] text-[11px] font-bold cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-white/[0.06]"
          onClick={() => set("meetingDatetime", "")}>
          <CalendarDays size={13} /> Reunión
        </button>
      </div>

      {/* Fields body */}
      <div className="flex-1 overflow-y-auto px-[22px] py-3.5 flex flex-col gap-3.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-[#1e3a5f] [&::-webkit-scrollbar-track]:bg-transparent">
        {/* Sección Contacto */}
        <div>
          <div className="text-[9px] font-black text-slate-400 dark:text-[#1e3a5f] uppercase tracking-[0.1em] mb-1.5">Contacto</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "nombre",    label: "Nombre *",   placeholder: "Nombre y apellido" },
              { key: "empresa",   label: "Empresa",    placeholder: "" },
              { key: "telefono",  label: "Teléfono",   placeholder: "" },
              { key: "instagram", label: "Instagram",  placeholder: "@usuario" },
              { key: "email",     label: "Email",      placeholder: "" },
              { key: "rubro",     label: "Rubro",      placeholder: "" },
            ].map(f => (
              <div key={f.key} className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">{f.label}</label>
                <input
                  className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] py-[7px] px-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-amber dark:focus:border-amber/[0.3] focus:bg-white dark:focus:bg-white/[0.05] w-full transition-colors"
                  value={(form as any)[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={e => set(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Sección Gestión */}
        <div>
          <div className="text-[9px] font-black text-slate-400 dark:text-[#1e3a5f] uppercase tracking-[0.1em] mb-1.5">Gestión</div>
          <div className="grid grid-cols-2 gap-2">
            {/* Responsable select */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Responsable</label>
              <select className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] py-[7px] px-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-amber w-full transition-colors"
                value={form.responsable1} onChange={e => set("responsable1", e.target.value)}>
                {TEAM.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {/* Medio select */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Medio</label>
              <select className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] py-[7px] px-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-amber w-full transition-colors"
                value={form.medio} onChange={e => set("medio", e.target.value)}>
                <option value="">—</option>
                {MEDIO_OPTS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            {/* Empresa Bio */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Empresa Bio</label>
              <select className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] py-[7px] px-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-amber w-full transition-colors"
                value={form.empresaBio} onChange={e => set("empresaBio", e.target.value)}>
                {EMPRESA_BIO_OPTS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            {/* Seguimiento date */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Próximo seguimiento</label>
              <input type="date" className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] py-[7px] px-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-amber w-full transition-colors"
                value={form.proximoSeguimientoFecha ?? ""} onChange={e => set("proximoSeguimientoFecha", e.target.value)} />
            </div>
            {/* Reunion datetime */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Fecha reunión</label>
              <input type="datetime-local" className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] py-[7px] px-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-amber w-full transition-colors"
                value={form.meetingDatetime ?? ""} onChange={e => set("meetingDatetime", e.target.value)} />
            </div>
            {/* Servicio */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Servicio</label>
              <input className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] py-[7px] px-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-amber w-full transition-colors"
                value={form.servicio ?? ""} onChange={e => set("servicio", e.target.value)} />
            </div>
            {/* Observaciones */}
            <div className="col-span-2 flex flex-col gap-0.5">
              <label className="text-[9px] text-slate-400 dark:text-[#1e3a5f] font-bold uppercase tracking-[0.05em]">Observaciones</label>
              <textarea className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] py-[7px] px-2.5 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-amber w-full transition-colors resize-y min-h-[68px]"
                value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={3} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-[22px] py-3 border-t border-slate-200 dark:border-white/[0.05] flex items-center gap-2 flex-shrink-0">
        <button className="px-[18px] py-2 bg-amber text-bio-dark border-none font-black text-xs cursor-pointer hover:opacity-90 transition-opacity"
          onClick={handleSave}>
          {isNew ? "Crear lead" : "Guardar cambios"}
        </button>
        <button className="px-[13px] py-2 bg-transparent text-slate-500 dark:text-[#334155] border border-slate-200 dark:border-white/[0.06] text-xs cursor-pointer hover:text-slate-700 dark:hover:text-slate-400 transition-colors"
          onClick={onClose}>
          Cancelar
        </button>
        {!isNew && (
          <button className="ml-auto px-[13px] py-2 bg-transparent text-red-700 dark:text-[#7f1d1d] border border-red-200 dark:border-red-500/[0.1] text-xs cursor-pointer flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-500/[0.08] hover:text-red-600 dark:hover:text-red-400 transition-colors"
            onClick={handleDelete}>
            <Trash2 size={13} /> Eliminar
          </button>
        )}
      </div>
    </div>
  </div>
);
```

- [ ] **Step 2: Eliminar CSS del modal de globals.css**

Eliminar el bloque `/* ═══ LEAD MODAL ═══ */` completo (clases `.lm-backdrop` a `.lm-btn-delete`).

- [ ] **Step 3: Verificar**

Abrir el modal haciendo click en una card del kanban → debe verse igual en light y dark mode.

- [ ] **Step 4: Commit**

```bash
git add src/components/seguimiento/lead-modal.tsx src/app/globals.css
git commit -m "refactor: migrate lead modal to Tailwind classes"
```

---

## Tarea 6 — Migrar el Dashboard (tablas shadcn + KPI)

**Archivos:**
- Modificar: `src/components/dashboard/dashboard-view.tsx`
- Modificar: `src/components/ui/table.tsx`

### Mapeo de tabla shadcn

| Elemento | Tailwind |
|---|---|
| `Table` wrapper | `w-full overflow-x-auto` (div) |
| `<table>` | `w-full border-collapse min-w-[540px] [font-variant-numeric:tabular-nums]` |
| `<thead>` | — (sin clases propias) |
| Header row | `bg-[#07152f]` |
| `<th>` base | `px-3.5 py-2.5 text-center text-[10px] font-black tracking-[0.07em] uppercase text-[#6b7280] whitespace-nowrap border-r border-white/[0.05] last:border-r-0 font-mono` |
| `<th>` first col (MÉTRICA) | `text-left bg-amber text-bio-dark min-w-[160px] border-r-black/[0.12]` |
| `<td>` base | `px-3.5 h-[46px] text-center border-r border-slate-100 dark:border-white/[0.04] bg-white dark:bg-[#0b1628] align-middle last:border-r-0` |
| `<td>` label col | `text-left bg-[#111827] text-slate-100 text-[10px] font-black uppercase tracking-[0.07em] border-r-0 px-4 font-mono` |
| Row accent data cells | `bg-amber/[0.08] dark:bg-amber/[0.06]` |
| `<tr>` | `border-b border-slate-100 dark:border-white/[0.04] last:border-b-0 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors` |

- [ ] **Step 1: Actualizar `src/components/ui/table.tsx`**

```tsx
// src/components/ui/table.tsx
"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto">
      <table ref={ref} className={cn("w-full border-collapse [font-variant-numeric:tabular-nums]", className)} {...props} />
    </div>
  )
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn(className)} {...props} />
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn(className)} {...props} />
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] font-bold", className)} {...props} />
  )
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("border-b border-slate-100 dark:border-white/[0.04] last:border-b-0 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors", className)} {...props} />
  )
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn("px-3.5 py-2.5 text-center text-[10px] font-black tracking-[0.07em] uppercase text-[#6b7280] whitespace-nowrap border-r border-white/[0.05] last:border-r-0 font-mono", className)} {...props} />
  )
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-3.5 h-[46px] text-center border-r border-slate-100 dark:border-white/[0.04] bg-white dark:bg-[#0b1628] align-middle last:border-r-0", className)} {...props} />
  )
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-slate-500", className)} {...props} />
  )
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
```

- [ ] **Step 2: Actualizar `DashTable` en `dashboard-view.tsx`**

Reemplazar el componente `DashTable`:

```tsx
function DashTable({ title, subtitle, members, rows: tableRows, memberDots, totalDot }: {
  title: string; subtitle?: string; members: string[]; rows: BoxRow[];
  memberDots?: string[]; totalDot?: string;
}) {
  const fs = useAppSettings((s) => s.settings.dashboardFontSize) || 16;
  return (
    <div className="bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-[18px] py-[10px] bg-[#07152f]">
        <span className="text-[10px] font-black text-amber tracking-[0.12em] uppercase font-mono">{title}</span>
        {subtitle && <span className="text-[9px] font-bold text-white/[0.22] tracking-[0.08em] uppercase whitespace-nowrap font-mono">{subtitle}</span>}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-[#07152f] border-b-0 hover:bg-[#07152f]">
            <TableHead className="text-left bg-amber text-bio-dark min-w-[160px] border-r-black/[0.12]">MÉTRICA</TableHead>
            {members.map((m, i) => (
              <TableHead key={m} className="bg-[#111827]">
                {memberDots?.[i] && <span className="inline-block w-[7px] h-[7px] rounded-full mr-1.5 align-middle" style={{ background: memberDots[i] }} />}
                {m}
              </TableHead>
            ))}
            <TableHead className="bg-[#111827]">
              {totalDot && <span className="inline-block w-[7px] h-[7px] rounded-full mr-1.5 align-middle" style={{ background: totalDot }} />}
              TOTAL
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableRows.map((row) => {
            const total = row.values.reduce((a, b) => a + b, 0);
            return (
              <TableRow key={row.label} className={row.accent ? "" : ""}>
                <TableCell
                  className="text-left bg-[#111827] text-slate-100 text-[10px] font-black uppercase tracking-[0.07em] border-r-0 px-4 font-mono whitespace-normal leading-tight"
                  style={{ background: "#111827", color: "#f1f5f9" }}
                >
                  {row.label}
                </TableCell>
                {row.values.map((v, i) => (
                  <TableCell
                    key={i}
                    className={row.accent ? "bg-amber/[0.08] dark:bg-amber/[0.06]" : ""}
                  >
                    {row.editable ? (
                      <input
                        type="text" inputMode="numeric"
                        value={v || ""}
                        className="font-black bg-transparent border-none outline-none text-center cursor-text w-14 [font-variant-numeric:tabular-nums] text-amber-3"
                        style={{ fontSize: fs }}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (!isNaN(n) && row.onEdit) row.onEdit(i, n);
                          else if (e.target.value === "" && row.onEdit) row.onEdit(i, 0);
                        }}
                      />
                    ) : (
                      <span
                        className="font-black [font-variant-numeric:tabular-nums] text-slate-900 dark:text-slate-200"
                        style={{ ...(row.valueColors?.[i] ? { color: row.valueColors[i] } : {}), fontSize: fs }}
                      >
                        {v}
                      </span>
                    )}
                  </TableCell>
                ))}
                <TableCell className={row.accent ? "bg-amber/[0.08] dark:bg-amber/[0.06]" : ""}>
                  <span className="font-black [font-variant-numeric:tabular-nums] text-slate-900 dark:text-slate-200" style={{ fontSize: fs }}>{total}</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Migrar KPI cards y month nav**

En `DashboardView`, reemplazar los `sectionMap`:

```tsx
// Month nav
nav: (
  <div className="flex items-center justify-center gap-2.5">
    <button className="w-9 h-9 rounded-full bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center cursor-pointer text-slate-900 dark:text-slate-400 text-xl font-bold hover:bg-amber hover:text-bio-dark hover:border-amber transition-all flex-shrink-0"
      onClick={() => handleMonth(shiftMonth(selectedMonth, -1))}>‹</button>
    <span className="text-[22px] font-black text-slate-900 dark:text-slate-200 tracking-tight min-w-[300px] text-center">{monthLabel(selectedMonth)}</span>
    <button className="w-9 h-9 rounded-full bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center cursor-pointer text-slate-900 dark:text-slate-400 text-xl font-bold hover:bg-amber hover:text-bio-dark hover:border-amber transition-all flex-shrink-0"
      onClick={() => handleMonth(shiftMonth(selectedMonth, 1))}>›</button>
    <button className="px-[18px] py-2 bg-amber text-bio-dark border-none rounded-none text-[11px] font-black cursor-pointer hover:opacity-85 transition-opacity tracking-[0.1em]"
      onClick={() => handleMonth(currentMonthBA())}>HOY</button>
  </div>
),
```

- [ ] **Step 4: Eliminar clases del dashboard de globals.css**

Eliminar los bloques:
- `/* ═══ DASHBOARD v2 ═══ */` → todas las clases `.dash-*`
- `/* KPI CARDS */` → todas las clases `.kpi-*`, `.welcome-*`, `.metric-*`
- `/* shadcn Table styles */` → todas las clases `.dash-shadcn-*`, `.dash-tbl-*`

- [ ] **Step 5: Verificar**

Dashboard en http://localhost:3000/dashboard → tablas correctas, dark mode funcional, números con color por performance.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/ src/components/ui/table.tsx src/app/globals.css
git commit -m "refactor: migrate dashboard tables and KPI to Tailwind"
```

---

## Tarea 7 — Limpiar globals.css y verificar el estado final

**Archivos:**
- Modificar: `src/app/globals.css`

### Objetivo

Después de las tareas anteriores, `globals.css` debería tener solo:
1. `@import "tailwindcss"` + `@config`
2. Las CSS custom properties de `:root` (colores, radii, shadows, tipografía)
3. `body.dark-mode { --bg: ...; --card: ... }` (variables de dark mode)
4. CSS legacy de módulos aún no migrados (equipo, clientes, planificacion, calendario, etc.)
5. Clases utilitarias globales que son difíciles de migrar (`.btn`, `.modal`, `.field`)

- [ ] **Step 1: Auditar qué CSS queda en globals.css**

```bash
grep -c "^\." src/app/globals.css
```
Objetivo: menos de 200 clases (bajó de 711).

- [ ] **Step 2: Verificar todas las rutas**

```bash
# Navegar por todas las rutas y confirmar que nada se rompió:
# /dashboard  /seguimiento  /clientes  /equipo  /calendario
# /planificacion  /planes  /mapa  /procedimientos  /colaboradores
```

- [ ] **Step 3: Commit final**

```bash
git add src/app/globals.css
git commit -m "chore: clean up migrated CSS from globals.css"
```

---

## Notas para próximas migraciones (fuera del scope de este plan)

Los siguientes módulos conservan su CSS legacy por ahora y se migrarán en planes separados:

| Módulo | Archivo | Clases aproximadas |
|---|---|---|
| Equipo | `equipo-view.tsx`, `member-profile.tsx` | ~80 |
| Clientes | `clientes-view.tsx`, `client-detail-view.tsx` | ~120 |
| Planificación | `planificacion-view.tsx` | ~60 |
| Modales legacy | `api-settings-modal.tsx`, etc. | ~40 |
| Componentes de botones/modal base | `.btn`, `.modal`, `.field`, `.card` | ~50 |

---

## Resumen de archivos

| Archivo | Acción |
|---|---|
| `tailwind.config.ts` | Crear (nuevo) |
| `src/app/globals.css` | Reducir de 2525 a ~600 líneas |
| `src/components/layout/sidebar.tsx` | Reemplazar 37 clases CSS con Tailwind |
| `src/components/layout/app-shell.tsx` | Reemplazar `.app-layout` + `.content-area` |
| `src/components/seguimiento/seguimiento-view.tsx` | Reemplazar clases `.kb-*` |
| `src/components/seguimiento/kanban-column.tsx` | Reemplazar clases `.kb-col*` |
| `src/components/seguimiento/lead-card.tsx` | Reemplazar clases `.kb-card*` |
| `src/components/seguimiento/lead-modal.tsx` | Reemplazar clases `.lm-*` |
| `src/components/dashboard/dashboard-view.tsx` | Reemplazar `.dash-*`, `.kpi-*` |
| `src/components/ui/table.tsx` | Reemplazar clases `.dash-shadcn-*` con Tailwind |
