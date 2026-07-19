import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database, TypedSupabaseClient } from "@intelligencebiz/database";

/** RLS-respecting client scoped to the signed-in user, for use in Server Components/Actions. */
export async function createServerSupabaseClient(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component with no response to write
            // cookies to — middleware refreshes the session instead.
          }
        },
      },
    },
  );
}
