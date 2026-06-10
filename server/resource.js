import http from "node:http";
import { env, oktaUrls } from "./lib/env.js";
import { createLogger } from "./lib/logger.js";
import { verifyJwt } from "./lib/jwks.js";

const logger = createLogger("resource");

// The "protected resource". In a real system this would be a database query
// scoped to the authenticated user; here it's a hard-coded directory so the
// /api/xaa flow has something concrete to display.
const TEAM_DIRECTORY = [
  { name: "Alice Anderson", title: "Identity Engineer", email: "alice@acme.test" },
  { name: "Bob Brown", title: "Security Architect", email: "bob@acme.test" },
  { name: "Carol Chen", title: "Platform Lead", email: "carol@acme.test" },
  { name: "Dave Davis", title: "Backend Engineer", email: "dave@acme.test" },
  { name: "Eve Edwards", title: "AI Agent Developer", email: "eve@acme.test" },
  { name: "Frank Foster", title: "Product Manager", email: "frank@acme.test" },
];

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
    const { payload } = await verifyJwt(m[1], {
      jwksUrl: oktaUrls.customAsKeys,
      expectedIssuer: oktaUrls.customAsIssuer,
    });
    logger.info({ sub: payload.sub, scp: payload.scp }, "request verified");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify(
        {
          ok: true,
          requestedBy: {
            sub: payload.sub,
            scope: payload.scp ?? null,
          },
          team: TEAM_DIRECTORY,
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
