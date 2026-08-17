# Badge de responsable en tarjeta de cliente

**Fecha:** 2026-06-29  
**Estado:** Aprobado

## Objetivo

Mostrar un badge con el nombre y color del responsable asignado en cada tarjeta de la vista de clientes (`/clientes`). El color es propio de cada integrante del equipo y se configura desde su ventana de datos.

## Cambios

### 1. Tipo `TeamMember` (`src/types/team-member.ts`)
Agregar `color?: string` — hex color string, ej. `"#6366f1"`.

### 2. Supabase — columna `color` en `team_members`
```sql
ALTER TABLE team_members ADD COLUMN color TEXT;
```

### 3. Adapter team (`src/lib/supabase/adapters.ts`)
Mapear `row.color → color` en `adaptTeamMember`.

### 4. Serializer team (`src/lib/supabase/serializers.ts`)
Crear `serializeTeamMember` (o actualizar el existente) para incluir `color`.

### 5. Store team (`src/store/team.ts`)
Verificar que `updateMember` persiste en Supabase incluyendo `color`.

### 6. `datos-modal.tsx` (equipo)
Agregar sección "Color del integrante" con una paleta de 10 chips clickeables. Al seleccionar llama `onUpdate({ color })`.

Paleta:
- `#6366f1` violeta
- `#f59e0b` ámbar
- `#10b981` verde
- `#ef4444` rojo
- `#3b82f6` azul
- `#ec4899` rosa
- `#8b5cf6` púrpura
- `#06b6d4` cyan
- `#f97316` naranja
- `#84cc16` lima

### 7. `clientes-view.tsx`
- `ClientCard` recibe `members: TeamMember[]`
- Busca `responsable1` y `responsable2` por `nombre` en la lista
- Muestra chips debajo del servicio con color de fondo semitransparente (`color + "22"`) y borde (`color`)
- Si el integrante no tiene `color`, usa `#94a3b8` (gris neutro)
- Si el campo `responsable1` está vacío, no muestra nada

## Posición del badge en la tarjeta
```
[título (empresa)]
[servicio]                    [círculo progreso]
[👤 Resp1]  [👤 Resp2]
[N contenidos]
[badge Activo/Inactivo]
```

## Qué NO cambia
- Lógica de drag & drop
- Cálculo de progreso
- Estructura del modal de datos del cliente
