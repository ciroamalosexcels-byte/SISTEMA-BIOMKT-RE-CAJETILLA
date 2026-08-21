"use client";

interface Props {
  logoUrl?: string;
  busy: boolean;
  onClose: () => void;
  onChange: () => void;
  onCrop: () => void;
  onAdjustBw: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export function LogoOptionsModal({ logoUrl, busy, onClose, onChange, onCrop, onAdjustBw, onDownload, onDelete }: Props) {
  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
          <span />
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <h2 className="modal-title" style={{ textAlign: "center" }}>Foto del cliente</h2>

          <div
            style={{
              width: 128, height: 128, borderRadius: "50%", overflow: "hidden",
              background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            <button className="btn btn-dark btn-sm" disabled={busy} onClick={onChange}>
              {logoUrl ? "Cambiar imagen" : "Subir imagen"}
            </button>

            {logoUrl && (
              <>
                <button className="btn btn-outline btn-sm" disabled={busy} onClick={onCrop}>Recortar</button>
                <button className="btn btn-outline btn-sm" disabled={busy} onClick={onAdjustBw}>Blanco y negro</button>
                <button className="btn btn-outline btn-sm" disabled={busy} onClick={onDownload}>Descargar</button>
                <button className="btn btn-danger btn-sm" disabled={busy} onClick={onDelete}>Borrar</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
