import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient();

  const [{ count: totalMessages }, { count: totalConversations }, { data: recentMessages }] =
    await Promise.all([
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase.from("conversations").select("*", { count: "exact", head: true }),
      supabase
        .from("messages")
        .select("conversation_id, direction, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

  const avgResponseSeconds = computeAverageResponseSeconds(recentMessages ?? []);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Analytics</h1>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total messages" value={String(totalMessages ?? 0)} />
        <StatCard label="Conversations" value={String(totalConversations ?? 0)} />
        <StatCard
          label="Avg. response time"
          value={avgResponseSeconds === null ? "—" : formatDuration(avgResponseSeconds)}
        />
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Response time is measured over the most recent 500 messages across all conversations.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

interface MessageTimingRow {
  conversation_id: string;
  direction: string;
  created_at: string;
}

/** Average gap between a customer message and the next reply in the same conversation. */
function computeAverageResponseSeconds(rows: MessageTimingRow[]): number | null {
  const byConversation = new Map<string, MessageTimingRow[]>();
  for (const row of rows) {
    const list = byConversation.get(row.conversation_id) ?? [];
    list.push(row);
    byConversation.set(row.conversation_id, list);
  }

  const responseTimes: number[] = [];
  for (const list of byConversation.values()) {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (let i = 0; i < list.length - 1; i++) {
      const current = list[i];
      const next = list[i + 1];
      if (current.direction === "inbound" && next.direction === "outbound") {
        responseTimes.push(
          (new Date(next.created_at).getTime() - new Date(current.created_at).getTime()) / 1000,
        );
      }
    }
  }

  if (responseTimes.length === 0) return null;
  return responseTimes.reduce((sum, seconds) => sum + seconds, 0) / responseTimes.length;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}
