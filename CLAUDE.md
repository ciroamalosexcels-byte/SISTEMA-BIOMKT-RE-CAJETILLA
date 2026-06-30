# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Two parallel codebases live here:

- **`Sistema Biomarketing 60 Auditado.html`** — the original single-file app (legacy reference, ~7000 lines). Open in browser directly, no build needed.
- **`src/`** — the Next.js 15 migration (active development). Run `npm install && npm run dev` to start on `http://localhost:3000`.

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

## Key conventions (Next.js)

- **Timezone**: Use `baParts()` from `src/lib/dates.ts` — never `new Date()` directly for display. Buenos Aires TZ = `America/Argentina/Buenos_Aires`.
- **`"use client"`**: Required on any component that uses `useState`, `useEffect`, Zustand stores, or browser APIs (`localStorage`, `document`).
- **CSS**: Tailwind v4 via `@import "tailwindcss"` in `globals.css`. CSS custom properties (`--dark`, `--amber`, etc.) are defined in `:root` and match the original HTML.
- **Dark mode**: Toggled by adding `dark-mode` class to `<body>` (same as legacy). `useAppSettings.toggleDarkMode()` handles this.
- **Build**: The `engram/` folder at root causes `next build` to fail locally (missing `@opencode-ai/plugin`). It is untracked and not on Vercel — dev mode works fine.

## Legacy app conventions (HTML file)

- **Timezone**: `baParts()` at line ~1409
- **`els` object** (line ~1220): DOM element cache — re-bind after `innerHTML` replacement via `restoreDefaultTableSection()`
- **CSS patches**: Numbered V1–V14+ blocks at end of `<style>`, use `!important` to override
- **Google Sheets sync**: POST with `Content-Type:"text/plain;charset=utf-8"` (same constraint as above)
- **No real data in HTML**: `initialRowsLegacy` is intentionally empty (line 1109)
