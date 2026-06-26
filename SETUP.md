# Sistema BioMarketing

CRM y sistema de gestión para equipos de BioMarketing. Migración de una app single-file HTML a Next.js 15. Usa Supabase + Google Apps Script como backend.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Supabase** — PostgreSQL + Auth
- **Google Apps Script** — backend de persistencia en Google Sheets
- **Zustand** — estado global (4 stores)
- **Tailwind CSS v4** + shadcn/ui
- pnpm

## Variables de entorno

Crear `.env.local` (copiar de `env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SHEETS_API_URL=   # URL del Apps Script desplegado
```

## Inicio rápido

```bash
git clone https://github.com/ciroamalosexcels-byte/SISTEMA-BIOMKT-RE-CAJETILLA.git
cd SistemaBio
pnpm install
cp env.local.example .env.local
# Completar .env.local con las variables reales
pnpm dev
```

## Estructura

```
src/app/           rutas: /dashboard, /crm, /reunion/[1|2], /seguimiento, /base, /clientes, /planificacion, /equipo, /calendario
src/components/    layout/, ui/, dashboard/, crm/, clientes/, planificacion/, equipo/, calendario/
src/store/         leads.ts, team.ts, app-settings.ts, content-events.ts (Zustand)
src/lib/           constants.ts, dates.ts (baParts), storage.ts, sheets.ts
```

## Persistencia

- **localStorage** — cache local en cada mutación
- **Google Apps Script** — backend real (`src/lib/sheets.ts`). Usa `Content-Type: text/plain;charset=utf-8` con body JSON (NO application/json)

## Referencia legacy

`Sistema Biomarketing 60 Auditado.html` — app original en un solo archivo (~7000 líneas). Abrir directo en browser.

## Prompt para Claude

```
Estoy trabajando en Sistema BioMarketing, un CRM para equipos de BioMarketing. Tiene dos codebases: el HTML legacy original y la migración a Next.js 15.

Stack: Next.js 15 (App Router), React 19, TypeScript, Supabase, Google Apps Script (backend Sheets), Zustand (4 stores), Tailwind v4, shadcn/ui, pnpm.
Repo: https://github.com/ciroamalosexcels-byte/SISTEMA-BIOMKT-RE-CAJETILLA

Stores Zustand: useLeadsStore, useTeamStore, useAppSettings, useContentEventsStore
Timezone crítica: siempre usar baParts() de src/lib/dates.ts (Buenos Aires), nunca new Date() directo.
Google Sheets: Content-Type DEBE ser text/plain;charset=utf-8, nunca application/json.

Variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SHEETS_API_URL

Rutas: /dashboard, /crm, /reunion/1, /reunion/2, /seguimiento, /base, /clientes/[id], /planificacion, /equipo/[id], /calendario

Ayudame a retomar el desarrollo.
```
