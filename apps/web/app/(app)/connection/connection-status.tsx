"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { Tables } from "@intelligencebiz/database";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Connection = Tables<"whatsapp_connections">;

const STATUS_DOT: Record<string, string> = {
  connected: "bg-emerald-500",
  connecting: "bg-amber-500",
  pending_qr: "bg-amber-500",
  disconnected: "bg-red-500",
  logged_out: "bg-red-500",
};

export function ConnectionStatus({ initial }: { initial: Connection | null }) {
  const [connection, setConnection] = useState<Connection | null>(initial);
  const [qrImage, setQrImage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel("whatsapp-connection-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_connections" },
        (payload) => {
          setConnection(payload.new as Connection);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!connection?.qr_data) {
      setQrImage(null);
      return;
    }
    // Rendered client-side into a data URL — the pairing payload never
    // leaves the browser or touches a third-party service.
    let cancelled = false;
    QRCode.toDataURL(connection.qr_data, { width: 240 }).then((dataUrl) => {
      if (!cancelled) setQrImage(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [connection?.qr_data]);

  if (!connection) {
    return (
      <p className="text-sm text-slate-500">
        No WhatsApp connection set up yet for this tenant.
      </p>
    );
  }

  return (
    <div className="max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[connection.status] ?? "bg-slate-400"}`} />
        <span className="text-sm font-medium capitalize text-slate-900">
          {connection.status.replace("_", " ")}
        </span>
      </div>

      {connection.phone_number && (
        <p className="text-sm text-slate-600">Number: {connection.phone_number}</p>
      )}

      {connection.status === "pending_qr" && qrImage && (
        <div>
          <p className="mb-2 text-sm text-slate-600">
            Scan this with WhatsApp &rarr; Linked Devices &rarr; Link a Device:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL, not worth next/image's remote-loader machinery */}
          <img src={qrImage} alt="WhatsApp pairing QR code" className="h-60 w-60 rounded border border-slate-200" />
        </div>
      )}

      {connection.status === "logged_out" && (
        <p className="text-sm text-amber-700">
          Session was logged out from the phone. A new QR code will appear shortly.
        </p>
      )}

      {connection.status === "disconnected" && (
        <p className="text-sm text-slate-500">Reconnecting…</p>
      )}
    </div>
  );
}
