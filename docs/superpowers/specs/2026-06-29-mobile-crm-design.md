# Mobile CRM — Spec de diseño
**Fecha:** 2026-06-29

## Objetivo

PWA mobile-first para carga rápida de prospectos en el pipeline de Biomarketing. Vive en `mobile-crm/` dentro del repo principal. Comparte la misma base de datos Supabase que el sistema desktop.

---

## Estructura de archivos

```
mobile-crm/
├── index.html          # Shell de la app + templates HTML
├── manifest.json       # PWA: nombre, íconos, display standalone
├── sw.js               # Service worker — cachea assets para uso offline
├── css/
│   └── style.css       # Design tokens idénticos a globals.css del sistema
└── js/
    ├── config.js       # SUPABASE_URL + SUPABASE_ANON_KEY (en .gitignore)
    ├── supabase.js     # Cliente @supabase/supabase-js via CDN esm.sh + CRUD
    ├── voice.js        # Web Speech API + parseador de keywords
    └── app.js          # Estado, renderizado, navegación entre tabs
```

`config.js` se agrega al `.gitignore`. La anon key de Supabase es pública por diseño (RLS la protege).

---

## Layout

### Header (fijo, top)
- Fondo `--dark` (#07152f)
- Texto "BIOMKT CRM" en `--amber`
- Botón dark mode toggle (icono luna/sol SVG)

### Contenido principal (scroll)
- Lista de leads del tab activo
- Cada tarjeta muestra: nombre, empresa, teléfono, fecha de contacto
- Al tocar una tarjeta: expande inline con todos los campos + botón editar/eliminar

### FABs (fijos, esquina inferior derecha)
- Dos botones circulares, fondo `--amber`, color `--dark`
- Icono lápiz (carga manual) — derecha
- Icono micrófono (carga por voz) — izquierda del lápiz
- Sin emojis — iconos SVG inline

### Bottom navigation (fijo, bottom)
- 4 tabs con icono SVG + label + badge numérico donde aplica:
  - Persona — "Prospecto" (tab `CRM`)
  - Apretón de manos + badge "1" — "Reunión 1" (tab `REUNION_1`)
  - Apretón de manos + badge "2" — "Reunión 2" (tab `REUNION_2`)
  - Campana — "Seguimiento" (tab `SEGUIMIENTO`)
- Tab activo: color `--amber`, resto: `--slate-400`

---

## Datos

### Fuente
Tabla `leads` en Supabase. Misma estructura que usa el sistema desktop (campo `tab` como discriminador).

### Lectura
Al iniciar y al cambiar de tab: `SELECT * FROM leads WHERE tab = $tab ORDER BY fechaContacto DESC`.

### Escritura
`INSERT INTO leads` con los campos mínimos requeridos:
- `id` (UUID generado en cliente)
- `nombre`, `empresa`, `telefono`, `tab`, `fechaContacto`
- `responsable1` (desde config local, o campo editable)
- `empresaBio` (default `"BIOMARKETING"`)
- `medio`, `direccion`, `observaciones` (opcionales, pueden quedar vacíos)

---

## Flujo de carga manual (FAB lápiz)

1. Usuario toca FAB lápiz
2. Se abre modal con formulario: nombre*, empresa*, teléfono, medio (select), dirección, observaciones
3. El tab destino es el tab activo actualmente (editable en el modal)
4. Confirmar → INSERT en Supabase → cerrar modal → refrescar lista

---

## Flujo de carga por voz (FAB micrófono)

1. Usuario selecciona el tab destino (ej: Reunión 1)
2. Toca FAB micrófono
3. Arranca `SpeechRecognition` (Web Speech API, idioma `es-AR`)
4. Hint en pantalla: `nombre · empresa · teléfono · dirección · observaciones`
5. Al terminar de hablar: se ejecuta el parseador local
6. Se abre el mismo modal de carga con campos pre-llenados
7. Usuario revisa/corrige → confirmar → INSERT en Supabase

### Parseador de voz (voice.js)

Palabras clave reconocidas (case-insensitive):
- `nombre` → campo `nombre`
- `empresa` → campo `empresa`
- `teléfono`, `telefono`, `tel`, `número`, `numero`, `celular` → campo `telefono`
- `dirección`, `direccion` → campo `direccion`
- `observaciones`, `observacion`, `nota`, `notas` → campo `observaciones`

Algoritmo:
1. Dividir transcript por keywords con regex
2. Cada segmento se asigna al campo correspondiente a la keyword que lo precede
3. Texto sin keyword al inicio → va a `observaciones`
4. Fallback: si no se detectó teléfono por keyword, buscar secuencia de 7+ dígitos en el transcript completo

Ejemplo de uso:
> "nombre Juan García empresa Panadería Sol teléfono 11 1234 5678 dirección Palermo observaciones interesado en plan básico para agosto"

---

## Diseño visual

- Mismos design tokens CSS que `src/app/globals.css`:
  - `--dark` (#07152f), `--amber` (#f6bf26), `--bg` (#dbe1e7), `--card` (#fff)
  - Border radius: `--r-sm` (12px) a `--r-xl` (28px)
  - Sombras: `--shadow`, `--shadow-sm`
- Dark mode: clase `dark-mode` en `<body>`, mismo mecanismo que el sistema
- Sin emojis en ningún elemento de UI
- Tipografía: system-ui (sin Google Fonts para no depender de red)
- Breakpoint único: diseñado para 375px–430px de ancho

---

## PWA

- `manifest.json`: `display: standalone`, `theme_color: #07152f`, `background_color: #07152f`
- `sw.js`: cachea `index.html`, `css/style.css`, todos los `.js`. Estrategia cache-first para assets, network-first para requests a Supabase.
- Instalable en pantalla de inicio de Android/iOS via Chrome

---

## Fuera de alcance

- Edición de leads existentes (fase 2)
- Filtros / búsqueda dentro de cada tab (fase 2)
- Autenticación propia — usa la misma anon key del sistema
- Notificaciones push
