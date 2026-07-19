# Deployment

Four things run this platform: Supabase, Redis, and three long-running
Node processes (`whatsapp-worker`, `api`, `web`). All three have
Dockerfiles at their app root, verified to build and run.

## What's not included here

**Supabase.** Either use a hosted project, or run the Supabase CLI's
`supabase start` for local Postgres/Auth/Storage/Realtime — don't try to
hand-roll it in `docker-compose.yml`; the CLI does a much better job than
a handful of raw containers would. Either way you need:

1. The project URL, anon key, and service-role key
2. Every file in `supabase/migrations/` applied (`supabase db push`, or
   the SQL editor if you're not using the CLI) — this includes the
   schema, RLS policies, the `whatsapp-sessions` storage bucket, and the
   signup trigger on `auth.users`
3. `SESSION_ENCRYPTION_KEY`: a base64-encoded 32-byte AES key —
   `openssl rand -base64 32` — used to encrypt Baileys session state
   before it's written to Supabase Storage. Generate it once and use the
   same value everywhere `whatsapp-worker` runs, or a restart loses the
   ability to decrypt existing sessions (that means re-scanning every
   tenant's QR code).

## Local dev

```bash
cp apps/whatsapp-worker/.env.example apps/whatsapp-worker/.env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# fill in each — at minimum SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# SESSION_ENCRYPTION_KEY, and one LLM provider key

cat > .env <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EOF

docker compose up --build
```

`web` on :3000, `api` on :3001 (only `/health` and the internal queue
consumer exist right now — nothing else to hit directly), Redis on
:6379. See the comments at the top of `docker-compose.yml` for why
`web`'s Supabase URL/key need to be in a *root* `.env` (build args,
substituted by Compose) as well as `apps/web/.env` (runtime).

## Building images directly

```bash
docker build -f apps/whatsapp-worker/Dockerfile -t intelligencebiz/whatsapp-worker .
docker build -f apps/api/Dockerfile -t intelligencebiz/api .
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  -t intelligencebiz/web .
```

All three are multi-stage builds using `turbo prune` to build only the
workspace packages each app actually depends on. Build context is the
repo root (they need the whole monorepo to prune from), not the app
directory.

`web`'s `next.config.mjs` sets `output: "standalone"` so its image ships
a pruned `node_modules`, not the full one.

## Production notes

- **`whatsapp-worker` and `api` are not serverless-compatible.**
  `whatsapp-worker` holds a persistent Baileys WebSocket per tenant plus
  BullMQ workers; `api` holds BullMQ workers too. Both need to run as
  long-lived processes (a VM, a container on a service that doesn't
  freeze/recycle idle containers, etc.) — not Lambda/Vercel Functions/
  Cloud Run-with-scale-to-zero-on-idle-connections.
- **`whatsapp-worker` only discovers new tenants two ways**: at boot
  (queries `whatsapp_connections` once) and live via the
  `whatsapp-session-control` Redis queue (what the dashboard's "Connect
  WhatsApp" / "Re-scan QR" actions publish to). If you scale to more
  than one `whatsapp-worker` replica, both currently start *any* tenant
  they see — there's no sharding/ownership yet, so running multiple
  replicas today means duplicate sessions per tenant. Keep it at one
  replica until that's built.
- **Env vars**: see each app's `.env.example`
  (`apps/whatsapp-worker/.env.example`, `apps/api/.env.example`,
  `apps/web/.env.example`) for the full list.
- A `pnpm install` warning about ignored build scripts for `sharp` /
  `msgpackr-extract` / `protobufjs` is expected (pnpm blocks postinstall
  scripts by default) and harmless — none of the three images failed to
  build or run because of it. If something related does break at
  runtime, `pnpm approve-builds` and commit the resulting `.npmrc`
  allowlist.
