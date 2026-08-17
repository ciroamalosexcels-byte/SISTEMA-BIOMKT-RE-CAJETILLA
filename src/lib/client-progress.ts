import { CONTENIDOS_CATEGORIAS } from "./constants";
import type { ContentEvent, Lead } from "@/types";

const STATUS_SCORE: Record<string, number> = {
  "SIN EDITAR": 0,
  "EDITANDO": 0.5,
  "COMPLETO": 0.7,
  "CALENDARIZADO": 1.0,
};

/** % de contenidos contratados ya hechos (Historias + Reels + Publicaciones). null si no hay nada contratado. */
export function getContratadoProgress(lead: Lead): number | null {
  let hecho = 0;
  let contratado = 0;
  for (const { hechoKey, contratadoKey } of CONTENIDOS_CATEGORIAS) {
    const c = lead[contratadoKey] ?? 0;
    if (c <= 0) continue;
    hecho += lead[hechoKey] ?? 0;
    contratado += c;
  }
  return contratado > 0 ? hecho / contratado : null;
}

/** % de avance por estado de los eventos de contenido del cliente en un mes dado. null si no hay eventos ese mes. */
export function getEstadoProgress(clientId: string, contentEvents: ContentEvent[], month: string): number | null {
  const events = contentEvents.filter(
    (e) => e.clientId === clientId && e.scheduledDate?.slice(0, 7) === month
  );
  if (events.length === 0) return null;
  const total = events.reduce((sum, e) => sum + (STATUS_SCORE[e.status ?? ""] ?? 0), 0);
  return total / events.length;
}

/** Clase de color del círculo de progreso — verde/ámbar/rojo según el %. */
export function progressClass(pct: number) {
  if (pct >= 0.8) return "progress-green";
  if (pct >= 0.4) return "progress-amber";
  return "progress-red";
}
