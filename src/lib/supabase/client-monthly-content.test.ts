import { describe, expect, it } from "vitest";
import { adaptClientMonthlyContentRow, serializeClientMonthlyContentInput } from "./client-monthly-content";
import type { ClientMonthlyContentRow } from "@/types/supabase";
import type { ClientMonthlyContentInput } from "@/types";

const row: ClientMonthlyContentRow = {
  id: "cmc-1",
  client_id: "lead-1",
  month: "2026-08",
  historias_hechas: 7,
  historias_contratadas: 7,
  reels_hechos: 0,
  reels_contratados: 8,
  publicaciones_hechas: 0,
  publicaciones_contratadas: 4,
  created_at: "2026-08-17T00:00:00Z",
  updated_at: "2026-08-17T00:00:00Z",
};

describe("adaptClientMonthlyContentRow", () => {
  it("maps DB row → domain object", () => {
    expect(adaptClientMonthlyContentRow(row)).toEqual({
      id: "cmc-1",
      clientId: "lead-1",
      month: "2026-08",
      historiasHechas: 7,
      historiasContratadas: 7,
      reelsHechos: 0,
      reelsContratados: 8,
      publicacionesHechas: 0,
      publicacionesContratadas: 4,
      createdAt: "2026-08-17T00:00:00Z",
      updatedAt: "2026-08-17T00:00:00Z",
    });
  });
});

describe("serializeClientMonthlyContentInput", () => {
  it("maps domain input → DB insert shape", () => {
    const input: ClientMonthlyContentInput = {
      clientId: "lead-1",
      month: "2026-08",
      historiasHechas: 7,
      historiasContratadas: 7,
      reelsHechos: 0,
      reelsContratados: 8,
      publicacionesHechas: 0,
      publicacionesContratadas: 4,
    };
    expect(serializeClientMonthlyContentInput(input)).toEqual({
      client_id: "lead-1",
      month: "2026-08",
      historias_hechas: 7,
      historias_contratadas: 7,
      reels_hechos: 0,
      reels_contratados: 8,
      publicaciones_hechas: 0,
      publicaciones_contratadas: 4,
    });
  });
});
