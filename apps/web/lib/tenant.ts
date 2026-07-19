import { createServerSupabaseClient } from "./supabase/server";
import type { UserRole } from "@intelligencebiz/database";

export interface CurrentUser {
  id: string;
  tenantId: string;
  role: UserRole;
  email: string;
}

/** Resolves the signed-in user's tenant membership. Null when unauthenticated. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, tenant_id, role, email")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  return { id: data.id, tenantId: data.tenant_id, role: data.role, email: data.email };
}
