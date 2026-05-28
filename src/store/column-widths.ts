import { create } from "zustand";
import { storage } from "@/lib/storage";
import { saveToSheets } from "@/lib/sheets";

export const COLUMN_FIELDS = [
  { key: "nombre",       label: "Nombre",          defaultWidth: 135 },
  { key: "empresa",      label: "Empresa / Negocio", defaultWidth: 190 },
  { key: "observaciones",label: "Observaciones",   defaultWidth: 240 },
  { key: "telefono",     label: "Teléfono",        defaultWidth: 110 },
  { key: "responsable1", label: "Responsable 1",   defaultWidth: 130 },
  { key: "responsable2", label: "Responsable 2",   defaultWidth: 130 },
  { key: "fechaContacto",label: "Primer Contacto", defaultWidth: 134 },
  { key: "empresaBio",   label: "Empresa Bio",     defaultWidth: 120 },
  { key: "medio",        label: "Medio",           defaultWidth: 110 },
  { key: "actions",      label: "Pasar a",         defaultWidth: 185 },
] as const;

export const PLAN_COLUMN_FIELDS = [
  { key: "timer",    label: "Tiempo",      defaultWidth: 110 },
  { key: "assignee", label: "Encargado",   defaultWidth: 120 },
  { key: "fecha",    label: "Fecha pub.",  defaultWidth: 140 },
  { key: "cliente",  label: "Cliente",     defaultWidth: 140 },
  { key: "tipo",     label: "Tipo",        defaultWidth: 110 },
  { key: "estado",   label: "Estado",      defaultWidth: 140 },
  { key: "frase",    label: "Idea",        defaultWidth: 240 },
  { key: "notas",    label: "Feedback",    defaultWidth: 160 },
  { key: "del",      label: "",            defaultWidth: 44  },
] as const;

export const COLUMN_TABS = [
  "CRM",
  "REUNION_1",
  "REUNION_2",
  "SEGUIMIENTO",
  "CLIENTES",
  "BASE",
] as const;

function flatKey(tab: string, col: string) {
  return `${tab}_${col}`;
}

export const PLAN_ROW_HEIGHT_DEFAULT = 36;

function buildDefaults(): Record<string, number> {
  const r: Record<string, number> = {};
  for (const tab of COLUMN_TABS)
    for (const f of COLUMN_FIELDS)
      r[flatKey(tab, f.key)] = f.defaultWidth;
  for (const f of PLAN_COLUMN_FIELDS)
    r[flatKey("PLANIFICACION", f.key)] = f.defaultWidth;
  r["PLANIFICACION_rowHeight"] = PLAN_ROW_HEIGHT_DEFAULT;
  return r;
}

const DEFAULTS = buildDefaults();

let sheetsTimer: ReturnType<typeof setTimeout> | null = null;

function persist(widths: Record<string, number>) {
  storage.setColumnWidths(widths);
  if (sheetsTimer) clearTimeout(sheetsTimer);
  sheetsTimer = setTimeout(() => {
    saveToSheets({ action: "saveColumnWidths", columnWidths: widths }).catch(() => {});
  }, 2000);
}

interface ColumnWidthsState {
  widths: Record<string, number>;
  resizeModeEnabled: boolean;
  load: () => void;
  setWidthsFromSheets: (incoming: Record<string, number>) => void;
  getWidth: (tab: string, col: string) => number;
  setWidth: (tab: string, col: string, value: number) => void;
  setTabWidths: (tab: string, colWidths: Record<string, number>) => void;
  toggleResizeMode: () => void;
}

export const useColumnWidthsStore = create<ColumnWidthsState>((set, get) => ({
  widths: { ...DEFAULTS },
  resizeModeEnabled: false,

  load() {
    const saved = storage.getColumnWidths();
    set({ widths: { ...DEFAULTS, ...saved } });
  },

  setWidthsFromSheets(incoming) {
    const widths = { ...DEFAULTS, ...incoming };
    set({ widths });
    storage.setColumnWidths(widths);
  },

  getWidth(tab, col) {
    return get().widths[flatKey(tab, col)] ?? DEFAULTS[flatKey(tab, col)] ?? 120;
  },

  setWidth(tab, col, value) {
    const widths = { ...get().widths, [flatKey(tab, col)]: value };
    set({ widths });
    persist(widths);
  },

  setTabWidths(tab, colWidths) {
    const updates: Record<string, number> = {};
    for (const [col, val] of Object.entries(colWidths))
      updates[flatKey(tab, col)] = val;
    const widths = { ...get().widths, ...updates };
    set({ widths });
    persist(widths);
  },

  toggleResizeMode() {
    set((s) => ({ resizeModeEnabled: !s.resizeModeEnabled }));
  },
}));
