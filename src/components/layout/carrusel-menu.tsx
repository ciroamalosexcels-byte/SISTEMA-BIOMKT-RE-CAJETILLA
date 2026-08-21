"use client";

import { useAppSettings } from "@/store/app-settings";
import { CARRUSEL_SECTIONS } from "@/lib/constants";

interface Props {
  onClose: () => void;
  sidebarW: number;
}

const DEFAULT_DURATION = 8;

/* Triángulo de play con esquinas redondeadas (no puntas filosas) */
function PlayIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon
        points="8,5 8,19 19,12"
        fill={color}
        stroke={color}
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SquircleCheck({ checked }: { checked: boolean }) {
  return (
    <span
      style={{
        width: 18, height: 18, borderRadius: "35%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: checked ? "#8a51eb" : "transparent",
        border: checked ? "none" : "1.5px solid rgba(255,255,255,0.28)",
        transition: "background 0.12s, border-color 0.12s",
      }}
    >
      {checked && (
        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

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
      background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14, padding: 8, width: 228,
      boxShadow: "0 18px 50px rgba(0,0,0,0.6)",
      display: "flex", flexDirection: "column", gap: 1,
      fontFamily: "var(--font-poppins), Poppins, sans-serif",
    }}>
      {/* Play / Stop */}
      <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
        <button
          type="button"
          onClick={toggleEnabled}
          title={carruselMode.enabled ? "Detener carrusel" : "Activar carrusel"}
          style={{
            width: 52, height: 52, borderRadius: "50%", border: "none", cursor: "pointer",
            background: carruselMode.enabled ? "#8a51eb" : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            transition: "background 0.15s",
          }}
        >
          <PlayIcon size={22} color={carruselMode.enabled ? "#fff" : "#0d0d0d"} />
        </button>
      </div>

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
            style={{ display: "none" }}
          />
          <SquircleCheck checked={carruselMode.sections.includes(section.key)} />
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
