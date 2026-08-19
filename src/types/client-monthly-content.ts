export interface ClientMonthlyContent {
  id: string;
  clientId: string;
  month: string; // "YYYY-MM"
  historiasHechas: number;
  historiasContratadas: number;
  reelsHechos: number;
  reelsContratados: number;
  publicacionesHechas: number;
  publicacionesContratadas: number;
  createdAt: string;
  updatedAt: string;
}

export type ClientMonthlyContentInput = Omit<
  ClientMonthlyContent, "id" | "createdAt" | "updatedAt"
>;

/** Just the hecho/contratado counts, without the record's own identity —
 *  what a carried-forward (not-yet-persisted) month resolves to. */
export type ContentCounts = Pick<
  ClientMonthlyContent,
  | "historiasHechas" | "historiasContratadas"
  | "reelsHechos" | "reelsContratados"
  | "publicacionesHechas" | "publicacionesContratadas"
>;
