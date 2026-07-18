# whatsapp-worker

Runs Baileys WhatsApp connections, one per tenant, and implements
`@intelligencebiz/channel-core`'s `Channel` interface so the rest of the
platform never touches Baileys directly.

## What's here

- `src/baileys/baileys-channel.ts` — `BaileysChannel implements Channel`.
  Handles QR pairing, auto-reconnect with backoff, and logout detection.
- `src/session/` — encrypted auth-state persistence. Baileys' creds/keys
  are serialized, AES-256-GCM encrypted, and stored as a single object in
  the Supabase Storage `whatsapp-sessions` bucket (never on local disk),
  so the process can restart without re-scanning the QR code.
- `src/queue/` — BullMQ. One outgoing queue per tenant (rate-limited, so a
  disconnect doesn't drop replies and sends don't risk a WhatsApp ban) and
  one shared incoming queue that a future `ai-engine` consumer drains.
- `src/db/` — persists connection status and conversations/messages to
  Supabase via `@intelligencebiz/database`.
- `src/session-manager.ts` — wires a tenant's channel, repositories, and
  queues together; `startTenant`/`stopTenant` are the unit apps/api will
  eventually call to assign a tenant to this worker process.

## Running

Copy `.env.example` to `.env` and fill in Supabase + Redis config, then:

```bash
pnpm --filter @intelligencebiz/whatsapp-worker build
pnpm --filter @intelligencebiz/whatsapp-worker start
```

On boot it starts a session for every tenant with a non-logged-out
`whatsapp_connections` row. Splitting tenants across multiple worker
processes (the "worker pool" from the architecture doc) means filtering
that query — not yet needed until there's more than a handful of tenants.
