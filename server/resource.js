import http from "node:http";
import { env, oktaUrls } from "./lib/env.js";
import { createLogger } from "./lib/logger.js";
import { verifyJwt } from "./lib/jwks.js";

const logger = createLogger("resource");

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }

  const auth = req.headers.authorization || "";
  const m = auth.match(/^Bearer (.+)$/);
  if (!m) {
    res.writeHead(401, {
      "www-authenticate": `Bearer realm="${oktaUrls.customAsIssuer}"`,
      "content-type": "application/json",
    });
    return res.end(JSON.stringify({ error: "missing_bearer" }));
  }

  try {
    const { header, payload } = await verifyJwt(m[1], {
      jwksUrl: oktaUrls.customAsKeys,
      expectedIssuer: oktaUrls.customAsIssuer,
    });
    logger.info({ sub: payload.sub, scp: payload.scp }, "request verified");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify(
        {
          ok: true,
          message: `Hello, ${payload.sub}`,
          path: req.url,
          method: req.method,
          tokenSummary: { iss: payload.iss, aud: payload.aud, scp: payload.scp, exp: payload.exp },
          tokenHeader: header,
          tokenPayload: payload,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    logger.warn({ err: e.message }, "token rejected");
    res.writeHead(401, {
      "www-authenticate": `Bearer error="invalid_token", error_description="${e.message}"`,
      "content-type": "application/json",
    });
    res.end(JSON.stringify({ error: "invalid_token", detail: e.message }));
  }
});

server.listen(env.RESOURCE_PORT, () => {
  logger.info(`resource-server listening on http://localhost:${env.RESOURCE_PORT}`);
  logger.info(`validating bearer JWTs against iss=${oktaUrls.customAsIssuer}`);
});

function shutdown(sig) {
  logger.info(`${sig} received, closing resource-server`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
