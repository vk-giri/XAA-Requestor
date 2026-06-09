import pino from "pino";
import { env } from "./env.js";

const isDev = env.NODE_ENV !== "production";

export function createLogger(name) {
  return pino({
    name,
    level: isDev ? "debug" : "info",
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers['set-cookie']",
        "*.access_token",
        "*.id_token",
        "*.refresh_token",
        "*.client_secret",
        "*.client_assertion",
      ],
      censor: "[REDACTED]",
    },
    transport: isDev
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss.l", ignore: "pid,hostname" },
        }
      : undefined,
  });
}
