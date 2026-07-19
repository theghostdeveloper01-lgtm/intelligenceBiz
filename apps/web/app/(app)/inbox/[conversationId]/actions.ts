"use server";

import { revalidatePath } from "next/cache";
import { createOutgoingQueue } from "@intelligencebiz/queue";
import { createServiceRoleClient } from "@intelligencebiz/database";
import type { ConversationStatus } from "@intelligencebiz/database";
import { getCurrentUser } from "@/lib/tenant";
import { getRedisConnection } from "@/lib/redis";

/**
 * Sends a reply as this tenant's staff. Uses the service-role client
 * (bypasses RLS), so tenant scoping is enforced explicitly here rather
 * than by policy.
 */
export async function sendHumanReply(conversationId: string, formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  const supabase = createServiceRoleClient();

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id, tenant_id, customer_phone")
    .eq("id", conversationId)
    .eq("tenant_id", user.tenantId)
    .single();

  if (error || !conversation) throw new Error("Conversation not found");

  // A human replying takes the conversation away from the AI agent until
  // handed back explicitly.
  await supabase
    .from("conversations")
    .update({ status: "human_takeover" satisfies ConversationStatus })
    .eq("id", conversation.id);

  const queue = createOutgoingQueue(conversation.tenant_id, getRedisConnection());
  await queue.add("send-message", {
    tenantId: conversation.tenant_id,
    to: conversation.customer_phone,
    content: { type: "text", text },
    senderType: "human_agent",
  });

  revalidatePath(`/inbox/${conversationId}`);
}

export async function handBackToAi(conversationId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const supabase = createServiceRoleClient();
  await supabase
    .from("conversations")
    .update({ status: "open" satisfies ConversationStatus })
    .eq("id", conversationId)
    .eq("tenant_id", user.tenantId);

  revalidatePath(`/inbox/${conversationId}`);
  revalidatePath("/inbox");
}
