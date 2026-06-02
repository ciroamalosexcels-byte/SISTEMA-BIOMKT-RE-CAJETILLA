/** Alias legacy — Lead.tab es ahora string dinámico (id de PipelineStage) */
export type TabKey = string;

export type EmpresaBio = "BIOMARKETING" | "BIOESTRATEGIA";
export type Medio = "PRESENCIAL" | "LLAMADA" | "WHATSAPP" | "INSTAGRAM" | "MAIL";

export interface Lead {
  id: string;
  nombre: string;
  nombre2?: string;
  empresa: string;
  observaciones: string;
  telefono: string;
  telefono2?: string;
  responsable1: string;
  responsable2: string;
  direccion: string;
  empresaBio: EmpresaBio;
  medio: Medio | "";
  fechaContacto: string; // ISO date string
  tab: TabKey;
  // Extended client fields
  email?: string;
  instagram?: string;
  rubro?: string;
  servicio?: string;
  source?: string;
  mesEntrada?: string; // YYYY-MM
  objetivos?: string;
  planAudiovisual?: string;
  cumpleanos?: string;  // ISO date string — contacto principal
  cumpleanos2?: string; // ISO date string — segundo contacto
  // Credenciales
  clave?: string;
  // Seguimiento
  proximoSeguimientoDias?: number;
  proximoSeguimientoFecha?: string;
  // Reuniones
  meetingDatetime?: string;
  // Plan de contenido asignado
  planId?: string;
  // Estado
  activo?: boolean; // undefined / true = activo, false = inactivo
}

export type LeadFormData = Omit<Lead, "id" | "fechaContacto" | "tab">;
