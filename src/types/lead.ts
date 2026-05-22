export type TabKey =
  | "CRM"
  | "REUNION_1"
  | "REUNION_2"
  | "SEGUIMIENTO"
  | "BASE"
  | "CLIENTES";

export type EmpresaBio = "BIOMARKETING" | "BIOESTRATEGIA";
export type Medio = "PRESENCIAL" | "LLAMADA" | "WHATSAPP" | "INSTAGRAM" | "MAIL";

export interface Lead {
  id: string;
  nombre: string;
  empresa: string;
  observaciones: string;
  telefono: string;
  responsable1: string;
  responsable2: string;
  direccion: string;
  empresaBio: EmpresaBio;
  medio: Medio | "";
  fechaContacto: string; // ISO date string
  tab: TabKey;
  // Seguimiento
  proximoSeguimientoDias?: number;
  proximoSeguimientoFecha?: string;
  // Reuniones
  meetingDatetime?: string;
}

export type LeadFormData = Omit<Lead, "id" | "fechaContacto" | "tab">;
