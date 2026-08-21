"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  leadId: string;
  logoUrl?: string;
  onUploaded: (url: string) => void;
  size?: number;
}

export function LogoUploader({ leadId, logoUrl, onUploaded, size = 44 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("client-logos")
        .upload(`${leadId}.${ext}`, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("client-logos").getPublicUrl(`${leadId}.${ext}`);
      onUploaded(`${data.publicUrl}?t=${Date.now()}`);
    } catch (err) {
      console.error("[LogoUploader] upload falló:", err);
      alert("No se pudo subir el logo. Probá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      title="Subir logo del cliente"
      style={{
        width: size, height: size, minWidth: size, borderRadius: "50%",
        overflow: "hidden", border: "none", padding: 0, cursor: "pointer",
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
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />
    </button>
  );
}
