import type { TypedSupabaseClient } from "@intelligencebiz/database";
import type { ConnectionStatusEvent } from "@intelligencebiz/channel-core";

export class ConnectionRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async updateStatus(event: ConnectionStatusEvent): Promise<void> {
    const { error } = await this.supabase
      .from("whatsapp_connections")
      .update({
        status: event.status,
        ...(event.status === "connected" ? { last_connected_at: new Date().toISOString() } : {}),
        last_disconnect_reason: event.reason ?? null,
        session_updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", event.tenantId);

    if (error) throw error;
  }
}
