"use client";

import { useAppSettings } from "@/store/app-settings";
import { TABS } from "@/lib/constants";

interface Props {
  onClose: () => void;
}

const DEFAULT_DURATION = 15;

export function ViewModeModal({ onClose }: Props) {
  const viewMode = useAppSettings((s) => s.settings.viewMode);
  const update = useAppSettings((s) => s.update);

  function toggleEnabled() {
    update({ viewMode: { ...viewMode, enabled: !viewMode.enabled } });
  }

  function toggleTab(key: string) {
    const tabs = viewMode.tabs.includes(key)
      ? viewMode.tabs.filter((k) => k !== key)
      : [...viewMode.tabs, key];
    update({ viewMode: { ...viewMode, tabs } });
  }

  function setDuration(key: string, seconds: number) {
    update({
      viewMode: {
        ...viewMode,
        durations: { ...viewMode.durations, [key]: seconds },
      },
    });
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Modo Vista</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", maxHeight: "65vh" }}>
          <label
            className="flex items-center justify-between gap-3"
            style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}
          >
            Activar modo vista
            <input
              type="checkbox"
              checked={viewMode.enabled}
              onChange={toggleEnabled}
              style={{ width: 18, height: 18 }}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {TABS.map((tab) => {
              const included = viewMode.tabs.includes(tab.key);
              return (
                <div
                  key={tab.key}
                  className="flex items-center justify-between gap-3"
                  style={{ padding: "4px 0" }}
                >
                  <label
                    className="flex items-center gap-2"
                    style={{ fontSize: 12, fontWeight: 600, flex: 1 }}
                  >
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={() => toggleTab(tab.key)}
                    />
                    {tab.label}
                  </label>
                  <input
                    type="number"
                    min={1}
                    disabled={!included}
                    value={viewMode.durations[tab.key] ?? DEFAULT_DURATION}
                    onChange={(e) =>
                      setDuration(tab.key, Math.max(1, parseInt(e.target.value) || DEFAULT_DURATION))
                    }
                    className="column-settings-input"
                    style={{ width: 64, opacity: included ? 1 : 0.4 }}
                  />
                  <span style={{ fontSize: 11, opacity: 0.6 }}>seg</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-dark" onClick={onClose}>Listo</button>
        </div>
      </div>
    </div>
  );
}
