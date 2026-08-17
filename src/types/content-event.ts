export type ContentType = "CARRUSEL" | "REEL" | "PLACA" | "HISTORIA";
export type ContentStatus = "SIN EDITAR" | "EDITANDO" | "COMPLETO" | "CALENDARIZADO";
export type ManagementType =
  | "Acompañamiento"
  | "Llamada"
  | "Visita"
  | "Cobro"
  | "Reunión"
  | "Producción"
  | "Pago";

export type BulkEventKind = "content" | "management";
export type BulkRecurrence = "once" | "count" | "monthly";

export interface BulkEventSeries {
  id: string;
  kind: BulkEventKind;
  title: string;
  type: ContentType | ManagementType;
  clientIds: string[];
  dayOfMonth: number;
  time: string;
  startMonth: string;
  recurrence: BulkRecurrence;
  repeatCount: number;
  createdAt: string;
  updatedAt: string;
}

export type BulkEventSeriesInput = Omit<
  BulkEventSeries,
  "id" | "createdAt" | "updatedAt"
>;

export interface ContentEvent {
  id: string;
  clientId: string;
  title: string;
  type: ContentType | "";
  status: ContentStatus | "";
  scheduledDate?: string;
  done: boolean;
  // Timer (seconds elapsed)
  timerSeconds: number;
  timerRunning: boolean;
  timerStartedAt?: number; // timestamp ms
  notes?: string;
  order: number;
  // Extended planning fields
  assignee?: string;
  objetivo?: string;
  frase?: string;
  copy?: string;
  archivo?: string;
}

export interface ManagementEvent {
  id: string;
  clientId: string;
  title: string;
  type: ManagementType | "";
  datetime?: string;
  done: boolean;
  notes?: string;
}
