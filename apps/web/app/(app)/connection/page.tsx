import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ConnectionStatus } from "./connection-status";

export default async function ConnectionPage() {
  const supabase = await createServerSupabaseClient();

  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("*")
    .single();

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">WhatsApp Connection</h1>
      <div className="mt-4">
        <ConnectionStatus initial={connection ?? null} />
      </div>
    </div>
  );
}
