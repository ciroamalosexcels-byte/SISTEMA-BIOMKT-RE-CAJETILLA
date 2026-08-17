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
