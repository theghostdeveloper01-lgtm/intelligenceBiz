import type { Logger } from "@intelligencebiz/shared";

/**
 * Baileys requires a pino-shaped logger (level, child(), trace/debug/...).
 * Rather than pull in pino as a direct dependency, adapt our shared
 * `Logger` to that interface so log output stays consistent across the
 * worker.
 */
export interface BaileysLoggerLike {
  level: string;
  child(bindings: Record<string, unknown>): BaileysLoggerLike;
  trace(obj: unknown, msg?: string): void;
  debug(obj: unknown, msg?: string): void;
  info(obj: unknown, msg?: string): void;
  warn(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
}

export function createBaileysLogger(
  logger: Logger,
  bindings: Record<string, unknown> = {},
): BaileysLoggerLike {
  const withMeta = (obj: unknown, msg?: string): [string, Record<string, unknown>] => {
    const meta = typeof obj === "object" && obj !== null ? (obj as Record<string, unknown>) : { obj };
    return [msg ?? "", { ...bindings, ...meta }];
  };

  return {
    level: "trace",
    child: (childBindings) => createBaileysLogger(logger, { ...bindings, ...childBindings }),
    trace: (obj, msg) => logger.debug(...withMeta(obj, msg)),
    debug: (obj, msg) => logger.debug(...withMeta(obj, msg)),
    info: (obj, msg) => logger.info(...withMeta(obj, msg)),
    warn: (obj, msg) => logger.warn(...withMeta(obj, msg)),
    error: (obj, msg) => logger.error(...withMeta(obj, msg)),
  };
}
