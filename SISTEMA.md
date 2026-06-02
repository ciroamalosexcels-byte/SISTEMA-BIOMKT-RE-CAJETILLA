# Sistema Biomarketing — Documentación del Proyecto

## ¿Qué es este sistema?

Sistema interno de gestión para **Biomarketing / Bioestrategia**, una agencia de marketing digital argentina. Integra tres áreas de trabajo en una sola aplicación:

1. **CRM de ventas** — seguimiento del pipeline comercial desde el primer contacto hasta el cierre
2. **Gestión de clientes** — planificación y seguimiento de la producción de contenido de cada cliente activo
3. **Gestión de equipo** — desempeño, procedimientos internos y reuniones del equipo

La información se persiste en **localStorage** (caché local) y se sincroniza con **Google Sheets** como backend principal. Todo funciona en zona horaria de Buenos Aires.

---

## Arquitectura general

```
Next.js 15 (App Router)
├── src/app/           → Páginas (rutas)
├── src/components/    → Componentes de UI por módulo
├── src/store/         → Estado global (Zustand)
├── src/lib/           → Constantes, fechas, storage, API Sheets
└── src/types/         → Tipos TypeScript
```

### Stores (estado global)

| Store | Qué guarda |
|---|---|
| `useLeadsStore` | Todos los leads/prospectos del sistema |
| `useTeamStore` | Miembros del equipo, badges y puntos |
| `useContentEventsStore` | Contenidos y eventos de gestión de clientes |
| `usePlansStore` | Planes estratégicos con eventos |
| `usePipelineStore` | Etapas del tablero Kanban (configurables) |
| `useAppSettings` | Configuración general (dark mode, escala, modo workspace, etc.) |

### Workspaces (modos de trabajo)

El sidebar cambia los links visibles según el workspace activo:

| Workspace | Pantallas incluidas |
|---|---|
| **Ventas** | Dashboard · Seguimiento · Clientes · Equipo · Calendario |
| **Clientes** | Clientes · Planificación · Planes · Mapa · Calendario |
| **Equipo** | Equipo · Colaboradores · Procedimientos · Reunión de Equipo |

---

## Navegación

### Sidebar — rail de íconos (siempre visible)

| Elemento | Acción |
|---|---|
| Logo **B** | — (identidad) |
| Ícono 📈 Ventas | Cambia al workspace Ventas y redirige al Dashboard |
| Ícono 👥 Clientes | Cambia al workspace Clientes y redirige a Clientes |
| Ícono 🏢 Equipo | Cambia al workspace Equipo y redirige a Equipo |
| 🌙 / ☀️ | Alterna modo noche / modo claro |
| 🔔 Campana | Abre el historial de notificaciones |
| ⚙️ Engranaje | Despliega menú de configuración avanzada |

### Sidebar — panel de navegación (colapsable)

| Elemento | Acción |
|---|---|
| Nombre del workspace | Indicador visual del modo activo |
| ◀ Flecha colapsar | Oculta el panel para ganar espacio en pantalla |
| Links de navegación | Navegan a la sección correspondiente |
| **Guardar en Sheets** | Guarda todos los datos en Google Sheets manualmente |
| **Sincronizar Sheets** | Descarga los datos más recientes desde Google Sheets |

### Menú de configuración (engranaje)

| Opción | Descripción |
|---|---|
| Importar leads | Carga leads desde un archivo CSV/JSON |
| Link API | Cambia la URL del Apps Script de Google Sheets |
| Ancho columnas | Personaliza el ancho de columnas en las tablas |
| Escalar sistema | Ajusta la escala visual global (0.5 a 1.5) |

---

## Pantallas

---

### 1. Dashboard `/dashboard`

**Propósito:** Panel de control con métricas de ventas y desempeño del equipo en tiempo real.

#### Secciones (reordenables y ocultables desde ⚙️ → Configurar dashboard)

| Sección | Qué muestra |
|---|---|
| **Selector de mes** | Botones `< >` para navegar entre meses, botón "Hoy" |
| **Tabla HOY** | Contactos, reuniones y objetivo diario de cada miembro |
| **Tabla AÑO** | Contactos, reuniones y cierres acumulados del año |
| **Tabla MES** | Totales del mes seleccionado por miembro |
| **Gráficos diarios** | 3 gráficos de barras: contactos CRM, reuniones y clientes cerrados por día del mes |
| **Crecimiento mensual** | Gráfico de área por día del mes |
| **Crecimiento anual** | Gráfico de área por mes del año |

#### Indicadores de color en tablas

| Color | Significado |
|---|---|
| 🟢 Verde lima | ≥ 120% del objetivo |
| 🟢 Verde | 100–120% |
| 🟡 Amarillo | 70–100% |
| 🔴 Rojo | < 70% |

#### Acciones

- Editar **objetivo diario** de cada miembro (click en el número)
- Navegar entre meses con `<` y `>`
- Ir al mes actual con el botón **Hoy**
- Hover sobre barras/líneas para ver tooltip con valores exactos

---

### 2. Seguimiento `/seguimiento`

**Propósito:** Pipeline visual para gestionar todos los leads del embudo de ventas en un solo tablero. Reemplaza las antiguas pantallas separadas de CRM, Reunión 1, Reunión 2, Seguimiento y Base de Datos.

#### Vista Kanban (default)

Cada columna representa una **etapa del pipeline**. Las etapas por defecto son:

| Etapa | Color | Descripción |
|---|---|---|
| Prospecto | Azul | Primer contacto establecido |
| Reunión 1 | Violeta | Auditoría y presentación |
| Reunión 2 | Rosa | Entrega de propuesta y cierre |
| Seguimiento | Naranja | Reactivación o negociación en curso |
| Cliente ✓ | Verde | Cierre exitoso — cliente activo |

#### Tarjeta de lead

Cada tarjeta muestra:
- Nombre del lead
- Empresa
- Etiqueta de medio de contacto (WS, IG, Llamada, etc.)
- Fecha de reunión o próximo seguimiento (si aplica)
- Alerta 🔴 si hay seguimiento vencido o para hoy
- Avatar con iniciales del responsable

**Hover sobre tarjeta:** aparecen botones de acción rápida (WhatsApp, ver detalle).

#### Acciones en el tablero

| Acción | Cómo |
|---|---|
| Mover lead de etapa | Arrastrar la tarjeta a otra columna (drag & drop) |
| Abrir detalle del lead | Click en la tarjeta |
| Agregar lead a una etapa | Botón **+ Agregar lead** al pie de cada columna |
| Nuevo lead (etapa 1) | Botón **+ Nuevo lead** en el topbar |
| Renombrar etapa | Ícono ✏️ en el encabezado de la columna → editar nombre y color |
| Eliminar etapa | Botón "eliminar etapa" → pide a qué etapa migrar los leads existentes |
| Agregar nueva etapa | Botón **+ Nueva etapa** al final del tablero |
| Cambiar a vista Tabla | Toggle **Kanban / Tabla** en el topbar |

#### Vista Tabla

Lista plana de todos los leads con columnas: Nombre · Empresa · Etapa · Responsable · Medio · Seguimiento. Click en fila abre el modal de edición.

#### Modal de lead (crear / editar)

Al abrir un lead, el modal muestra:

| Sección | Campos |
|---|---|
| **Etapa** | Pills para mover el lead entre etapas (reemplaza el drag & drop) |
| **Acciones rápidas** | WhatsApp · Llamar · Instagram · Agendar Reunión |
| **Contacto** | Nombre · Empresa · Teléfono · Instagram · Email · Rubro |
| **Gestión** | Responsable · Medio · Empresa Bio · Seguimiento · Fecha reunión · Servicio |
| **Info adicional** | Dirección · Objetivos |
| **Observaciones** | Texto libre |

Botones del modal: **Guardar cambios** · **Cancelar** · **🗑 Eliminar lead**.

---

### 3. Clientes `/clientes`

**Propósito:** Vista en tarjetas de todos los clientes activos con indicador de avance en su plan de contenido.

#### Tarjeta de cliente

- Nombre del cliente y empresa
- Servicio contratado
- **Círculo de progreso** (%) basado en contenidos completados vs. planificados
  - 🔴 < 40% · 🟡 40–80% · 🟢 ≥ 80%
- Badge **Activo** / **Inactivo**

#### Acciones

- Click en tarjeta → navega al detalle del cliente `/clientes/[id]`

---

### 4. Detalle de cliente `/clientes/[id]`

**Propósito:** Hub completo de un cliente activo con toda su información de producción.

#### Sub-pestañas

| Pestaña | Contenido |
|---|---|
| **Planes** | Planes de contenido asignados con matriz de slots |
| **Mapa** | Calendario mensual de publicaciones programadas |
| **Calendario** | Eventos de gestión (cobros, llamadas, visitas, producciones) |
| **Gestión** | Checklist de tareas y seguimiento personalizado |

#### Pestaña Planes

- Lista de planes con contenidos (CARRUSEL, REEL, PLACA, HISTORIA)
- Cada contenido tiene: tipo, cantidad, día, idea, estado y timer
- **Estados de contenido:** SIN EDITAR → EDITANDO → COMPLETO → CALENDARIZADO
- **Timer:** ▶ iniciar · ⏸ pausar · ↺ resetear — mide tiempo de edición

#### Pestaña Mapa (Calendario de publicación)

- Grid mensual con slots por día (LUN\_A, LUN\_B, MAR\_A, etc.)
- Muestra qué contenido está calendarizado en cada slot
- Navegar meses con `< >`

#### Pestaña Calendario (Eventos de gestión)

- Lista cronológica de eventos del cliente
- Tipos: Acompañamiento · Llamada · Visita · Cobro · Reunión · Producción · Pago
- Crear evento con: tipo, fecha, hora, descripción
- Marcar como completado ✓

---

### 5. Equipo `/equipo`

**Propósito:** Vista general del equipo de ventas con badges y estadísticas de desempeño.

#### Tarjeta de miembro

- Nombre
- Cantidad de leads asignados
- Badges obtenidos según cierres:
  - 🪵 Madera: 3 cierres
  - 🥉 Bronce: 8 cierres
  - 🥈 Plata: 12 cierres
  - 🥇 Oro: 30 cierres

#### Acciones

| Acción | Cómo |
|---|---|
| Ver perfil completo | Click en la tarjeta → `/equipo/[id]` |
| Agregar miembro | Botón **+ Agregar** |
| Eliminar miembro | Botón **Eliminar** en la tarjeta (pide confirmación) |

---

### 6. Perfil de miembro `/equipo/[id]`

**Propósito:** Perfil detallado de un integrante del equipo con historial de desempeño.

#### Secciones

| Sección | Contenido |
|---|---|
| **Datos personales** | Nombre, fecha de nacimiento, edad, signo zodiacal y chino |
| **Indicador visual** | Color dot editable: 🔴 rojo · 🟡 amarillo · 🟢 verde · 🟩 lima |
| **Status 9.1** | 10 ítems de cultura organizacional (COMPROMISO, HONESTIDAD, CONFIANZA, etc.) |
| **Badges** | Historial con cantidad de veces que obtuvo cada nivel |
| **Puntos mensuales** | Tabla de 12 filas: puntos, detalle, fecha, estado |
| **Gráfico** | Evolución de cierres por mes |

#### Acciones

- Editar cualquier campo directamente en el perfil
- Otorgar badge manualmente
- Cambiar color dot
- Agregar / editar fila de puntos mensuales

---

### 7. Planificación `/planificacion`

**Propósito:** Tabla maestra de planificación de contenido para todos los clientes activos.

#### Estructura de la tabla

- **Filas:** Un cliente por fila
- **Columnas:** Campos del plan de contenido (editables en ancho)
- **Celdas coloreadas** por estado: Rojo · Naranja · Amarillo · Verde

#### Columnas de contenido por cliente

Cada cliente muestra sus bloques de contenido con: tipo · cantidad · día del mes · idea · estado · timer de edición.

#### Acciones

| Acción | Cómo |
|---|---|
| Editar evento de contenido | Click en celda → abre editor |
| Cambiar estado | Dropdown en el editor |
| Iniciar timer | ▶ en la celda |
| Programar en calendario | Selector de slot (LUN\_A, MAR\_B, etc.) |
| Ajustar ancho de columna | Arrastrar borde de columna |

---

### 8. Planes `/planes`

**Propósito:** Gestión de plantillas de planes estratégicos que se pueden asignar a clientes.

#### Tarjeta de plan

- Nombre del plan
- Descripción
- Cantidad de contenidos asociados
- Fecha de creación

#### Acciones

- Botón **+ Agregar plan** → modal con nombre y descripción
- Click en tarjeta → detalle completo del plan `/planes/[id]`
- Dentro del detalle: crear, editar y eliminar eventos de contenido del plan

**Servicios disponibles:** Contenido Audiovisual · Página Web · Branding · Pauta Publicitaria · Eventos

---

### 9. Calendario `/calendario`

**Propósito:** Vista centralizada de todos los eventos del mes — reuniones, seguimientos y producciones.

#### Tipos de eventos visualizados

| Color | Tipo | Criterio |
|---|---|---|
| Naranja | Reunión 1 | Lead en etapa REUNION\_1 con fecha programada |
| Amarillo | Reunión 2 | Lead en etapa REUNION\_2 con fecha programada |
| Rojo | Seguimiento | Lead con fecha de seguimiento |
| Verde | Producción/Gestión | Eventos de gestión de clientes |

#### Acciones

- Navegar meses con `< >` y botón **Hoy**
- Click en un día → modal con lista de eventos de ese día
- Click en un evento → navega al lead o cliente correspondiente

---

### 10. Procedimientos `/procedimientos`

**Propósito:** Documentación visual de los procesos internos del equipo, tipo guía paso a paso.

#### Estructura

- Cada procedimiento tiene un nombre y una lista de hasta 30 pasos
- Cada paso tiene: título, descripción, ícono (🚩, 🚀, ⭐, 🏆, etc.) y estado (completado o pendiente)
- Vista **roadmap** en SVG: 5 pasos por fila con líneas de conexión

#### Acciones

| Acción | Cómo |
|---|---|
| Crear procedimiento | Botón **+ Nuevo procedimiento** |
| Agregar paso | Botón **+ Paso** dentro del procedimiento |
| Marcar paso completado | Checkbox en el paso |
| Cambiar ícono del paso | Selector de 20 íconos |
| Eliminar procedimiento | Botón eliminar (pide confirmación) |

**Persistencia:** localStorage + sincronización a Google Sheets.

---

### 11. Colaboradores `/colaboradores`

**Propósito:** Directorio de freelancers, proveedores y contactos externos.

#### Datos por colaborador

- Nombre · Edad · Teléfono · Herramientas que usa · Observaciones

#### Acciones

- Botón **+ Agregar colaborador** → modal con los campos
- Click en tarjeta → editar datos
- Botón **Borrar** → elimina con confirmación

---

### 12. Reunión de Equipo `/reuniones-equipo`

**Propósito:** Registro y actas de reuniones internas del equipo.

#### Datos por reunión

- Fecha · Hora · Tema · Notas / acta

#### Acciones

- Botón **+ Nueva reunión** → modal con fecha predeterminada a hoy
- Click en fila → editar reunión
- Botón **Eliminar** → borra con confirmación
- La tabla se ordena por fecha descendente (más reciente arriba)

---

### 13. Mapa `/mapa`

**Propósito:** Visualización geográfica aproximada de clientes y leads sobre un mapa estilizado.

#### Datos visualizados

Solo muestra leads en etapas activas (CLIENTES, SEGUIMIENTO, REUNION\_1, REUNION\_2).

| Color del pin | Etapa |
|---|---|
| 🟢 Verde | Cliente activo |
| 🟠 Naranja | Seguimiento |
| 🔵 Celeste | Reunión 1 |
| 🟣 Violeta | Reunión 2 |

#### Acciones

- Hover en pin → tooltip con nombre, empresa, dirección y etapa
- Click en pin → abre Google Maps con la dirección del cliente

---

## Funcionalidades transversales

### Persistencia de datos

| Capa | Descripción |
|---|---|
| **localStorage** | Caché local inmediata. Toda acción se guarda al instante |
| **Google Sheets** | Backend principal. Se sincroniza manualmente ("Guardar en Sheets") o automáticamente cada 5 minutos |
| **Undo / Redo** | Ctrl+Z / Ctrl+Y en cualquier pantalla para deshacer/rehacer cambios en leads (historial de 50 estados) |

### Notificaciones

- **Toast** (banner temporal 4 seg): confirmaciones de guardado, errores de sync
- **Log de notificaciones** (campana 🔔): historial completo con fecha y hora Argentina

### Configuración avanzada (⚙️)

| Opción | Descripción |
|---|---|
| Importar leads | Carga masiva desde archivo |
| Link API | URL del Google Apps Script para sync |
| Ancho de columnas | Personalizar ancho en tablas de planificación |
| Escalar sistema | Zoom global de la interfaz (0.5 a 1.5) |

### Modo noche / claro

Toggle 🌙 / ☀️ en la parte inferior del rail izquierdo. Afecta todos los colores de la aplicación excepto el sidebar (siempre oscuro).

---

## Flujos principales de trabajo

### Flujo de ventas
```
Prospecto → Reunión 1 → Reunión 2 → Seguimiento (si no cierra) → Cliente ✓
```
Todo sucede en **Seguimiento (/seguimiento)** arrastrando tarjetas entre columnas o usando los pills del modal.

### Flujo de gestión de cliente
```
Cliente en etapa CLIENTES
  → Asignar Plan
  → Crear contenidos (CARRUSEL, REEL, PLACA, HISTORIA)
  → Planificar en calendario (slot por día)
  → Trackear tiempo de edición (timer)
  → Marcar como COMPLETO / CALENDARIZADO
  → Registrar eventos de gestión (cobros, entregas, visitas)
```

### Flujo de seguimiento de equipo
```
Dashboard → ver métricas diarias/mensuales/anuales
Equipo → ver badges y leads asignados por miembro
Perfil → editar puntos mensuales y Status 9.1
```

---

## Stack técnico

| Tecnología | Uso |
|---|---|
| Next.js 15 (App Router) | Framework principal |
| React 19 | UI |
| TypeScript | Tipado estático |
| Zustand | Estado global |
| Tailwind CSS v4 | Estilos utilitarios |
| lucide-react | Íconos |
| @dnd-kit | Drag & drop del Kanban |
| date-fns + date-fns-tz | Manejo de fechas en zona horaria Argentina |
| Google Apps Script | Backend / API de Google Sheets |
| localStorage | Persistencia local offline-first |
