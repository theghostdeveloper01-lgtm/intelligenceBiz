import { createRedisConnection } from "@intelligencebiz/queue";
import type { Redis } from "ioredis";

// Module-level singleton: this app runs as a persistent Node server (not
// an edge/serverless function), so one shared connection per process is
// simpler and cheaper than opening/closing one per request.
let connection: Redis | undefined;

export function getRedisConnection(): Redis {
  connection ??= createRedisConnection(process.env.REDIS_URL ?? "redis://localhost:6379");
  return connection;
}
