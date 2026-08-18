"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { monthPickerRange } from "@/lib/dates";

interface MonthPickerMenuProps {
  monthKey: string;
  onSelect: (monthKey: string) => void;
  monthLabel: (key: string) => string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function MonthPickerMenu({ monthKey, onSelect, monthLabel, className, style, children }: MonthPickerMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 240;
    const overflowsRight = rect.left + menuWidth > window.innerWidth;
    setPos(
      overflowsRight
        ? { top: rect.bottom + 6, right: window.innerWidth - rect.right }
        : { top: rect.bottom + 6, left: rect.left }
    );
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  const months = monthPickerRange();

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={className}
        // padding/color reset: this trigger replaces a plain <div>/<span> that
        // never had native <button> UA defaults to fight against
        style={{ padding: 0, color: "inherit", ...style }}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        {children}
      </button>
      {open && pos && createPortal(
        <div className="month-picker-menu" style={{ top: pos.top, left: pos.left, right: pos.right }}>
          {months.map((m) => (
            <button
              key={m}
              type="button"
              className={`month-picker-menu-item${m === monthKey ? " active" : ""}`}
              onClick={() => { onSelect(m); setOpen(false); }}
            >
              {monthLabel(m)}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
