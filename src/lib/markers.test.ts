import { describe, it, expect } from "vitest";
import { parseMarkerLine, parseMarkers, wrapSelectionWithMarker } from "./markers";

describe("parseMarkerLine", () => {
  it("returns a single plain segment for text without markers", () => {
    expect(parseMarkerLine("hola mundo")).toEqual([{ text: "hola mundo" }]);
  });
  it("parses a bold segment", () => {
    expect(parseMarkerLine("*AGOSTO:*")).toEqual([{ text: "AGOSTO:", bold: true }]);
  });
  it("parses italic and underline segments with surrounding plain text", () => {
    expect(parseMarkerLine("_hola_ y ~mundo~")).toEqual([
      { text: "hola", italic: true },
      { text: " y " },
      { text: "mundo", underline: true },
    ]);
  });
  it("keeps an unmatched single marker as literal text", () => {
    expect(parseMarkerLine("Precio * 2")).toEqual([{ text: "Precio * 2" }]);
  });
  it("does not treat an empty pair as a marker", () => {
    expect(parseMarkerLine("**")).toEqual([{ text: "**" }]);
  });
});

describe("parseMarkers", () => {
  it("parses each line independently", () => {
    expect(parseMarkers("*a*\n_b_")).toEqual([
      [{ text: "a", bold: true }],
      [{ text: "b", italic: true }],
    ]);
  });
  it("does not pair markers across separate lines (bullet-list collision guard)", () => {
    expect(parseMarkers("* llamar lunes\n* pendiente pago")).toEqual([
      [{ text: "* llamar lunes" }],
      [{ text: "* pendiente pago" }],
    ]);
  });
});

describe("wrapSelectionWithMarker", () => {
  it("wraps a selection and keeps the wrapped text selected", () => {
    expect(wrapSelectionWithMarker("hola mundo", 5, 10, "*")).toEqual({
      text: "hola *mundo*", selectionStart: 6, selectionEnd: 11,
    });
  });
  it("inserts an empty pair with the cursor in between when nothing is selected", () => {
    expect(wrapSelectionWithMarker("hola ", 5, 5, "_")).toEqual({
      text: "hola __", selectionStart: 6, selectionEnd: 6,
    });
  });
  it("normalizes reversed selection ranges", () => {
    expect(wrapSelectionWithMarker("hola mundo", 10, 5, "~")).toEqual({
      text: "hola ~mundo~", selectionStart: 6, selectionEnd: 11,
    });
  });
  it("wraps raw text even if it already contains a marker pair (known edge case)", () => {
    expect(wrapSelectionWithMarker("*bold* text", 0, 6, "*")).toEqual({
      text: "**bold** text", selectionStart: 1, selectionEnd: 7,
    });
  });
});
