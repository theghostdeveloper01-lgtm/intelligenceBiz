import type { TypedSupabaseClient } from "@intelligencebiz/database";

const BUCKET = "whatsapp-sessions";

function objectPath(tenantId: string): string {
  return `${tenantId}/creds.enc`;
}

/** Persists opaque (already-encrypted) session blobs to Supabase Storage. */
export interface SessionStore {
  read(tenantId: string): Promise<string | null>;
  write(tenantId: string, encryptedPayload: string): Promise<void>;
  remove(tenantId: string): Promise<void>;
}

export class SupabaseSessionStore implements SessionStore {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async read(tenantId: string): Promise<string | null> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .download(objectPath(tenantId));

    if (error) {
      if ("statusCode" in error && String(error.statusCode) === "404") return null;
      throw error;
    }

    return data.text();
  }

  async write(tenantId: string, encryptedPayload: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(objectPath(tenantId), encryptedPayload, {
        contentType: "text/plain",
        upsert: true,
      });
    if (error) throw error;
  }

  async remove(tenantId: string): Promise<void> {
    const { error } = await this.supabase.storage.from(BUCKET).remove([objectPath(tenantId)]);
    if (error) throw error;
  }
}
