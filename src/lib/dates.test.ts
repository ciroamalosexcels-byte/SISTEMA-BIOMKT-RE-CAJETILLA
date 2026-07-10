import { describe, it, expect } from "vitest";
import { mayaAstrology } from "./dates";

describe("mayaAstrology", () => {
  it("calculates the expected Tzolk'in result for a known date", () => {
    expect(mayaAstrology("2026-07-10")).toEqual({
      signo: "Muluc",
      tono: "13",
      color: "Rojo",
      direccion: "Este",
      elemento: "Agua",
    });
  });

  it("advances one day in the 260-day cycle", () => {
    expect(mayaAstrology("2026-07-11")).toEqual({
      signo: "Ok",
      tono: "1",
      color: "Blanco",
      direccion: "Norte",
      elemento: "Perro",
    });
  });
});
