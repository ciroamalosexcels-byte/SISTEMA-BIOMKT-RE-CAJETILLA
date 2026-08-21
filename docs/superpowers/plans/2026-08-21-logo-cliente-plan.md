# Logo del cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir subir un logo circular por cliente (Supabase Storage) y mostrarlo en la tarjeta de `/clientes`, en el header de `/clientes/[id]` (reemplazando la posición de la carita, que se reubica) y editable desde el modal "Datos del cliente".

**Architecture:** Columna nueva `logo_url` en `leads` + bucket público `client-logos` en Supabase Storage (subida vía cliente browser, sin pasar por una API route propia). Un componente `LogoUploader` reutilizable maneja la subida y el preview circular; se monta en el modal y en el header. `ClientCard` solo lee `lead.logoUrl` (sin upload).

**Tech Stack:** Next.js 15, Supabase JS v2 (`@supabase/ssr` browser client ya existente), TypeScript. Sin librerías nuevas.

**Spec:** `docs/superpowers/specs/2026-08-21-logo-cliente-design.md`

## Global Constraints

- No hay suite de tests automatizados (`package.json`: `dev`/`build`/`start`/`lint`/`type-check`). Verificación = `npm run type-check` + prueba manual en browser.
- El proyecto Supabase de este repo es `fdocgjgamrlqkzdnljja` (`NEXT_PUBLIC_SUPABASE_URL` en `.env`), accesible desde el MCP server `supabase-bio` — confirmado con `get_project_url`. Las migraciones se aplican directo contra ese proyecto (no hay carpeta `supabase/migrations` versionada en el repo).
- Reusar `current_user_role()` (función `SECURITY DEFINER` ya existente, `select role from public.profiles where id = auth.uid()`) para las policies de Storage — mismo criterio que ya protege `leads` (`editor`/`admin` pueden escribir).
- El bucket `client-logos` no existía al momento de este plan (confirmado con `select * from storage.buckets` → `[]`).
- Nunca usar un selector de Zustand que devuelva un objeto/array nuevo en cada llamada — no aplica a este plan (no se agregan selectores de store nuevos), pero no violarlo al tocar `client-detail-view.tsx`.

---

### Task 1: Migración — columna `logo_url` + bucket de Storage + policies

**Files:** ninguno en el repo — se aplica directo contra el proyecto Supabase vía el tool `mcp__supabase-bio__apply_migration`.

**Interfaces:**
- Produces: columna `public.leads.logo_url text` (nullable), bucket `client-logos` (público), policies de INSERT/UPDATE en `storage.objects` restringidas a `current_user_role() in ('admin','editor')`.

- [ ] **Step 1: Aplicar la migración**

Llamar `mcp__supabase-bio__apply_migration` con `name: "add_logo_url_to_leads_and_client_logos_bucket"` y este `query`:

```sql
alter table public.leads add column logo_url text;

insert into storage.buckets (id, name, public)
values ('client-logos', 'client-logos', true)
on conflict (id) do nothing;

create policy "client-logos: editor y admin pueden subir"
on storage.objects for insert
to public
with check (
  bucket_id = 'client-logos'
  and current_user_role() = any (array['admin', 'editor'])
);

create policy "client-logos: editor y admin pueden actualizar"
on storage.objects for update
to public
using (
  bucket_id = 'client-logos'
  and current_user_role() = any (array['admin', 'editor'])
)
with check (
  bucket_id = 'client-logos'
  and current_user_role() = any (array['admin', 'editor'])
);
```

- [ ] **Step 2: Verificar la columna y el bucket**

Ejecutar con `mcp__supabase-bio__execute_sql`:
```sql
select column_name from information_schema.columns where table_name = 'leads' and column_name = 'logo_url';
select id, public from storage.buckets where id = 'client-logos';
```
Expected: la primera devuelve una fila (`logo_url`), la segunda devuelve `{"id":"client-logos","public":true}`.

- [ ] **Step 3: Chequear advisors de seguridad**

Llamar `mcp__supabase-bio__get_advisors` con `type: "security"`. Confirmar que no aparece ninguna alerta nueva sobre `storage.objects` o `leads` relacionada a esta migración (RLS sin policies, etc).

No hay commit en este paso — es un cambio de infraestructura, no de código versionado.

---

### Task 2: Tipos — `logoUrl` en `Lead` y `logo_url` en `types/supabase.ts`

**Files:**
- Modify: `src/types/lead.ts:49` (después de `clientOrder`)
- Modify: `src/types/supabase.ts:206-208` (Row), `:250-252` (Insert), `:294-296` (Update) — tabla `leads`

**Interfaces:**
- Produces: `Lead.logoUrl?: string`, `LeadRow.logo_url: string | null`, `LeadInsert.logo_url?: string | null`, `LeadUpdate.logo_url?: string | null`.

- [ ] **Step 1: Agregar `logoUrl` a `Lead`**

En `src/types/lead.ts`, después de la línea `clientOrder?: number;` (línea 49):

```ts
  // Orden visual en el grid de clientes
  clientOrder?: number;
  // Logo circular del cliente (Supabase Storage, bucket client-logos)
  logoUrl?: string;
}
```

- [ ] **Step 2: Agregar `logo_url` a `types/supabase.ts` (Row/Insert/Update)**

En `src/types/supabase.ts`, dentro de `leads.Row` (bloque que empieza en la línea 190), agregar entre `longitud: number | null` y `medio: string | null`:

```ts
          longitud: number | null
          logo_url: string | null
          medio: string | null
```

En `leads.Insert` (bloque que empieza en la línea 234), entre `longitud?: number | null` y `medio?: string | null`:

```ts
          longitud?: number | null
          logo_url?: string | null
          medio?: string | null
```

En `leads.Update` (bloque que empieza en la línea 278), mismo patrón:

```ts
          longitud?: number | null
          logo_url?: string | null
          medio?: string | null
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/types/lead.ts src/types/supabase.ts
git commit -m "feat(clientes): agregar campo logoUrl al tipo Lead"
```

---

### Task 3: Adapter y serializer — mapear `logo_url` ↔ `logoUrl`

**Files:**
- Modify: `src/lib/supabase/adapters.ts:44-46` (`adaptLead`, después de `claveEmail`)
- Modify: `src/lib/supabase/serializers.ts:36-37` (`serializeLead`, después de `clave_email`)

**Interfaces:**
- Consumes: `Lead.logoUrl`, `LeadRow.logo_url` de Task 2.
- Produces: lectura (`adaptLead`) y escritura (`serializeLead`, usado tanto por el POST como el PATCH de `/api/supabase/leads`) de `logoUrl` sin tocar las rutas API (ya usan `select *` / `serializeLead` genérico).

- [ ] **Step 1: `adaptLead` — leer `logo_url`**

En `src/lib/supabase/adapters.ts`, después de la línea `claveEmail: row.clave_email ?? undefined,` (línea 45):

```ts
    clave: row.clave ?? undefined,
    claveEmail: row.clave_email ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    clientOrder: row.client_order ?? undefined,
```

- [ ] **Step 2: `serializeLead` — escribir `logo_url`**

En `src/lib/supabase/serializers.ts`, después de la línea `clave_email: lead.claveEmail ?? null,` (línea 37):

```ts
    clave:                     lead.clave ?? null,
    clave_email:               lead.claveEmail ?? null,
    logo_url:                  lead.logoUrl ?? null,
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/adapters.ts src/lib/supabase/serializers.ts
git commit -m "feat(clientes): mapear logoUrl en adaptLead/serializeLead"
```

---

### Task 4: Componente `LogoUploader`

**Files:**
- Create: `src/components/clientes/logo-uploader.tsx`

**Interfaces:**
- Consumes: `createClient` de `src/lib/supabase/client.ts` (`supabase.storage.from("client-logos")`), bucket `client-logos` de Task 1.
- Produces: `export function LogoUploader({ leadId, logoUrl, onUploaded, size }: { leadId: string; logoUrl?: string; onUploaded: (url: string) => void; size?: number })`.

- [ ] **Step 1: Crear el componente**

Crear `src/components/clientes/logo-uploader.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  leadId: string;
  logoUrl?: string;
  onUploaded: (url: string) => void;
  size?: number;
}

export function LogoUploader({ leadId, logoUrl, onUploaded, size = 44 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("client-logos")
        .upload(`${leadId}.${ext}`, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("client-logos").getPublicUrl(`${leadId}.${ext}`);
      onUploaded(`${data.publicUrl}?t=${Date.now()}`);
    } catch (err) {
      console.error("[LogoUploader] upload falló:", err);
      alert("No se pudo subir el logo. Probá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      title="Subir logo del cliente"
      style={{
        width: size, height: size, minWidth: size, borderRadius: "50%",
        overflow: "hidden", border: "none", padding: 0, cursor: "pointer",
        background: "#e2e8f0", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: uploading ? 0.5 : 1,
      }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <svg width={Math.round(size * 0.45)} height={Math.round(size * 0.45)} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />
    </button>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/clientes/logo-uploader.tsx
git commit -m "feat(clientes): componente LogoUploader para logo circular del cliente"
```

---

### Task 5: `LogoUploader` en el modal "Datos del cliente"

**Files:**
- Modify: `src/components/clientes/client-detail-view.tsx:1-30` (imports, agregar el de `LogoUploader`), `:817-819` (dentro de `ClientDataModal`, inicio de `modal-body`)

**Interfaces:**
- Consumes: `LogoUploader` de Task 4, `lead.logoUrl` de Task 2, `onUpdate` (prop ya existente de `ClientDataModal`, es `patch` — ver Task 6).

- [ ] **Step 1: Importar `LogoUploader`**

Buscar el bloque de imports al inicio de `src/components/clientes/client-detail-view.tsx` y agregar junto a los demás imports de `@/components/clientes/*` (o, si no hay ninguno todavía, agregar una línea nueva cerca del resto de imports):

```ts
import { LogoUploader } from "./logo-uploader";
```

- [ ] **Step 2: Montar el uploader arriba del formulario**

Dentro de `ClientDataModal`, justo después de la apertura de `modal-body` (línea 817, `<div className="modal-body" style={{ overflowY: "auto", padding: "28px 32px", gap: 20 }}>`) y antes del comentario `{/* ── Contacto principal ────────────────────── */}` (línea 819), agregar:

```tsx
        <div className="modal-body" style={{ overflowY: "auto", padding: "28px 32px", gap: 20 }}>

          <div className="field-group" style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center", marginBottom: 4 }}>
            <LogoUploader leadId={lead.id} logoUrl={lead.logoUrl} onUploaded={(url) => onUpdate({ logoUrl: url })} size={72} />
          </div>

          {/* ── Contacto principal ────────────────────── */}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 4: Prueba manual**

Run: `npm run dev`, abrir un cliente en `/clientes/[id]`, click en "Datos del cliente", click en el círculo vacío arriba del formulario, elegir una imagen. Verificar que aparece el preview circular dentro del modal (sin recargar).

- [ ] **Step 5: Commit**

```bash
git add src/components/clientes/client-detail-view.tsx
git commit -m "feat(clientes): subir logo desde el modal de datos del cliente"
```

---

### Task 6: Logo en el header — reemplaza la carita, la carita se reubica junto al %

**Files:**
- Modify: `src/components/clientes/client-detail-view.tsx:1688-1716` (sección `client-detail-head`, dentro del componente de vista de detalle — no de `ClientDataModal`)

**Interfaces:**
- Consumes: `LogoUploader` de Task 4 (ya importado en Task 5, mismo archivo), `patch` (función ya definida en el componente, línea 1651: `const patch = useCallback((p: Partial<Lead>) => updateLead(clientId, p), [clientId, updateLead]);`).

- [ ] **Step 1: Reemplazar el botón de la carita por `LogoUploader`, reubicar la carita junto al círculo de %**

Reemplazar este bloque (líneas 1688-1716):

```tsx
          <button
            type="button"
            onClick={cycleEstado}
            title={ESTADO_FACES[estadoIdx].label}
            style={{ fontSize: 28, lineHeight: 1, background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
          >
            {ESTADO_FACES[estadoIdx].emoji}
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <h2 className="client-detail-title" style={{ margin: 0 }}>{title}</h2>
              {lead.servicio && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>{lead.servicio}</span>
              )}
              {(lead.activo ?? true) ? (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 20, padding: "2px 10px", whiteSpace: "nowrap" }}>Activo</span>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 20, padding: "2px 10px", whiteSpace: "nowrap" }}>Inactivo</span>
              )}
            </div>
          </div>
          <div
            className={`client-progress-circle ${clientProgress !== null ? progressClass(clientProgress) : "progress-none"}`}
            style={{ "--pct": clientProgress !== null ? Math.round(clientProgress * 100) : 0, width: 40, height: 40, minWidth: 40 } as React.CSSProperties}
            title={progressMode === "contratado" ? "Contratado vs. hecho" : "Progreso mensual por estado"}
          >
            <span>{clientProgress !== null ? `${Math.round(clientProgress * 100)}%` : "—"}</span>
          </div>
```

Por:

```tsx
          <LogoUploader leadId={lead.id} logoUrl={lead.logoUrl} onUploaded={(url) => patch({ logoUrl: url })} size={44} />
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <h2 className="client-detail-title" style={{ margin: 0 }}>{title}</h2>
              {lead.servicio && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>{lead.servicio}</span>
              )}
              {(lead.activo ?? true) ? (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 20, padding: "2px 10px", whiteSpace: "nowrap" }}>Activo</span>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 20, padding: "2px 10px", whiteSpace: "nowrap" }}>Inactivo</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={cycleEstado}
            title={ESTADO_FACES[estadoIdx].label}
            style={{ fontSize: 22, lineHeight: 1, background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
          >
            {ESTADO_FACES[estadoIdx].emoji}
          </button>
          <div
            className={`client-progress-circle ${clientProgress !== null ? progressClass(clientProgress) : "progress-none"}`}
            style={{ "--pct": clientProgress !== null ? Math.round(clientProgress * 100) : 0, width: 40, height: 40, minWidth: 40 } as React.CSSProperties}
            title={progressMode === "contratado" ? "Contratado vs. hecho" : "Progreso mensual por estado"}
          >
            <span>{clientProgress !== null ? `${Math.round(clientProgress * 100)}%` : "—"}</span>
          </div>
```

(La carita baja de `fontSize: 28` a `22` para no competir visualmente con el logo de 44px — es el único cambio de estilo además de la reubicación.)

- [ ] **Step 2: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 3: Prueba manual**

Run: `npm run dev`, abrir `/clientes/[id]`. Verificar: el logo (o círculo vacío) aparece primero en el header, clickeable para subir/reemplazar; la carita de estado aparece ahora inmediatamente antes del círculo de %, y sigue ciclando el estado al hacer click.

- [ ] **Step 4: Commit**

```bash
git add src/components/clientes/client-detail-view.tsx
git commit -m "feat(clientes): logo en el header del cliente, carita reubicada junto al %"
```

---

### Task 7: Logo de solo lectura en `ClientCard` (`/clientes`)

**Files:**
- Modify: `src/components/clientes/clientes-view.tsx:88-99` (drag handle de `ClientCard`)

**Interfaces:**
- Consumes: `lead.logoUrl` de Task 2. No usa `LogoUploader` (es de solo lectura, sin subida desde la tarjeta).

- [ ] **Step 1: Agregar el círculo de logo junto al drag handle**

En `src/components/clientes/clientes-view.tsx`, reemplazar el bloque del drag handle (líneas 88-99):

```tsx
      {/* Drag handle */}
      <div
        style={{
          position: "absolute", top: 10, right: 10,
          color: "#cbd5e1", fontSize: 13, lineHeight: 1,
          pointerEvents: "none", userSelect: "none",
          letterSpacing: -1,
        }}
        title="Arrastrá para reordenar"
      >
        ⠿
      </div>
```

Por:

```tsx
      {/* Logo del cliente */}
      <div
        style={{
          position: "absolute", top: 6, right: 6,
          width: 38, height: 38, borderRadius: "50%", overflow: "hidden",
          background: "#e2e8f0", flexShrink: 0,
        }}
      >
        {lead.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lead.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>

      {/* Drag handle */}
      <div
        style={{
          position: "absolute", top: 14, right: 14,
          color: "#cbd5e1", fontSize: 13, lineHeight: 1,
          pointerEvents: "none", userSelect: "none",
          letterSpacing: -1,
        }}
        title="Arrastrá para reordenar"
      >
        ⠿
      </div>
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run type-check`
Expected: sin errores.

- [ ] **Step 3: Prueba manual**

Run: `npm run dev`, abrir `/clientes`. Verificar: el cliente al que se le subió logo en las tareas anteriores lo muestra en la esquina superior derecha de su tarjeta; los clientes sin logo muestran el círculo gris vacío sin ícono roto. El drag-and-drop de las tarjetas sigue funcionando igual que antes.

- [ ] **Step 4: Commit**

```bash
git add src/components/clientes/clientes-view.tsx
git commit -m "feat(clientes): mostrar logo del cliente en la tarjeta de /clientes"
```

---

## Self-Review Notes

- **Cobertura del spec:** columna + bucket + policies (Task 1), tipos (Task 2), adapter/serializer (Task 3), componente reutilizable (Task 4), modal (Task 5), header con reubicación de la carita (Task 6), tarjeta solo-lectura (Task 7). Todo lo del spec tiene tarea.
- **Placeholders:** ninguno — todos los steps tienen código o SQL completo.
- **Consistencia de tipos:** `logoUrl?: string` (Lead, Task 2) ↔ `logo_url: string | null` (LeadRow, Task 2) ↔ `row.logo_url ?? undefined` / `lead.logoUrl ?? null` (Task 3) ↔ `LogoUploader({ leadId, logoUrl, onUploaded, size })` (Task 4) usado idéntico en Task 5 (`lead.id`, `lead.logoUrl`, `onUpdate`) y Task 6 (`lead.id`, `lead.logoUrl`, `patch`).
- **Orden de tareas:** Task 1 (infra) antes de Task 2 (tipos) es intencional — los tipos documentan una columna que ya existe en la base; si Task 1 fallara, ningún componente que dependa de `logoUrl` tendría dónde persistir.
