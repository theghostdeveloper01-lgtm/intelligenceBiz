import { Redis } from "ioredis";

export function createRedisConnection(url: string): Redis {
  // Required by BullMQ: https://docs.bullmq.io/guide/going-to-production#maxretriesperrequest
  return new Redis(url, { maxRetriesPerRequest: null });
}
