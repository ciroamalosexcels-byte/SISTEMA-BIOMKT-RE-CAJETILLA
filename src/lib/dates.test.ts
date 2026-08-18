import { describe, it, expect } from "vitest";
import { mayaAstrology, monthLabel, monthPickerRange, shiftMonth } from "./dates";

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

describe("shiftMonth", () => {
  it("advances within the same year", () => {
    expect(shiftMonth("2026-03", 1)).toBe("2026-04");
  });

  it("rolls over into the next year", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("rolls back into the previous year", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("supports multi-month deltas in both directions", () => {
    expect(shiftMonth("2026-08", 6)).toBe("2027-02");
    expect(shiftMonth("2026-08", -20)).toBe("2024-12");
  });
});

describe("monthLabel", () => {
  it("formats as 'MES AÑO' in uppercase Spanish", () => {
    expect(monthLabel("2026-08")).toBe("AGOSTO 2026");
    expect(monthLabel("2026-01")).toBe("ENERO 2026");
    expect(monthLabel("2026-12")).toBe("DICIEMBRE 2026");
  });
});

describe("monthPickerRange", () => {
  it("returns 25 months centered on the anchor", () => {
    const range = monthPickerRange("2026-08");
    expect(range).toHaveLength(25);
    expect(range[0]).toBe("2025-08");
    expect(range[12]).toBe("2026-08");
    expect(range[24]).toBe("2027-08");
  });

  it("is ordered chronologically", () => {
    const range = monthPickerRange("2026-01");
    for (let i = 1; i < range.length; i++) {
      expect(range[i] > range[i - 1]).toBe(true);
    }
  });

  it("defaults to the real current month when no anchor is given", () => {
    const range = monthPickerRange();
    expect(range).toHaveLength(25);
  });
});
