import type { ClientMonthlyContent, ClientMonthlyContentInput } from "@/types";
import type { ClientMonthlyContentInsert, ClientMonthlyContentRow } from "@/types/supabase";

export function adaptClientMonthlyContentRow(row: ClientMonthlyContentRow): ClientMonthlyContent {
  return {
    id: row.id,
    clientId: row.client_id,
    month: row.month,
    historiasHechas: row.historias_hechas,
    historiasContratadas: row.historias_contratadas,
    reelsHechos: row.reels_hechos,
    reelsContratados: row.reels_contratados,
    publicacionesHechas: row.publicaciones_hechas,
    publicacionesContratadas: row.publicaciones_contratadas,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeClientMonthlyContentInput(
  input: ClientMonthlyContentInput,
): Omit<ClientMonthlyContentInsert, "id" | "created_at" | "updated_at"> {
  return {
    client_id: input.clientId,
    month: input.month,
    historias_hechas: input.historiasHechas,
    historias_contratadas: input.historiasContratadas,
    reels_hechos: input.reelsHechos,
    reels_contratados: input.reelsContratados,
    publicaciones_hechas: input.publicacionesHechas,
    publicaciones_contratadas: input.publicacionesContratadas,
  };
}
