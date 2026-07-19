import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700",
  human_takeover: "bg-amber-100 text-amber-700",
  closed: "bg-slate-100 text-slate-500",
};

export default async function InboxPage() {
  const supabase = await createServerSupabaseClient();

  // RLS scopes this to the signed-in user's tenant — no explicit tenant_id filter needed.
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, customer_phone, customer_name, status, last_message_at")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Inbox</h1>

      <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {(conversations ?? []).map((conversation) => (
          <Link
            key={conversation.id}
            href={`/inbox/${conversation.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {conversation.customer_name ?? conversation.customer_phone}
              </p>
              <p className="text-xs text-slate-500">{conversation.customer_phone}</p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                STATUS_STYLES[conversation.status] ?? STATUS_STYLES.closed
              }`}
            >
              {conversation.status.replace("_", " ")}
            </span>
          </Link>
        ))}

        {(conversations ?? []).length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-500">No conversations yet.</p>
        )}
      </div>
    </div>
  );
}
