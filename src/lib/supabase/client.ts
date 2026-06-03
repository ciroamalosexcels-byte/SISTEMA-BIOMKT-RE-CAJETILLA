import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

// Singleton — una sola instancia comparte el estado de auth en todo el app
let _client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (!_client) {
    _client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
