import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Backend-only client that bypasses RLS via the service-role key. Use in
 * apps/api and apps/whatsapp-worker, never in code shipped to the browser.
 * Tenant isolation for this client must be enforced in application code
 * (always filter/write by tenant_id), since RLS is not in effect.
 */
export function createServiceRoleClient(config?: {
  url?: string;
  serviceRoleKey?: string;
}): TypedSupabaseClient {
  const url = config?.url ?? process.env.SUPABASE_URL;
  const serviceRoleKey =
    config?.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to create a service-role client",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * User-scoped client that runs with the caller's JWT, so Postgres RLS
 * policies (see current_tenant_id() in the users migration) apply. Use
 * this wherever a request is acting on behalf of a specific logged-in
 * user, e.g. the Next.js dashboard.
 */
export function createUserClient(
  accessToken: string,
  config?: { url?: string; anonKey?: string },
): TypedSupabaseClient {
  const url = config?.url ?? process.env.SUPABASE_URL;
  const anonKey = config?.anonKey ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY must be set to create a user-scoped client",
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
