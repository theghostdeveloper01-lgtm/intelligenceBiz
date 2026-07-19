import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { handBackToAi, sendHumanReply } from "./actions";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, customer_phone, customer_name, status")
    .eq("id", conversationId)
    .single();

  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, direction, sender_type, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  const sendReplyAction = sendHumanReply.bind(null, conversationId);
  const handBackAction = handBackToAi.bind(null, conversationId);

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {conversation.customer_name ?? conversation.customer_phone}
          </h1>
          <p className="text-xs text-slate-500">{conversation.customer_phone}</p>
        </div>
        {conversation.status === "human_takeover" && (
          <form action={handBackAction}>
            <button
              type="submit"
              className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Hand back to AI
            </button>
          </form>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {(messages ?? []).map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {(messages ?? []).length === 0 && (
          <p className="text-sm text-slate-500">No messages yet.</p>
        )}
      </div>

      <form action={sendReplyAction} className="flex gap-2 border-t border-slate-200 pt-4">
        <input
          name="text"
          type="text"
          placeholder="Type a reply..."
          required
          autoComplete="off"
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Send
        </button>
      </form>
    </div>
  );
}

interface MessageRow {
  id: string;
  direction: string;
  sender_type: string;
  content: Record<string, unknown>;
  created_at: string;
}

function MessageBubble({ message }: { message: MessageRow }) {
  const isInbound = message.direction === "inbound";
  const text = typeof message.content.text === "string" ? message.content.text : "[unsupported message]";

  return (
    <div className={`flex ${isInbound ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-md rounded-lg px-3 py-2 text-sm ${
          isInbound ? "bg-white text-slate-900" : "bg-slate-900 text-white"
        }`}
      >
        <p className="whitespace-pre-wrap">{text}</p>
        <p className={`mt-1 text-[10px] ${isInbound ? "text-slate-400" : "text-slate-300"}`}>
          {message.sender_type.replace("_", " ")} · {new Date(message.created_at).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
