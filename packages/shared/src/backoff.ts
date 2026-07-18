export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface BackoffOptions {
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
}

/**
 * Exponential backoff with a cap, e.g. for Baileys reconnect attempts:
 * `nextBackoffDelay(attempt)` for attempt = 0, 1, 2, ... yields
 * 1s, 2s, 4s, 8s, ... capped at maxDelayMs.
 */
export function nextBackoffDelay(attempt: number, options: BackoffOptions = {}): number {
  const { initialDelayMs = 1000, maxDelayMs = 60_000, factor = 2 } = options;
  const delay = initialDelayMs * factor ** attempt;
  return Math.min(delay, maxDelayMs);
}
