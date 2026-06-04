import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/** Cliente admin que bypasea RLS — solo usar en API routes server-side */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
