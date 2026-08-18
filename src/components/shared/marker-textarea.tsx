"use client";

import { useEffect, useRef } from "react";
import { parseMarkers } from "@/lib/markers";

interface MarkerTextareaProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
  rows?: number;
  placeholder?: string;
  autoFocus?: boolean;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function valueToHtml(value: string): string {
  return parseMarkers(value)
    .map((segments) =>
      segments
        .map((seg) => {
          let html = escapeHtml(seg.text);
          if (seg.bold) html = `<strong>${html}</strong>`;
          if (seg.italic) html = `<em>${html}</em>`;
          if (seg.underline) html = `<u>${html}</u>`;
          return html;
        })
        .join("")
    )
    .join("<br>");
}

interface ActiveMarks {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

// Walks the contentEditable DOM back into the plain marker-wrapped text we store.
function domToValue(root: HTMLElement): string {
  const lines: string[] = [];
  let current = "";

  function flushLine() {
    lines.push(current);
    current = "";
  }

  function walk(node: ChildNode, active: ActiveMarks) {
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent ?? "";
      if (text === "") return;
      if (active.underline) text = `~${text}~`;
      if (active.italic) text = `_${text}_`;
      if (active.bold) text = `*${text}*`;
      current += text;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") {
      flushLine();
      return;
    }
    if (tag === "div" || tag === "p") {
      // contentEditable wraps subsequent lines in <div>/<p> on Enter in most browsers
      flushLine();
      for (const child of Array.from(el.childNodes)) walk(child, active);
      return;
    }
    const next = { ...active };
    if (tag === "strong" || tag === "b") next.bold = true;
    if (tag === "em" || tag === "i") next.italic = true;
    if (tag === "u") next.underline = true;
    for (const child of Array.from(el.childNodes)) walk(child, next);
  }

  for (const child of Array.from(root.childNodes)) walk(child, { bold: false, italic: false, underline: false });
  flushLine();
  return lines.join("\n");
}

export function MarkerTextarea({
  value, onChange, className, style, wrapperClassName, wrapperStyle,
  rows, placeholder, autoFocus,
}: MarkerTextareaProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Tracks the last value *this component* emitted, so the sync effect below
  // only touches the DOM (and resets the cursor) for externally-driven changes.
  const lastEmitted = useRef<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value === lastEmitted.current) return;
    el.innerHTML = valueToHtml(value);
    lastEmitted.current = value;
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleInput() {
    const el = ref.current;
    if (!el) return;
    const next = domToValue(el);
    lastEmitted.current = next;
    onChange(next);
  }

  function applyMarker(command: "bold" | "italic" | "underline") {
    ref.current?.focus();
    document.execCommand(command);
    handleInput();
  }

  return (
    <div className={wrapperClassName} style={wrapperStyle}>
      <div
        ref={ref}
        className={className}
        style={{
          ...style,
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
          minHeight: rows ? `${rows * 1.5}em` : style?.minHeight,
        }}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
      />
      <div className="marker-toolbar">
        <button type="button" className="marker-toolbar-btn" style={{ fontWeight: 800 }}
          onMouseDown={(e) => e.preventDefault()} onClick={() => applyMarker("bold")} aria-label="Negrita">B</button>
        <button type="button" className="marker-toolbar-btn" style={{ fontStyle: "italic" }}
          onMouseDown={(e) => e.preventDefault()} onClick={() => applyMarker("italic")} aria-label="Cursiva">I</button>
        <button type="button" className="marker-toolbar-btn" style={{ textDecoration: "underline" }}
          onMouseDown={(e) => e.preventDefault()} onClick={() => applyMarker("underline")} aria-label="Subrayado">U</button>
      </div>
    </div>
  );
}
