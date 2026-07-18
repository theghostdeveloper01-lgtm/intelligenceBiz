function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export interface WorkerConfig {
  workerId: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  /** Base64-encoded 32-byte key used to AES-256-GCM encrypt Baileys session state. */
  sessionEncryptionKey: string;
  redisUrl: string;
  /** Max outgoing messages per tenant per `outgoingRateWindowMs`. */
  outgoingRateLimit: number;
  outgoingRateWindowMs: number;
}

export function loadConfig(): WorkerConfig {
  return {
    workerId: process.env.WORKER_ID ?? `worker-${process.pid}`,
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    sessionEncryptionKey: requireEnv("SESSION_ENCRYPTION_KEY"),
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    outgoingRateLimit: Number(process.env.OUTGOING_RATE_LIMIT ?? 20),
    outgoingRateWindowMs: Number(process.env.OUTGOING_RATE_WINDOW_MS ?? 60_000),
  };
}
