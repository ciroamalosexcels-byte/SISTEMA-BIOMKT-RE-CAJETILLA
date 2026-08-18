"use client";

import { useRef } from "react";
import { parseMarkers, wrapSelectionWithMarker } from "@/lib/markers";

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

export function MarkerTextarea({
  value, onChange, className, style, wrapperClassName, wrapperStyle,
  rows, placeholder, autoFocus,
}: MarkerTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function applyMarker(marker: "*" | "_" | "~") {
    const el = ref.current;
    if (!el) return;
    const { text, selectionStart, selectionEnd } = wrapSelectionWithMarker(
      value,
      el.selectionStart ?? value.length,
      el.selectionEnd ?? value.length,
      marker
    );
    onChange(text);
    // controlled input: the DOM value only reflects `text` after React commits
    // the re-render, so restoring the selection must wait a tick past that.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  return (
    <div className={wrapperClassName} style={wrapperStyle}>
      <textarea
        ref={ref}
        className={className}
        style={style}
        rows={rows}
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="marker-toolbar">
        <button type="button" className="marker-toolbar-btn" style={{ fontWeight: 800 }}
          onMouseDown={(e) => e.preventDefault()} onClick={() => applyMarker("*")} aria-label="Negrita">B</button>
        <button type="button" className="marker-toolbar-btn" style={{ fontStyle: "italic" }}
          onMouseDown={(e) => e.preventDefault()} onClick={() => applyMarker("_")} aria-label="Cursiva">I</button>
        <button type="button" className="marker-toolbar-btn" style={{ textDecoration: "underline" }}
          onMouseDown={(e) => e.preventDefault()} onClick={() => applyMarker("~")} aria-label="Subrayado">U</button>
      </div>
      {value && (
        <div className="marker-preview">
          {parseMarkers(value).map((segments, lineIdx, lines) => (
            <span key={lineIdx}>
              {segments.map((seg, segIdx) => {
                let node: React.ReactNode = seg.text;
                if (seg.bold) node = <strong>{node}</strong>;
                if (seg.italic) node = <em>{node}</em>;
                if (seg.underline) node = <u>{node}</u>;
                return <span key={segIdx}>{node}</span>;
              })}
              {lineIdx < lines.length - 1 && <br />}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
