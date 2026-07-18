import { createServiceRoleClient } from "@intelligencebiz/database";
import { createLogger } from "@intelligencebiz/shared";
import { loadConfig } from "./config.js";
import { createRedisConnection } from "./queue/redis.js";
import { SessionManager } from "./session-manager.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(`whatsapp-worker:${config.workerId}`);

  const supabase = createServiceRoleClient({
    url: config.supabaseUrl,
    serviceRoleKey: config.supabaseServiceRoleKey,
  });
  const redisConnection = createRedisConnection(config.redisUrl);

  const sessionManager = new SessionManager({
    supabase,
    redisConnection,
    encryptionKey: config.sessionEncryptionKey,
    outgoingRateLimit: config.outgoingRateLimit,
    outgoingRateWindowMs: config.outgoingRateWindowMs,
    logger,
  });

  // MVP: this process runs every Baileys connection. Splitting tenants
  // across a fleet of workers (per the architecture doc's "worker pool")
  // means filtering this query by whichever tenants were assigned to
  // this WORKER_ID — left for when there's more than one tenant to
  // actually need that.
  const { data: connections, error } = await supabase
    .from("whatsapp_connections")
    .select("tenant_id")
    .eq("connection_type", "unofficial_baileys")
    .neq("status", "logged_out");

  if (error) {
    logger.error("failed to load whatsapp connections", { err: String(error) });
    process.exit(1);
  }

  logger.info("starting sessions", { count: connections.length });
  for (const connection of connections) {
    await sessionManager.startTenant(connection.tenant_id);
  }

  const shutdown = async (signal: string) => {
    logger.info("shutting down", { signal });
    await sessionManager.stopAll();
    await redisConnection.quit();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("whatsapp-worker failed to start", err);
  process.exit(1);
});
