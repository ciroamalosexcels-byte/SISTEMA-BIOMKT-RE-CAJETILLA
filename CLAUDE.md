# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Three codebases live here:

- **`Sistema Biomarketing 60 Auditado.html`** — the original single-file app (legacy reference, ~7000 lines). Open in browser directly, no build needed.
- **`src/`** — the Next.js 15 migration (active development). Run `npm install && npm run dev` to start on `http://localhost:3000`.
- **`mobile-crm/`** — standalone PWA + Android APK for mobile prospecting, independent from `src/`. See [Mobile CRM](#mobile-crm-pwa--android-apk) below.

## Next.js project structure

```
src/
├── app/                   # App Router pages
│   ├── layout.tsx         # Root layout — wraps everything in <AppShell>
│   ├── page.tsx           # Redirects to /dashboard
│   ├── auth/login/        # Google OAuth login page
│   ├── api/supabase/      # API routes: leads, team, content-events,
│   │                      #   management-events, plans, plan-events, pipeline
│   ├── dashboard/
│   ├── general/           # Panel General (multi-workspace summary)
│   ├── crm/
│   ├── reunion/[numero]/  # Handles both Reunión 1 and 2
│   ├── seguimiento/
│   ├── base/
│   ├── clientes/
│   │   └── [id]/          # Client detail page
│   ├── planificacion/
│   ├── equipo/
│   │   └── [id]/          # Team member profile
│   └── calendario/
├── components/
│   ├── layout/            # AppShell (hydration + store init), Sidebar
│   ├── ui/                # Shared primitives (Button, Modal, Badge, Toast)
│   ├── dashboard/
│   ├── crm/
│   ├── clientes/
│   ├── planificacion/
│   ├── equipo/
│   └── calendario/
├── lib/
│   ├── constants.ts       # TABS, options, storage keys, BA_TIME_ZONE
│   ├── dates.ts           # baParts(), todayBA(), formatDateDisplay()
│   ├── storage.ts         # Typed localStorage helpers
│   ├── sheets.ts          # fetchFromSheets() / saveToSheets() via Apps Script (commented out)
│   └── supabase/
│       ├── client.ts      # Browser Supabase client (singleton)
│       ├── server.ts      # Server Supabase client (SSR/cookies)
│       ├── admin.ts       # Admin client (bypasses RLS — server-only)
│       ├── adapters.ts    # adaptLead(), adaptTeamMember() — DB row → TypeScript
│       └── loaders.ts     # loadLeadsFromSupabase(), loadTeamFromSupabase()
├── store/
│   ├── leads.ts           # Zustand — rows/leads CRUD + undo/redo
│   ├── team.ts            # Zustand — team members + badges
│   ├── app-settings.ts    # Zustand — dark mode, scales, apiUrl, etc.
│   ├── content-events.ts  # Zustand — content planning + management events
│   ├── column-widths.ts   # Zustand — CRM/seguimiento table column widths
│   ├── plans.ts           # Zustand — service plans + plan events
│   └── pipeline.ts        # Zustand — pipeline stages (kanban columns)
└── types/
    ├── lead.ts
    ├── team-member.ts     # TeamMember includes color?: string
    ├── content-event.ts
    ├── pipeline.ts
    └── supabase.ts        # Auto-typed DB schema (manually extended)
```

## State management (Next.js)

Six Zustand stores (React 19 + Zustand 5):

- `useLeadsStore` — `rows`, `addLead`, `updateLead`, `deleteLead`, `moveLeadTo`, `save`, `undo`, `redo`
- `useTeamStore` — `members`, `addMember`, `updateMember`, `awardBadge`
- `useAppSettings` — `settings`, `update`, `toggleDarkMode`, `addNotification`, `dismissToast`
- `useContentEventsStore` — `contentEvents`, `managementEvents` + CRUD
- `useColumnWidthsStore` — per-column widths for CRM/seguimiento tables
- `usePlansStore` — `plans`, `planEvents` + CRUD
- `usePipelineStore` — `stages` (kanban columns) + CRUD

All stores initialize from `localStorage` via `load()`. `AppShell` (`src/components/layout/app-shell.tsx`) calls all `load()` functions on mount, then overwrites from Supabase.

### Critical Zustand rule (React 19)

**Never use `.filter()`, `.map()`, or any expression that creates a new array/object directly inside a `useStore` selector.** React 19's `useSyncExternalStore` calls `getSnapshot()` multiple times per render; a new reference each time causes a render loop (React error #185).

```typescript
// BAD — new array on every getSnapshot() call
const names = useTeamStore(s => s.members.filter(m => m.activo).map(m => m.nombre));

// GOOD — useShallow memoizes the result
import { useShallow } from "zustand/react/shallow";
const names = useTeamStore(useShallow(s => s.members.filter(m => m.activo).map(m => m.nombre)));

// ALSO GOOD — compute inside useMemo after subscribing to the array
const members = useTeamStore(s => s.members);
const names = useMemo(() => members.filter(m => m.activo).map(m => m.nombre), [members]);
```

Also avoid calling a store **without a selector** (e.g., `useLeadsStore()`) — always pass a selector to avoid re-rendering on every store update:
```typescript
// BAD
const { load } = useLeadsStore();
// GOOD
const load = useLeadsStore(s => s.load);
```

## Persistence

Three layers:

- **`localStorage`** — local cache on every mutation. Keys defined in `src/lib/constants.ts` → `STORAGE_KEYS`.
- **Supabase** — primary backend. API routes under `src/app/api/supabase/`. Admin client (`createAdminClient()`) bypasses RLS in server-only routes. Browser client (`createClient()`) is a singleton in `src/lib/supabase/client.ts`.
- **Google Apps Script** — legacy (commented out). `src/lib/sheets.ts` still exists; re-enable via `NEXT_PUBLIC_SHEETS_API_URL`.
- **Critical**: `saveToSheets()` uses `Content-Type: text/plain;charset=utf-8` with a JSON body string — Apps Script expects this, NOT `application/json`.

### Supabase adapter pattern

`adaptLead(row, stageMap)` and `adaptTeamMember(row, allStatus91, allPoints)` in `src/lib/supabase/adapters.ts` convert DB rows to TypeScript types. When adding a new DB field:
1. Add to `src/types/supabase.ts` (Row / Insert / Update)
2. Add to `src/lib/supabase/adapters.ts`
3. Add to the relevant API GET route (`src/app/api/supabase/[resource]/route.ts`)
4. Add to the relevant PATCH route if editable

## Auth

Middleware (`src/middleware.ts`) protects all routes except `/auth/*`. Unauthenticated users are redirected to `/auth/login`. The Sidebar fetches `/api/auth/me` to show the current user's name and avatar.

## Views (routes)

| Route | Legacy key | Description |
|-------|-----------|-------------|
| `/dashboard` | `DASHBOARD` | KPI tables + bar charts |
| `/general` | — | Panel General multi-workspace |
| `/crm` | `CRM` | Prospecting / first contact |
| `/reunion/1` | `REUNION_1` | Audit and budget |
| `/reunion/2` | `REUNION_2` | Budget delivery and close |
| `/seguimiento` | `SEGUIMIENTO` | Follow-up and reactivation + Carga Rápida modal |
| `/base` | `BASE` | All records, global view |
| `/clientes` | `CLIENTES` | Client cards with progress circles + responsable badges |
| `/clientes/[id]` | — | Client detail + calendar + events + credentials |
| `/planificacion` | `PLANIFICACION` | Content planning with timers + drag |
| `/equipo` | `EQUIPO` | Team cards + 9.1 status board |
| `/equipo/[id]` | — | Team member profile + badges |
| `/calendario` | `CALENDARIO` | Monthly calendar |

## Key features added (recent sessions)

### Client credentials (`/clientes/[id]`)
`Lead` has `clave?: string` and `claveEmail?: string`. Both are shown/edited in the client detail modal and saved to Supabase via PATCH `/api/supabase/leads/[id]`. Mapped in `adaptLead` and present in `src/types/supabase.ts`.

### Responsable badge in client cards (`/clientes`)
`ClientCard` in `src/components/clientes/clientes-view.tsx` shows colored chips for `lead.responsable1` and `lead.responsable2`. Colors come from `TeamMember.color` via a `memberColorMap: Map<string, string>` built with `useMemo` in `ClientesView`.

### Team member color
`TeamMember` has `color?: string`. Selectable from a 10-color palette in `DatosModal` (`src/components/equipo/datos-modal.tsx`). Saved via PATCH `/api/supabase/team/[id]` and returned in GET `/api/supabase/team`. Stored in `team_members.color` column in Supabase.

### Carga Rápida — parser línea-por-línea (`/seguimiento`)
`src/components/seguimiento/carga-rapida-modal.tsx` soporta tres formatos:
1. **WhatsApp export** — detectado por `isWhatsAppFormat()`
2. **Bloques con línea en blanco** — un bloque = un contacto (comportamiento original)
3. **Una línea por contacto** (sin líneas en blanco) — nuevo, para texto dictado por voz:
   - Primera palabra = nombre, palabras capitalizadas siguientes = empresa, resto = observaciones
   - Líneas que empiezan en minúscula o con palabras de `CONTINUATION_FIRSTS` se unen al contacto anterior
   - Timestamps opcionales al inicio de línea: `"30/06 14:30 Tamara..."` o `"14:30 Tamara..."` → `fechaContacto`

### Copiar info del contacto (menú contextual)
Click derecho en tarjeta kanban (`src/components/seguimiento/lead-card.tsx`) o en fila de tabla CRM (`src/components/crm/leads-table.tsx`) muestra opción "Copiar info". Copia todos los campos no vacíos en formato `Clave: Valor` listo para pegar en una IA. Feedback visual con ícono Check + "¡Copiado!" por 1.2 seg.

### Creación de integrantes de equipo — persistencia en Supabase
`addMember(nombre, patch?)` en `src/store/team.ts` ahora hace un único `POST /api/supabase/team` con todos los campos (antes solo guardaba en localStorage). La route `src/app/api/supabase/team/route.ts` tiene el handler `POST` que inserta en `team_members`. `handleCreate` en `equipo-view.tsx` llama `addMember(nombre, patch)` directamente sin `updateMember` posterior (evita race condition POST→PATCH).

### Progreso mensual en tarjetas de Clientes (`/clientes`)
`getProgress`/`getContentCount` en `clientes-view.tsx` filtran los `ContentEvent` por `scheduledDate` del mes actual (`currentMonthBA()` en `src/lib/dates.ts`), excluyendo eventos sin fecha. `getProgress` retorna `null` cuando no hay contenidos del mes en curso; `ClientCard` muestra círculo gris (`progress-none` en `globals.css`) con "—" y texto "Sin contenidos este mes" en ese caso. Spec: `docs/superpowers/specs/2026-07-01-progreso-mensual-clientes-design.md`.

## Key conventions (Next.js)

- **Timezone**: Use `baParts()` from `src/lib/dates.ts` — never `new Date()` directly for display. Buenos Aires TZ = `America/Argentina/Buenos_Aires`.
- **`"use client"`**: Required on any component that uses `useState`, `useEffect`, Zustand stores, or browser APIs (`localStorage`, `document`).
- **CSS**: Tailwind v4 via `@import "tailwindcss"` in `globals.css`. CSS custom properties (`--dark`, `--amber`, etc.) are defined in `:root` and match the original HTML.
- **Dark mode**: Toggled by adding `dark-mode` class to `<body>` (same as legacy). `useAppSettings.toggleDarkMode()` handles this.
- **Build**: The `engram/` folder at root causes `next build` to fail locally (missing `@opencode-ai/plugin`). It is untracked and not on Vercel — dev mode works fine.

## Mobile CRM (PWA + Android APK)

`mobile-crm/` is a standalone vanilla HTML/CSS/JS app (no build step, no React) — separate from `src/`. Deployed as a PWA to GitHub Pages and wrapped in a native WebView (not TWA) for the Android APK.

**Stack:** Supabase JS v2 via CDN UMD (`window.supabase.createClient`), Web Speech API (`es-AR`) with local keyword-based parsing.

**Key files:**
| File | Role |
|---|---|
| `mobile-crm/index.html` | Shell + modals (lead, mover stage, datetime, voz) |
| `mobile-crm/css/style.css` | Design tokens, tarjetas, badges, modales |
| `mobile-crm/js/config.js` | Supabase credentials — gitignored, generated by CI from secrets |
| `mobile-crm/js/supabase.js` | `fetchLeads`, `fetchTeam`, `insertLead`, `updateLead` |
| `mobile-crm/js/voice.js` | `parseTranscript`, `startVoice` |
| `mobile-crm/js/app.js` | Render, events, modals, long press, mover stage |
| `mobile-crm/android/` | Gradle WebView project for the APK |

**Voice parsing:** keywords (`nombre`, `empresa`, `telefono`/`teléfono`/`tel`/`número`/`celular`, `dirección`/`direccion`, `observaciones`/`observacion`/`nota`/`notas`) split the transcript positionally — text before the first keyword goes to `nombre` (then `empresa`), text after each keyword goes to that field. If no keywords are found, everything falls back to `observaciones` (not `nombre`) so a manual edit fixes it instead of silently mislabeling data.

**Supabase RLS:** `leads` allows SELECT/INSERT/UPDATE for `anon`; `pipeline_stages` allows SELECT for `anon`. `stage_id` is resolved by querying `pipeline_stages` by `stage_key` (CRM, REUNION_1, REUNION_2, SEGUIMIENTO).

**CI/CD (`.github/workflows/`):**
- `deploy-mobile-crm.yml` — deploys `mobile-crm/` to GitHub Pages, generates `config.js` from `SUPABASE_URL` + `SUPABASE_ANON_KEY` secrets.
- `build-apk.yml` — Gradle `assembleRelease`, uploads APK as artifact + GitHub Release. Only triggers on changes to `mobile-crm/android/**` — bump `versionCode` in `build.gradle` there to force a new APK build.

## Legacy app conventions (HTML file)

- **Timezone**: `baParts()` at line ~1409
- **`els` object** (line ~1220): DOM element cache — re-bind after `innerHTML` replacement via `restoreDefaultTableSection()`
- **CSS patches**: Numbered V1–V14+ blocks at end of `<style>`, use `!important` to override
- **Google Sheets sync**: POST with `Content-Type:"text/plain;charset=utf-8"` (same constraint as above)
- **No real data in HTML**: `initialRowsLegacy` is intentionally empty (line 1109)
