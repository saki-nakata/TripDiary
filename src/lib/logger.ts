import pino from "pino";

const globalForLogger = globalThis as unknown as { logger?: pino.Logger };

export const logger =
  globalForLogger.logger ??
  pino({
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
        : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForLogger.logger = logger;
