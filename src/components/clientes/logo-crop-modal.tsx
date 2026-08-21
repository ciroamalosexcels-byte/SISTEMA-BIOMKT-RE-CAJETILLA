"use client";

import { useRef, useState } from "react";

interface Props {
  objectUrl: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}

const FRAME = 260;
const OUTPUT = 480;

export function LogoCropModal({ objectUrl, saving, onCancel, onSave }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; offX: number; offY: number } | null>(null);

  function baseScale(w: number, h: number) {
    return Math.max(FRAME / w, FRAME / h);
  }

  function clampOffset(x: number, y: number, w: number, h: number, z: number) {
    const scale = baseScale(w, h) * z;
    const halfW = (w * scale) / 2;
    const halfH = (h * scale) / 2;
    const maxX = Math.max(0, halfW - FRAME / 2);
    const maxY = Math.max(0, halfH - FRAME / 2);
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  }

  function handleImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setOffset({ x: 0, y: 0 });
    setZoom(1);
  }

  function handleZoom(z: number) {
    setZoom(z);
    if (naturalSize) {
      setOffset((o) => clampOffset(o.x, o.y, naturalSize.w, naturalSize.h, z));
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, offX: offset.x, offY: offset.y };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !naturalSize) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const next = clampOffset(dragRef.current.offX + dx, dragRef.current.offY + dy, naturalSize.w, naturalSize.h, zoom);
    setOffset(next);
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  const totalScale = naturalSize ? baseScale(naturalSize.w, naturalSize.h) * zoom : 1;
  const displayW = naturalSize ? naturalSize.w * totalScale : 0;
  const displayH = naturalSize ? naturalSize.h * totalScale : 0;
  const left = FRAME / 2 - displayW / 2 + offset.x;
  const top = FRAME / 2 - displayH / 2 + offset.y;

  function handleSave() {
    const img = imgRef.current;
    if (!img || !naturalSize) return;

    const sx = -left / totalScale;
    const sy = -top / totalScale;
    const sw = FRAME / totalScale;
    const sh = FRAME / totalScale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT, OUTPUT);
    canvas.toBlob((blob) => { if (blob) onSave(blob); }, "image/png");
  }

  return (
    <div className="modal-backdrop open" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Recortar logo</h2>
          <button className="icon-btn" onClick={onCancel}>✕</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: FRAME, height: FRAME, position: "relative", overflow: "hidden",
              borderRadius: 12, background: "#0d0d0d", cursor: "grab", touchAction: "none",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={objectUrl}
              alt=""
              onLoad={handleImgLoad}
              draggable={false}
              style={{
                position: "absolute", left, top, width: displayW, height: displayH,
                userSelect: "none", pointerEvents: "none", maxWidth: "none",
              }}
            />
            {/* Guía circular */}
            <div
              style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                pointerEvents: "none",
              }}
            />
          </div>

          <input
            type="range"
            min={1} max={3} step={0.02}
            value={zoom}
            onChange={(e) => handleZoom(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div className="modal-footer" style={{ justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-outline" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button className="btn btn-dark" onClick={handleSave} disabled={saving || !naturalSize}>
            {saving ? "Guardando…" : "Guardar recorte"}
          </button>
        </div>
      </div>
    </div>
  );
}
