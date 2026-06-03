import { NextResponse } from "next/server";
import { readSheetValues } from "@/lib/google-sheets/client";

// Endpoint de diagnóstico — solo disponible en desarrollo
// Eliminar antes de ir a producción
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible en producción" }, { status: 403 });
  }

  const checks: Record<string, { ok: boolean; value?: string; error?: string }> = {};

  // ── 1. Verificar env vars ────────────────────────────────────────────────────
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  checks.env_email = {
    ok: !!email,
    value: email ? `${email.slice(0, 20)}...` : undefined,
    error: email ? undefined : "GOOGLE_SERVICE_ACCOUNT_EMAIL no configurado",
  };

  checks.env_key = {
    ok: !!key && key.includes("PRIVATE KEY"),
    value: key ? `${key.slice(0, 30)}... (${key.length} chars)` : undefined,
    error: !key
      ? "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY no configurado"
      : !key.includes("PRIVATE KEY")
      ? "La clave no parece una private key válida (¿falta el header BEGIN PRIVATE KEY?)"
      : undefined,
  };

  checks.env_sheet_id = {
    ok: !!sheetId,
    value: sheetId ?? undefined,
    error: sheetId ? undefined : "GOOGLE_SHEET_ID no configurado",
  };

  const envOk = checks.env_email.ok && checks.env_key.ok && checks.env_sheet_id.ok;

  if (!envOk) {
    return NextResponse.json({
      success: false,
      message: "Faltan variables de entorno",
      checks,
    }, { status: 500 });
  }

  // ── 2. Intentar leer la hoja Leads (solo primeras 3 filas) ──────────────────
  try {
    const rows = await readSheetValues(sheetId!, "Leads!A1:E3");

    checks.sheets_connection = {
      ok: true,
      value: `Conectado — ${rows.length} filas leídas (primeras 3)`,
    };

    checks.sheet_headers = {
      ok: rows.length > 0 && rows[0].length > 0,
      value: rows[0]?.join(", ") ?? "(sin headers)",
      error: rows.length === 0 ? "La hoja está vacía o el rango no existe" : undefined,
    };

    return NextResponse.json({
      success: true,
      message: "Credenciales válidas — Google Sheets accesible",
      checks,
      preview: {
        headers: rows[0] ?? [],
        first_data_row: rows[1] ?? [],
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    checks.sheets_connection = {
      ok: false,
      error: msg.includes("PERMISSION_DENIED") || msg.includes("403")
        ? `Sin permiso: compartí la planilla con ${email}`
        : msg.includes("404") || msg.includes("not found")
        ? "Planilla no encontrada — verificar GOOGLE_SHEET_ID"
        : msg.includes("invalid_grant") || msg.includes("401")
        ? "Credenciales inválidas — verificar GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
        : msg,
    };

    return NextResponse.json({
      success: false,
      message: "Error al conectar con Google Sheets",
      checks,
    }, { status: 500 });
  }
}
