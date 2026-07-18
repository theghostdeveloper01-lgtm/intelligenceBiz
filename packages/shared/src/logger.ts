export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveMinLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL as LogLevel | undefined;
  return configured && configured in LEVEL_WEIGHT ? configured : "info";
}

/**
 * Structured JSON logger scoped to a namespace (e.g. "whatsapp-worker:baileys").
 * Kept dependency-free; swap for pino/winston later without touching callers
 * since everything depends on the `Logger` interface, not this implementation.
 */
export function createLogger(namespace: string): Logger {
  const minLevel = resolveMinLevel();

  const log = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[minLevel]) return;
    const line = {
      timestamp: new Date().toISOString(),
      level,
      namespace,
      message,
      ...meta,
    };
    const output = level === "error" ? console.error : console.log;
    output(JSON.stringify(line));
  };

  return {
    debug: (message, meta) => log("debug", message, meta),
    info: (message, meta) => log("info", message, meta),
    warn: (message, meta) => log("warn", message, meta),
    error: (message, meta) => log("error", message, meta),
  };
}
