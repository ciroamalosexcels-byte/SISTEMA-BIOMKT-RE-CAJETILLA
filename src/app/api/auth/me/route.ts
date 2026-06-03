import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(null);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    id: user.id,
    email: user.email ?? "",
    name: profile?.full_name ?? user.email?.split("@")[0] ?? "Usuario",
    avatar: profile?.avatar_url ?? null,
    role: profile?.role ?? "viewer",
  });
}
