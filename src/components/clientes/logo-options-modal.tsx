"use client";

interface Props {
  hasLogo: boolean;
  busy: boolean;
  onClose: () => void;
  onChange: () => void;
  onCrop: () => void;
  onToggleBw: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

const ITEM_BTN = "btn btn-outline btn-sm";

export function LogoOptionsModal({ hasLogo, busy, onClose, onChange, onCrop, onToggleBw, onDownload, onDelete }: Props) {
  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Logo del cliente</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          <button className={ITEM_BTN} disabled={busy} onClick={onChange}>
            {hasLogo ? "Cambiar imagen" : "Subir imagen"}
          </button>

          {hasLogo && (
            <>
              <button className={ITEM_BTN} disabled={busy} onClick={onCrop}>Recortar</button>
              <button className={ITEM_BTN} disabled={busy} onClick={onToggleBw}>Poner en blanco y negro</button>
              <button className={ITEM_BTN} disabled={busy} onClick={onDownload}>Descargar</button>
              <button className="btn btn-danger btn-sm" disabled={busy} onClick={onDelete}>Borrar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
