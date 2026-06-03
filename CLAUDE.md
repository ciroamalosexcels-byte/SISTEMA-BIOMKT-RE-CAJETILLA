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
│   ├── dashboard/
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
│   └── sheets.ts          # fetchFromSheets() / saveToSheets() via Apps Script
├── store/
│   ├── leads.ts           # Zustand — rows/leads CRUD
│   ├── team.ts            # Zustand — team members + badges
│   ├── app-settings.ts    # Zustand — dark mode, scales, apiUrl, etc.
│   └── content-events.ts  # Zustand — content planning + management events
└── types/
    ├── lead.ts
    ├── team-member.ts
    ├── content-event.ts
    └── index.ts
```

## State management (Next.js)

Four Zustand stores replace the global `state` object:

- `useLeadsStore` — `rows`, `addLead`, `updateLead`, `deleteLead`, `moveLeadTo`, `save`
- `useTeamStore` — `members`, `addMember`, `updateMember`, `awardBadge`
- `useAppSettings` — `settings`, `update`, `toggleDarkMode`
- `useContentEventsStore` — `contentEvents`, `managementEvents` + CRUD

All stores initialize from `localStorage` via `load()`. `AppShell` (`src/components/layout/app-shell.tsx`) calls all four `load()` functions on mount.

## Persistence

Two layers, same as the legacy app:

- **`localStorage`** — local cache on every mutation. Keys defined in `src/lib/constants.ts` → `STORAGE_KEYS`.
- **Google Apps Script** — primary backend (`src/lib/sheets.ts`). Configure URL via `NEXT_PUBLIC_SHEETS_API_URL` in `.env.local` (copy from `env.local.example`).
- **Critical**: `saveToSheets()` uses `Content-Type: text/plain;charset=utf-8` with a JSON body string — Apps Script expects this, NOT `application/json`.

## Views (routes)

| Route | Legacy key | Description |
|-------|-----------|-------------|
| `/dashboard` | `DASHBOARD` | KPI tables + bar charts |
| `/crm` | `CRM` | Prospecting / first contact |
| `/reunion/1` | `REUNION_1` | Audit and budget |
| `/reunion/2` | `REUNION_2` | Budget delivery and close |
| `/seguimiento` | `SEGUIMIENTO` | Follow-up and reactivation |
| `/base` | `BASE` | All records, global view |
| `/clientes` | `CLIENTES` | Client cards with progress circles |
| `/clientes/[id]` | — | Client detail + calendar + events |
| `/planificacion` | `PLANIFICACION` | Content planning with timers + drag |
| `/equipo` | `EQUIPO` | Team cards + 9.1 status board |
| `/equipo/[id]` | — | Team member profile + badges |
| `/calendario` | `CALENDARIO` | Monthly calendar |

## Key conventions (Next.js)

- **Timezone**: Use `baParts()` from `src/lib/dates.ts` — never `new Date()` directly for display. Buenos Aires TZ = `America/Argentina/Buenos_Aires`.
- **`"use client"`**: Required on any component that uses `useState`, `useEffect`, Zustand stores, or browser APIs (`localStorage`, `document`).
- **CSS**: Tailwind v4 via `@import "tailwindcss"` in `globals.css`. CSS custom properties (`--dark`, `--amber`, etc.) are defined in `:root` and match the original HTML.
- **Dark mode**: Toggled by adding `dark-mode` class to `<body>` (same as legacy). `useAppSettings.toggleDarkMode()` handles this.

## Legacy app conventions (HTML file)

- **Timezone**: `baParts()` at line ~1409
- **`els` object** (line ~1220): DOM element cache — re-bind after `innerHTML` replacement via `restoreDefaultTableSection()`
- **CSS patches**: Numbered V1–V14+ blocks at end of `<style>`, use `!important` to override
- **Google Sheets sync**: POST with `Content-Type:"text/plain;charset=utf-8"` (same constraint as above)
- **No real data in HTML**: `initialRowsLegacy` is intentionally empty (line 1109)



