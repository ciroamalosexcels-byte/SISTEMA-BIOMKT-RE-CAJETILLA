# Credenciales de cliente en Supabase

**Fecha:** 2026-06-29  
**Estado:** Aprobado

## Problema

La UI en `ClientDataModal` ya tiene campos para "Clave Instagram" y "Clave Email". El serializador (`src/lib/supabase/serializers.ts`) ya los mapea a `clave` y `clave_email`. Sin embargo, la tabla `leads` en Supabase no tiene esas columnas — solo tiene `clave_secret_id` (arquitectura Vault sin usar). Las contraseñas se pierden al cambiar de dispositivo porque solo viven en `localStorage`.

## Solución

Agregar las columnas faltantes en Supabase y actualizar los tipos generados.

## Cambios

### 1. Migración Supabase
```sql
ALTER TABLE leads ADD COLUMN clave TEXT;
ALTER TABLE leads ADD COLUMN clave_email TEXT;
```

### 2. Tipos (`src/types/supabase.ts`)
Agregar `clave` y `clave_email` en `Row`, `Insert` y `Update` de la tabla `leads`.

## Qué NO cambia
- UI: sin cambios
- Store (`leads.ts`): sin cambios
- Serializador (`serializers.ts`): ya funciona
- API route (`/api/supabase/leads/[id]/route.ts`): ya funciona
