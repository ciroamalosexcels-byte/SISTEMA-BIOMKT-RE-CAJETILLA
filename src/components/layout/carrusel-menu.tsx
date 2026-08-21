"use client";

import { useAppSettings } from "@/store/app-settings";
import { CARRUSEL_SECTIONS } from "@/lib/constants";

interface Props {
  onClose: () => void;
  sidebarW: number;
}

const DEFAULT_DURATION = 15;

export function CarruselMenu({ onClose, sidebarW }: Props) {
  const carruselMode = useAppSettings((s) => s.settings.carruselMode);
  const update = useAppSettings((s) => s.update);

  function toggleEnabled() {
    update({ carruselMode: { ...carruselMode, enabled: !carruselMode.enabled } });
  }

  function toggleSection(key: string) {
    const sections = carruselMode.sections.includes(key)
      ? carruselMode.sections.filter((k) => k !== key)
      : [...carruselMode.sections, key];
    update({ carruselMode: { ...carruselMode, sections } });
  }

  function setDuration(seconds: number) {
    update({ carruselMode: { ...carruselMode, durationSeconds: seconds } });
  }

  return (
    <div style={{
      position: "fixed", left: sidebarW + 4, bottom: 44, zIndex: 300,
      background: "#07152f", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14, padding: 8, width: 228,
      boxShadow: "0 18px 50px rgba(0,0,0,0.6)",
      display: "flex", flexDirection: "column", gap: 1,
    }}>
      {/* Activar */}
      <label className="flex items-center justify-between gap-2 px-3 py-2 text-[12px] font-semibold text-white" style={{ cursor: "pointer" }}>
        Activar carrusel
        <input
          type="checkbox"
          checked={carruselMode.enabled}
          onChange={toggleEnabled}
          style={{ width: 16, height: 16 }}
        />
      </label>

      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 8px" }} />

      {/* Secciones */}
      {CARRUSEL_SECTIONS.map((section) => (
        <label
          key={section.key}
          className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-white"
          style={{ cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={carruselMode.sections.includes(section.key)}
            onChange={() => toggleSection(section.key)}
            style={{ width: 15, height: 15, flexShrink: 0 }}
          />
          {section.label}
        </label>
      ))}

      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 8px" }} />

      {/* Duración global */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="text-[12px] font-semibold text-white">Duración por sección</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="number"
            min={1}
            value={carruselMode.durationSeconds}
            onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || DEFAULT_DURATION))}
            className="column-settings-input"
            style={{ width: 56 }}
          />
          <span className="text-[11px] text-white/40 font-semibold">seg</span>
        </div>
      </div>

      <button
        className="text-[11px] font-bold text-white/50 hover:text-white transition-colors"
        style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 12px 2px", textAlign: "right" }}
        onClick={onClose}
      >
        Cerrar
      </button>
    </div>
  );
}
