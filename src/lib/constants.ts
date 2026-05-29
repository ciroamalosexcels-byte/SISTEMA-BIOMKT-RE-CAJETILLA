import type { EmpresaBio, Medio, ContentType, ContentStatus, ManagementType } from "@/types";

export const STORAGE_KEYS = {
  rows: "ventas_biomarketing_v2",
  team: "ventas_biomarketing_team_v2",
  dashboard: "ventas_biomarketing_dashboard_v2",
  columnWidths: "ventas_biomarketing_column_widths_v2",
  appSettings: "ventas_biomarketing_app_settings_v2",
  awards: "ventas_biomarketing_awards_v2",
  contentEvents: "ventas_biomarketing_client_content_events_v1",
  managementEvents: "ventas_biomarketing_client_management_events_v1",
  plans: "ventas_biomarketing_plans_v1",
  planEvents: "ventas_biomarketing_plan_events_v1",
} as const;

export const BA_TIME_ZONE = "America/Argentina/Buenos_Aires";

export const DEFAULT_TEAM = ["TINCHO", "MATE", "LOREN", "CIRO"];

export const EMPRESA_BIO_OPTS: EmpresaBio[] = ["BIOMARKETING", "BIOESTRATEGIA"];

export const MEDIO_OPTS: Medio[] = [
  "PRESENCIAL",
  "LLAMADA",
  "WHATSAPP",
  "INSTAGRAM",
  "MAIL",
];

export const CONTENT_TYPES: ContentType[] = [
  "CARRUSEL",
  "REEL",
  "PLACA",
  "HISTORIA",
];

export const CONTENT_STATUS: ContentStatus[] = [
  "SIN EDITAR",
  "EDITANDO",
  "COMPLETO",
  "CALENDARIZADO",
];

export const MANAGEMENT_TYPES: ManagementType[] = [
  "Acompañamiento",
  "Llamada",
  "Visita",
  "Cobro",
  "Reunión",
  "Producción",
  "Pago",
];

export const STATUS91_ITEMS = [
  "COMPROMISO", "HONESTIDAD", "CONFIANZA", "APRENDER", "BIENESTAR",
  "GANAR DINERO", "SUMAR", "MULTIPLICAR", "COLABORATIVO", "TU SUEÑO",
] as const;

export const BADGES = [
  { key: "wood", label: "Madera", icon: "🪵", className: "wood" },
  { key: "bronze", label: "Bronce", icon: "🥉", className: "bronze" },
  { key: "silver", label: "Plata", icon: "🥈", className: "silver" },
  { key: "gold", label: "Oro", icon: "🥇", className: "gold" },
] as const;

export const TABS = [
  { key: "DASHBOARD", label: "Dashboard", href: "/dashboard" },
  { key: "CRM", label: "CRM General", href: "/crm" },
  { key: "REUNION_1", label: "Reunión 1", href: "/reunion/1" },
  { key: "REUNION_2", label: "Reunión 2", href: "/reunion/2" },
  { key: "SEGUIMIENTO", label: "Seguimiento", href: "/seguimiento" },
  { key: "BASE", label: "Base de Datos", href: "/base" },
  { key: "CLIENTES", label: "Clientes", href: "/clientes" },
  { key: "PLANIFICACION", label: "Planificación de contenidos", href: "/planificacion" },
  { key: "PLANES", label: "Planes", href: "/planes" },
  { key: "MAPA_CLIENTES", label: "Mapa", href: "/mapa" },
  { key: "EQUIPO", label: "Equipo", href: "/equipo" },
  { key: "COLABORADORES", label: "Colaboradores", href: "/colaboradores" },
  { key: "PROCEDIMIENTOS", label: "Procedimientos", href: "/procedimientos" },
  { key: "REUNIONES_EQUIPO", label: "Reunión", href: "/reuniones-equipo" },
  { key: "CALENDARIO", label: "📅", href: "/calendario" },
] as const;

export type WorkspaceMode = "ventas" | "clientes" | "equipo";

export const WORKSPACE_TITLES: Record<WorkspaceMode, string> = {
  ventas: "VENTAS BIOMARKETING",
  clientes: "CLIENTES BIOMARKETING",
  equipo: "EQUIPO BIOMARKETING",
};

export const WORKSPACE_OPTION_LABELS: Record<WorkspaceMode, string> = {
  ventas: "Ventas Biomarketing",
  clientes: "Clientes Biomarketing",
  equipo: "Equipo Biomarketing",
};

/* Tab keys visible per workspace mode (matches VIEW_TABS_V30 from the HTML reference) */
export const WORKSPACE_TABS: Record<WorkspaceMode, string[]> = {
  ventas:   ["DASHBOARD", "SEGUIMIENTO", "CLIENTES", "EQUIPO", "CALENDARIO"],
  clientes: ["CLIENTES", "PLANIFICACION", "PLANES", "MAPA_CLIENTES", "CALENDARIO"],
  equipo:   ["EQUIPO", "COLABORADORES", "PROCEDIMIENTOS", "REUNIONES_EQUIPO"],
};

export interface WorkspaceNavItem {
  key: string;
  label: string;
  href: string;
}

export const WORKSPACE_NAV: Record<WorkspaceMode, WorkspaceNavItem[]> = {
  ventas: [
    { key: "DASHBOARD",    label: "Dashboard",    href: "/dashboard" },
    { key: "SEGUIMIENTO",  label: "Leads",        href: "/seguimiento" },
    { key: "CLIENTES",     label: "Clientes",     href: "/clientes" },
    { key: "EQUIPO",       label: "Equipo",       href: "/equipo" },
    { key: "CALENDARIO",   label: "Calendario",   href: "/calendario" },
  ],
  clientes: [
    { key: "DASHBOARD_CLIENTES", label: "Dashboard",     href: "/clientes/dashboard" },
    { key: "CLIENTES",           label: "Clientes",      href: "/clientes" },
    { key: "PLANIFICACION",      label: "Planificación", href: "/planificacion" },
    { key: "PLANES",             label: "Planes",        href: "/planes" },
    { key: "MAPA_CLIENTES",      label: "Mapa",          href: "/mapa" },
    { key: "CALENDARIO",         label: "Calendario",    href: "/calendario" },
  ],
  equipo: [
    { key: "DASHBOARD_EQUIPO",   label: "Dashboard",         href: "/equipo/dashboard" },
    { key: "EQUIPO",             label: "Equipo",            href: "/equipo" },
    { key: "COLABORADORES",      label: "Colaboradores",     href: "/colaboradores" },
    { key: "PROCEDIMIENTOS",     label: "Procedimientos",    href: "/procedimientos" },
    { key: "REUNIONES_EQUIPO",   label: "Reunión de Equipo", href: "/reuniones-equipo" },
  ],
};

export const DEFAULT_BADGE_REQUIREMENTS = {
  wood: 3,
  bronze: 8,
  silver: 12,
  gold: 30,
};

export const PLAN_SERVICES = [
  "Contenido Audiovisual",
  "Página Web",
  "Branding",
  "Pauta Publicitaria",
  "Eventos",
] as const;

export const PLAN_NAMES = ["Plan 1", "Plan 2", "Plan 3"] as const;

export interface PlanItem {
  type: string;
  qty: number;
  day: number;
  idea: string;
}
