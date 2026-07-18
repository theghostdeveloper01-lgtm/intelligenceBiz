import { Queue, Worker, type Job } from "bullmq";
import type { Redis } from "ioredis";
import type { MessageContent, SendMessageResult } from "@intelligencebiz/channel-core";
import type { Logger } from "@intelligencebiz/shared";

export interface OutgoingJobData {
  tenantId: string;
  to: string;
  content: MessageContent;
  senderType: "ai_agent" | "human_agent";
}

function queueName(tenantId: string): string {
  return `whatsapp-outgoing:${tenantId}`;
}

/**
 * One queue per tenant so BullMQ's worker-level rate limiter enforces a
 * per-number send rate (reduces ban risk) and a disconnected tenant's
 * backlog never blocks another tenant's messages.
 */
export function createOutgoingQueue(tenantId: string, connection: Redis): Queue<OutgoingJobData> {
  return new Queue<OutgoingJobData>(queueName(tenantId), {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  });
}

export function createOutgoingWorker(
  tenantId: string,
  connection: Redis,
  options: {
    rateLimit: number;
    rateWindowMs: number;
    logger: Logger;
    sendMessage: (job: OutgoingJobData) => Promise<SendMessageResult>;
    onSent: (job: OutgoingJobData, result: SendMessageResult) => Promise<void>;
  },
): Worker<OutgoingJobData> {
  const worker = new Worker<OutgoingJobData>(
    queueName(tenantId),
    async (job: Job<OutgoingJobData>) => {
      const result = await options.sendMessage(job.data);
      await options.onSent(job.data, result);
      return result;
    },
    {
      connection,
      limiter: { max: options.rateLimit, duration: options.rateWindowMs },
    },
  );

  worker.on("failed", (job, err) => {
    options.logger.error("outgoing message job failed", {
      tenantId,
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
      err: String(err),
    });
  });

  return worker;
}
