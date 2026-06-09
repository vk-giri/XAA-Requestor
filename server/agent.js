import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./lib/env.js";
import { createLogger } from "./lib/logger.js";
import { createAuthRouter } from "./routes/auth.js";
import { createXaaRouter } from "./routes/xaa.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "../web");

const logger = createLogger("agent");
const app = express();
const httpServer = http.createServer(app);

// helmet's defaults set a strict CSP that breaks Vite's inline dev scripts.
// Disable contentSecurityPolicy in dev; keep all other defaults.
app.use(helmet({ contentSecurityPolicy: env.NODE_ENV === "production" }));
app.use(express.json());
// Attach req.log per-request for manual logs (no automatic per-request line).
app.use(pinoHttp({ logger, autoLogging: false }));
app.use(
  session({
    name: "xaa.sid",
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000,
    },
  }),
);

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/auth", createAuthRouter({ logger }));
app.use("/api", createXaaRouter({ logger }));

if (env.NODE_ENV === "production") {
  // Serve the prebuilt SPA.
  const dist = path.resolve(webRoot, "dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
} else {
  // Dev: mount Vite as middleware so the SPA + HMR live on the same port.
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    root: webRoot,
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: "spa",
  });
  app.use(vite.middlewares);
  logger.info("vite dev middleware mounted (HMR on same port)");
}

app.use((err, req, res, _next) => {
  req.log?.error({ err: err.message, stack: err.stack }, "request failed");
  if (res.headersSent) return;
  res.status(500).json({ error: "internal" });
});

httpServer.listen(env.PORT, () => {
  logger.info(`agent listening on http://localhost:${env.PORT}`);
});

function shutdown(sig) {
  logger.info(`${sig} received, closing agent`);
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
