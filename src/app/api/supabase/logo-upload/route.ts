import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXT_RE = /^[a-zA-Z0-9]{1,8}$/;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const formData = await req.formData();
    const leadId = formData.get("leadId");
    const file = formData.get("file");

    if (typeof leadId !== "string" || !UUID_RE.test(leadId)) {
      return NextResponse.json({ error: "leadId inválido" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    if (!EXT_RE.test(ext)) {
      return NextResponse.json({ error: "Extensión inválida" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const admin = createAdminClient();
    const { error } = await admin.storage
      .from("client-logos")
      .upload(`${leadId}.${ext}`, buffer, { upsert: true, contentType: file.type || undefined });

    if (error) {
      console.error("[logo-upload] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data } = admin.storage.from("client-logos").getPublicUrl(`${leadId}.${ext}`);
    return NextResponse.json({ url: `${data.publicUrl}?t=${Date.now()}` });
  } catch (e) {
    console.error("[logo-upload] Exception:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
