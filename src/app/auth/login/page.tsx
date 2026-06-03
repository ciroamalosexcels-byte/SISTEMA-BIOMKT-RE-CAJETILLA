"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060e1c]">
      <div
        className="flex flex-col items-center gap-8 p-10 rounded-2xl"
        style={{
          background: "#07152f",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          minWidth: 340,
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 44 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
            <rect x="1" y="1" width="9" height="38" rx="4" fill="#f6bf26" />
            <path
              fillRule="evenodd" clipRule="evenodd"
              d="M26 2C17.163 2 10 9.163 10 18C10 26.837 17.163 34 26 34C34.837 34 42 26.837 42 18C42 9.163 34.837 2 26 2ZM26 10C30.418 10 34 13.582 34 18C34 22.418 30.418 26 26 26C21.582 26 18 22.418 18 18C18 13.582 21.582 10 26 10Z"
              fill="#f6bf26"
            />
          </svg>
          <div className="text-center">
            <p className="text-[11px] font-black text-white tracking-[0.1em] uppercase">
              SISTEMA BIOMARKETING
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">Ingresá con tu cuenta de Google</p>
          </div>
        </div>

        {/* Botón Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex items-center gap-3 px-6 py-3 rounded-xl text-[13px] font-semibold text-white transition-all w-full justify-center"
          style={{
            background: loading ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {loading ? "Redirigiendo…" : "Continuar con Google"}
        </button>

        {error && (
          <p className="text-[12px] text-red-400 text-center">{error}</p>
        )}

        <p className="text-[10px] text-white/20 text-center">
          Solo acceden colaboradores autorizados
        </p>
      </div>
    </div>
  );
}
