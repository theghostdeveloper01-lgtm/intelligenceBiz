import type { TypedSupabaseClient } from "@intelligencebiz/database";
import type { ConnectionStatusEvent } from "@intelligencebiz/channel-core";

export class ConnectionRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async updateStatus(event: ConnectionStatusEvent): Promise<void> {
    // QR is only meaningful while pending_qr; clear it on every other
    // transition so a stale/expired code never lingers in the dashboard.
    const qrFields =
      event.status === "pending_qr" && event.qr
        ? { qr_data: event.qr.data, qr_expires_at: event.qr.expiresAt.toISOString() }
        : { qr_data: null, qr_expires_at: null };

    const { error } = await this.supabase
      .from("whatsapp_connections")
      .update({
        status: event.status,
        ...(event.status === "connected" ? { last_connected_at: new Date().toISOString() } : {}),
        last_disconnect_reason: event.reason ?? null,
        session_updated_at: new Date().toISOString(),
        ...qrFields,
      })
      .eq("tenant_id", event.tenantId);

    if (error) throw error;
  }
}
