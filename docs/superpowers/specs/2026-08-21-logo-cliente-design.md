# Logo del cliente — diseño

Fecha: 2026-08-21
Alcance: `src/` (Next.js). No toca el HTML legacy ni `mobile-crm/`.

## Contexto y problema

Ciro quiere poder subir el logo de cada cliente (imagen redonda, sin
bordes) y que se muestre en tres lugares: la tarjeta de `/clientes`, el
header de `/clientes/[id]`, y editable desde el modal "Datos del
cliente". Hoy no existe ningún mecanismo de subida de imágenes en el
proyecto (`src/` ni `mobile-crm/`) — se construye desde cero.

## Decisiones tomadas con el usuario

- Storage: **Supabase Storage**, no base64 en la base de datos.
- Bucket nuevo `client-logos`, público (lectura), escritura para
  usuarios autenticados.
- Path por lead: `{leadId}.{ext}`, subida con `upsert: true` — al
  reemplazar el logo se pisa el mismo archivo. La URL guardada en
  `logo_url` lleva un query param `?t={timestamp}` para evitar que el
  browser/CDN sirva la versión cacheada vieja tras un reemplazo.
- Se sube y edita desde dos lugares: el modal "Datos del cliente" y el
  header de `/clientes/[id]` (mismo componente reutilizable en ambos).
- En el header, el logo **reemplaza la posición actual de la carita**
  (primer elemento tras las flechas de navegación entre clientes). La
  carita (emoji de estado, `ESTADO_FACES`) se mueve a la izquierda del
  círculo de %, donde hoy no hay nada.
- En la tarjeta de `/clientes` (`ClientCard`), el logo se muestra
  **solo lectura** (sin click para subir), en la esquina superior
  derecha, junto al drag handle existente. Si no hay logo, círculo
  vacío gris claro (no negro — el negro del mockup de Ciro era solo
  para marcar la ubicación, no el color deseado).

## Base de datos

Migración Supabase:
```sql
alter table leads add column logo_url text;
```

Bucket de Storage `client-logos`:
- Público para lectura (para que las imágenes carguen sin firma en
  todas las vistas).
- Policy de INSERT/UPDATE restringida a usuarios autenticados (mismo
  criterio que el resto de la app, que ya protege todas las rutas vía
  `middleware.ts`).

## Tipos y adaptadores

- `src/types/lead.ts`: agregar `logoUrl?: string` a `Lead`.
- `src/types/supabase.ts`: agregar `logo_url: string | null` a
  Row/Insert/Update de `leads`.
- `src/lib/supabase/adapters.ts`: `adaptLead` mapea `row.logo_url` →
  `logoUrl`.
- `src/app/api/supabase/leads/route.ts` (GET): incluir `logo_url` en
  el select/mapeo.
- `src/app/api/supabase/leads/[id]/route.ts` (PATCH): aceptar
  `logoUrl` en el body y persistirlo como `logo_url`.

## Componente `LogoUploader`

Nuevo archivo `src/components/clientes/logo-uploader.tsx` (client
component), reutilizado en el modal y en el header.

Props: `{ leadId: string; logoUrl?: string; onUploaded: (url: string) => void; size?: number }`.

Comportamiento:
- Círculo (`border-radius: 50%`, `overflow: hidden`, `object-fit:
  cover`), sin borde. Si `logoUrl` está vacío, muestra un placeholder
  (ícono de imagen, fondo gris claro).
- Click abre un `<input type="file" accept="image/*">` oculto.
- Al elegir archivo: sube a
  `supabase.storage.from('client-logos').upload(`${leadId}.${ext}`, file, { upsert: true })`
  con el cliente browser (`src/lib/supabase/client.ts`), obtiene
  `getPublicUrl(...)`, arma la URL final con `?t=${Date.now()}`, y
  llama `onUploaded(url)`.
- El padre (`ClientDataModal` o el header) hace
  `onUpdate({ logoUrl: url })` para persistir en Supabase vía el PATCH
  existente — mismo flujo que cualquier otro campo del lead.
- Muestra un estado de carga simple (opacity reducida / spinner) mientras
  sube.

## Cambios de UI

### `ClientDataModal` (`src/components/clientes/client-detail-view.tsx`, líneas ~822+)
Se agrega `<LogoUploader>` arriba del campo "Nombre", usando `lead.id`
y `lead.logoUrl`.

### Header (`client-detail-view.tsx`, sección `client-detail-head`, líneas ~1680-1736)
- Se reemplaza el `<button>` de la carita (líneas ~1688-1695) por
  `<LogoUploader leadId={lead.id} logoUrl={lead.logoUrl} onUploaded={...} size={44} />`.
- El botón de la carita (`cycleEstado`, `ESTADO_FACES`) se reubica
  inmediatamente antes de `client-progress-circle` (línea ~1709), sin
  cambios de comportamiento (sigue siendo clickeable para ciclar
  estado).

### `ClientCard` (`src/components/clientes/clientes-view.tsx`, líneas ~30-146)
Se agrega un círculo de logo de solo lectura (imagen o placeholder),
~32-36px, posicionado junto al drag handle existente en la esquina
superior derecha de la tarjeta. No dispara upload — es puramente
visual, lee `lead.logoUrl` del store.

## Testing

- Subir un logo desde el modal de un cliente y verificar que aparece
  en el header y en la tarjeta de `/clientes` tras guardar.
- Reemplazar un logo existente y verificar que se actualiza (no queda
  cacheada la imagen vieja).
- Cliente sin logo: verificar placeholder gris en los tres lugares, sin
  errores de imagen rota.
- Verificar que la carita de estado sigue funcionando (ciclar estado)
  en su nueva posición junto al círculo de %.
