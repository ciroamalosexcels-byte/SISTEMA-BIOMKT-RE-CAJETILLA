import type { ContentType, ContentStatus } from "./content-event";

export interface Plan {
  id: string;
  nombre: string;
  descripcion?: string;
  createdAt: string;
}

export interface PlanEvent {
  id: string;
  planId: string;
  title: string;
  type: ContentType | "";
  status: ContentStatus | "";
  scheduledDate?: string;
  planSlot?: string;
  frase?: string;
  notes?: string;
  assignee?: string;
  timerSeconds: number;
  timerRunning: boolean;
  timerStartedAt?: number;
  order: number;
  done: boolean;
}
