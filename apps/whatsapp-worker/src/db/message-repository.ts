import type { InsertTables, TypedSupabaseClient } from "@intelligencebiz/database";
import type { InboundMessage, MessageContent } from "@intelligencebiz/channel-core";

export class MessageRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async recordInbound(message: InboundMessage): Promise<void> {
    const conversation = await this.upsertConversation(message.tenantId, message.from);
    await this.insertMessage({
      tenant_id: message.tenantId,
      conversation_id: conversation.id,
      direction: "inbound",
      sender_type: "customer",
      content: message.content,
      external_message_id: message.externalMessageId,
      status: "delivered",
    });
  }

  async recordOutbound(params: {
    tenantId: string;
    to: string;
    content: MessageContent;
    senderType: "ai_agent" | "human_agent";
    externalMessageId: string;
  }): Promise<void> {
    const conversation = await this.upsertConversation(params.tenantId, params.to);
    await this.insertMessage({
      tenant_id: params.tenantId,
      conversation_id: conversation.id,
      direction: "outbound",
      sender_type: params.senderType,
      content: params.content,
      external_message_id: params.externalMessageId,
      status: "sent",
    });
  }

  private async upsertConversation(tenantId: string, customerPhone: string): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .from("conversations")
      .upsert(
        {
          tenant_id: tenantId,
          customer_phone: customerPhone,
          last_message_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,customer_phone" },
      )
      .select("id")
      .single();

    if (error) throw error;
    return data;
  }

  private async insertMessage(row: InsertTables<"messages">): Promise<void> {
    const { error } = await this.supabase.from("messages").insert(row);
    if (error) throw error;
  }
}
