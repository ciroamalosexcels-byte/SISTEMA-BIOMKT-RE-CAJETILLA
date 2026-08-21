"use client";

import { useRef, useState } from "react";

interface Props {
  objectUrl: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}

const PREVIEW = 200;
const FILTER_ID = "logo-bw-shadows";

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 700, display: "flex", flexDirection: "column", gap: 4, color: "var(--slate-700)" }}>
      {label}
      <input
        type="range"
        min={-50}
        max={50}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
      />
    </label>
  );
}

export function LogoBwModal({ objectUrl, saving, onCancel, onSave }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [contrast, setContrast] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [shadows, setShadows] = useState(0);

  const contrastFactor = 1 + contrast / 100;
  const brightnessFactor = 1 + brightness / 100;
  const gamma = 1 - shadows / 100;

  const cssFilter = `grayscale(1) url(#${FILTER_ID}) contrast(${contrastFactor}) brightness(${brightnessFactor})`;

  function handleSave() {
    const img = imgRef.current;
    if (!img || !imgLoaded) return;

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      let lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      lum = 255 * Math.pow(lum / 255, gamma);
      lum = (lum - 128) * contrastFactor + 128;
      lum = lum * brightnessFactor;
      lum = Math.min(255, Math.max(0, lum));
      d[i] = d[i + 1] = d[i + 2] = lum;
    }
    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob((blob) => { if (blob) onSave(blob); }, "image/png");
  }

  return (
    <div className="modal-backdrop open" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Blanco y negro</h2>
          <button className="icon-btn" onClick={onCancel}>✕</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          {/* Filtro SVG para el ajuste de sombras (gamma) — se referencia desde el CSS filter del preview */}
          <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
            <defs>
              <filter id={FILTER_ID}>
                <feComponentTransfer>
                  <feFuncR type="gamma" amplitude={1} exponent={gamma} offset={0} />
                  <feFuncG type="gamma" amplitude={1} exponent={gamma} offset={0} />
                  <feFuncB type="gamma" amplitude={1} exponent={gamma} offset={0} />
                </feComponentTransfer>
              </filter>
            </defs>
          </svg>

          <div style={{ width: PREVIEW, height: PREVIEW, borderRadius: "50%", overflow: "hidden", background: "#0d0d0d", flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={objectUrl}
              alt=""
              onLoad={() => setImgLoaded(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: cssFilter }}
            />
          </div>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <Slider label="Contraste" value={contrast} onChange={setContrast} />
            <Slider label="Luz" value={brightness} onChange={setBrightness} />
            <Slider label="Sombras" value={shadows} onChange={setShadows} />
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button className="btn btn-dark" onClick={handleSave} disabled={saving || !imgLoaded}>
            {saving ? "Guardando…" : "Aplicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
