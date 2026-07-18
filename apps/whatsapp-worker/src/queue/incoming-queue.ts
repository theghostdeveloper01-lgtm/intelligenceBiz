import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import type { InboundMessage } from "@intelligencebiz/channel-core";

export const INCOMING_QUEUE_NAME = "whatsapp-incoming";

/**
 * Producer-only here: the worker's job ends at "customer message received
 * and persisted." Generating the AI reply is packages/ai-engine's job,
 * consumed from this queue by apps/api in a later pass.
 */
export function createIncomingQueue(connection: Redis): Queue<InboundMessage> {
  return new Queue<InboundMessage>(INCOMING_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  });
}
