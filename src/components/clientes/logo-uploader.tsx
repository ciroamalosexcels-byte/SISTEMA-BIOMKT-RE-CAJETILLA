"use client";

import { useRef, useState } from "react";
import { LogoOptionsModal } from "./logo-options-modal";
import { LogoCropModal } from "./logo-crop-modal";

interface Props {
  leadId: string;
  logoUrl?: string;
  onUploaded: (url: string | undefined) => void;
  size?: number;
}

export function LogoUploader({ leadId, logoUrl, onUploaded, size = 44 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [cropObjectUrl, setCropObjectUrl] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("leadId", leadId);
      formData.append("file", file);
      const res = await fetch("/api/supabase/logo-upload", { method: "POST", body: formData });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "upload failed");
      onUploaded(data.url);
    } catch (err) {
      console.error("[LogoUploader] upload falló:", err);
      alert("No se pudo subir el logo. Probá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadFile(file);
  }

  function openFilePicker() {
    setOptionsOpen(false);
    inputRef.current?.click();
  }

  async function openCrop() {
    if (!logoUrl) return;
    setOptionsOpen(false);
    setUploading(true);
    try {
      const blob = await fetch(logoUrl).then((r) => r.blob());
      setCropObjectUrl(URL.createObjectURL(blob));
    } catch {
      alert("No se pudo cargar el logo para recortar.");
    } finally {
      setUploading(false);
    }
  }

  function closeCrop() {
    if (cropObjectUrl) URL.revokeObjectURL(cropObjectUrl);
    setCropObjectUrl(null);
  }

  async function handleCropSave(blob: Blob) {
    setUploading(true);
    await uploadFile(new File([blob], "logo.png", { type: "image/png" }));
    setUploading(false);
    closeCrop();
  }

  async function handleToggleBw() {
    if (!logoUrl) return;
    setOptionsOpen(false);
    setUploading(true);
    try {
      const blob = await fetch(logoUrl).then((r) => r.blob());
      const objUrl = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("no se pudo cargar la imagen"));
        img.src = objUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas context");
      ctx.filter = "grayscale(1)";
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objUrl);
      const outBlob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!outBlob) throw new Error("no se pudo generar la imagen");
      await uploadFile(new File([outBlob], "logo.png", { type: "image/png" }));
    } catch (err) {
      console.error("[LogoUploader] blanco y negro falló:", err);
      alert("No se pudo aplicar blanco y negro. Probá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload() {
    if (!logoUrl) return;
    setOptionsOpen(false);
    try {
      const blob = await fetch(logoUrl).then((r) => r.blob());
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = "logo.png";
      a.click();
      URL.revokeObjectURL(objUrl);
    } catch {
      alert("No se pudo descargar el logo.");
    }
  }

  async function handleDelete() {
    if (!confirm("¿Borrar el logo de este cliente?")) return;
    setOptionsOpen(false);
    setUploading(true);
    try {
      const res = await fetch("/api/supabase/logo-upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) throw new Error("delete failed");
      onUploaded(undefined);
    } catch (err) {
      console.error("[LogoUploader] borrar falló:", err);
      alert("No se pudo borrar el logo. Probá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOptionsOpen(true)}
        disabled={uploading}
        title="Logo del cliente"
        style={{
          width: size, height: size, minWidth: size, borderRadius: "50%",
          overflow: "hidden", border: "none", padding: 0, cursor: uploading ? "default" : "pointer",
          background: "#e2e8f0", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: uploading ? 0.5 : 1,
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <svg width={Math.round(size * 0.45)} height={Math.round(size * 0.45)} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {optionsOpen && (
        <LogoOptionsModal
          hasLogo={!!logoUrl}
          busy={uploading}
          onClose={() => setOptionsOpen(false)}
          onChange={openFilePicker}
          onCrop={openCrop}
          onToggleBw={handleToggleBw}
          onDownload={handleDownload}
          onDelete={handleDelete}
        />
      )}

      {cropObjectUrl && (
        <LogoCropModal
          objectUrl={cropObjectUrl}
          saving={uploading}
          onCancel={closeCrop}
          onSave={handleCropSave}
        />
      )}
    </>
  );
}
