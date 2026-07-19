import { createBrowserClient } from "@supabase/ssr";
import type { Database, TypedSupabaseClient } from "@intelligencebiz/database";

/** RLS-respecting client for Client Components (e.g. Realtime subscriptions). */
export function createBrowserSupabaseClient(): TypedSupabaseClient {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
